import assert from 'node:assert/strict';
import {
  computeFindingFingerprint,
  escalateTaskFindings,
  type EscalationGuardianTools,
  type EscalationTaskView,
} from '../src/agents/escalation/escalation.service.js';
import {
  renderGuardianIssueBody,
  type EscalationReason,
  ESCALATION_REASON_DESCRIPTIONS,
} from '../src/agents/guardian/github-renderer.js';

class MockFullGuardianTools implements EscalationGuardianTools {
  createdIssues: Array<{ repoId: string; title: string; body: string; labels: string[] }> = [];
  commentsAdded: Array<{ repoId: string; issueNumber: number; body: string }> = [];
  closedIssues: Array<{ repoId: string; issueNumber: number; comment?: string }> = [];
  existingIssues: Array<{ number: number; title: string; labels: string[] }> = [];

  list_issues = {
    execute: async () => ({
      issues: this.existingIssues,
    }),
  };

  create_issue = {
    execute: async (args: any) => {
      const issueNumber = 200 + this.createdIssues.length;
      this.createdIssues.push(args);
      this.existingIssues.push({
        number: issueNumber,
        title: args.title,
        labels: args.labels || [],
      });
      return {
        success: true,
        issueNumber,
        htmlUrl: `https://github.test/codeward/repo/issues/${issueNumber}`,
      };
    },
  };

  add_issue_comment = {
    execute: async (args: any) => {
      this.commentsAdded.push(args);
      return { success: true, commentId: 900 + this.commentsAdded.length };
    },
  };

  close_issue = {
    execute: async (args: any) => {
      this.closedIssues.push(args);
      this.existingIssues = this.existingIssues.filter((i) => i.number !== args.issueNumber);
      return { success: true, closed: true };
    },
  };
}

/**
 * In-memory Mock DB Client implementing the drizzle query interface used by escalation.service.ts
 */
class MockDbClient {
  rows: any[] = [];
  nextId = 1;

  select() {
    return {
      from: () => ({
        where: () => this.rows.filter((r) => r.status === 'open'),
      }),
    };
  }

  insert() {
    return {
      values: (val: any) => {
        const record = { id: this.nextId++, ...val };
        this.rows.push(record);
        return {
          returning: () => [record],
        };
      },
    };
  }

  update() {
    return {
      set: (updateVals: any) => ({
        where: () => {
          // Update matching rows
          for (const row of this.rows) {
            Object.assign(row, updateVals);
          }
          return Promise.resolve();
        },
      }),
    };
  }

  delete() {
    return {
      where: () => Promise.resolve(),
    };
  }
}

async function testFingerprintCalculation() {
  console.log('[TEST] 1. Verifying deterministic finding fingerprints...');

  const fp1 = computeFindingFingerprint('10', 'AUTH_BYPASS', ['src/auth/session.ts']);
  const fp2 = computeFindingFingerprint('10', 'AUTH_BYPASS', ['src/auth/session.ts']);
  assert.equal(fp1, fp2, 'Fingerprints for identical findings must match exactly');

  // Case & whitespace normalization
  const fpCase = computeFindingFingerprint('10', 'auth_bypass ', [' SRC/AUTH/SESSION.TS ']);
  assert.equal(fp1, fpCase, 'Fingerprint must be case and whitespace insensitive');

  // File sorting invariance
  const fpMulti1 = computeFindingFingerprint('10', 'LEAK', ['b.ts', 'a.ts']);
  const fpMulti2 = computeFindingFingerprint('10', 'LEAK', ['a.ts', 'b.ts']);
  assert.equal(fpMulti1, fpMulti2, 'Fingerprint must be order-invariant on files');

  // Different findings have distinct fingerprints
  const fpDiff = computeFindingFingerprint('10', 'SQL_INJECTION', ['src/db.ts']);
  assert.notEqual(fp1, fpDiff, 'Different categories/files must yield different fingerprints');

  console.log('  ✅ Fingerprint calculation is deterministic, order-invariant, and case-normalized.');
}

async function testEscalationReasonRendering() {
  console.log('[TEST] 2. Verifying escalation reason descriptions and issue body rendering...');

  const testReasons: EscalationReason[] = [
    'AUTO_FIX_VERIFICATION_FAILED',
    'AUTO_FIX_CONFIDENCE_TOO_LOW',
    'SEVERITY_REQUIRES_MANUAL_REVIEW',
    'AUTOFIX_DISABLED_FOR_REPO',
    'GUARDIAN_REJECTED',
    'NOT_ELIGIBLE',
  ];

  for (const reason of testReasons) {
    const descFn = ESCALATION_REASON_DESCRIPTIONS[reason];
    assert.ok(typeof descFn === 'function', `Missing description function for reason ${reason}`);
    const desc = descFn('Custom reason detail for testing');
    assert.ok(desc && desc.length > 10, `Description string too short for reason ${reason}`);

    const rendered = renderGuardianIssueBody({
      runId: 101,
      reason,
      reasonDetail: 'Custom reason detail for testing',
      finding: {
        agentId: 'security',
        severity: 'CRITICAL',
        title: 'Hardcoded API Key',
        description: 'Found OpenAI key in code',
        file: 'src/api.ts',
        line: 12,
      },
    });

    assert.ok(rendered.includes('### Why Codeward did not auto-fix'));
    assert.ok(rendered.includes(desc), `Rendered issue body must include reason description: ${desc}`);
    assert.ok(rendered.includes('Custom reason detail for testing'), 'Rendered issue body must include reasonDetail');
  }

  console.log('  ✅ Escalation reasons render human-readable explanations correctly.');
}

async function testEscalationFlowIdempotency() {
  console.log('[TEST] 3. Verifying end-to-end escalation idempotency & auto-closing...');

  const tools = new MockFullGuardianTools();
  const mockDb = new MockDbClient();
  const repoId = '42';

  const taskPayload: EscalationTaskView[] = [
    {
      agentId: 'security',
      findings: [
        {
          severity: 'CRITICAL',
          category: 'HARDCODED_SECRET',
          title: 'Exposed JWT secret in auth module',
          description: 'JWT secret key is committed to source control.',
          file: 'src/auth/jwt.ts',
          line: 15,
          rawEvidence: 'const SECRET = "supersecret123";',
          suggestedFix: 'Load secret from environment variable.',
          escalationReason: 'AUTO_FIX_VERIFICATION_FAILED',
          escalationDetail: 'Tests failed after replacing secret.',
        },
      ],
    },
  ];

  // -------------------------------------------------------------
  // Step A: First Run (Run 101) - Initial Failure -> Creates Issue
  // -------------------------------------------------------------
  console.log('  -> Step A: First run with new finding...');
  const run1Result = await escalateTaskFindings({
    guardianTools: tools,
    repoId,
    runId: 101,
    tasks: taskPayload,
    dbClient: mockDb,
  });

  assert.equal(run1Result.escalated.length, 1, 'Run 1 should escalate 1 finding');
  assert.equal(tools.createdIssues.length, 1, 'Should call create_issue once');
  const createdIssueNum = run1Result.escalated[0].issueNumber;
  assert.equal(createdIssueNum, 200);
  assert.equal(mockDb.rows.length, 1, 'Should record in database table');
  assert.equal(mockDb.rows[0].status, 'open');
  assert.equal(mockDb.rows[0].githubIssueNumber, 200);

  // -------------------------------------------------------------
  // Step B: Second Run (Run 102) - Same Finding -> Comments, NO Duplicate Issue
  // -------------------------------------------------------------
  console.log('  -> Step B: Second run with identical finding (idempotency check)...');
  const run2Result = await escalateTaskFindings({
    guardianTools: tools,
    repoId,
    runId: 102,
    tasks: taskPayload,
    dbClient: mockDb,
  });

  assert.equal(run2Result.escalated.length, 0, 'Run 2 should NOT escalate a new issue');
  assert.equal(tools.createdIssues.length, 1, 'create_issue count should remain 1');
  assert.equal(run2Result.skipped.length, 1, 'Run 2 should report finding skipped');
  assert.equal(run2Result.skipped[0].issueNumber, 200);

  // Check that comment was added to the open issue
  assert.equal(tools.commentsAdded.length, 1, 'Should add comment to existing issue');
  assert.equal(tools.commentsAdded[0].issueNumber, 200);
  assert.ok(tools.commentsAdded[0].body.includes('run #102'), 'Comment must reference current run #102');

  // -------------------------------------------------------------
  // Step C: Third Run (Run 103) - Finding Fixed -> Auto-closes Issue
  // -------------------------------------------------------------
  console.log('  -> Step C: Third run with finding resolved (auto-close check)...');
  const run3Result = await escalateTaskFindings({
    guardianTools: tools,
    repoId,
    runId: 103,
    tasks: [], // No findings remaining!
    dbClient: mockDb,
  });

  assert.equal(run3Result.escalated.length, 0);
  assert.ok(run3Result.resolved && run3Result.resolved.length === 1, 'Should mark finding resolved');
  assert.equal(run3Result.resolved[0].issueNumber, 200);
  assert.equal(tools.closedIssues.length, 1, 'Should call close_issue tool');
  assert.equal(tools.closedIssues[0].issueNumber, 200);
  assert.ok(tools.closedIssues[0].comment?.includes('run #103'), 'Close comment must reference run #103');
  assert.equal(mockDb.rows[0].status, 'resolved', 'DB status should be updated to resolved');

  console.log('  ✅ Full escalation lifecycle verified: Create -> Thread Comment -> Auto-close.');
}

async function testCapDoesNotCorruptSweep() {
  console.log('[TEST] 4. Verifying MAX_ISSUES_PER_RUN cap does NOT corrupt sweep and close active findings...');

  const tools = new MockFullGuardianTools();
  const mockDb = new MockDbClient();
  const repoId = '42';

  // Seed DB with 7 active findings from run 201
  const findingsList = Array.from({ length: 7 }, (_, i) => ({
    severity: 'CRITICAL',
    category: `VULN_${i}`,
    title: `Vulnerability ${i}`,
    description: `Critical issue ${i}`,
    file: `src/mod_${i}.ts`,
    line: 10,
  }));

  const initialTasks: EscalationTaskView[] = [{
    agentId: 'security',
    findings: findingsList,
  }];

  const res1 = await escalateTaskFindings({
    guardianTools: tools,
    repoId,
    runId: 201,
    tasks: initialTasks,
    dbClient: mockDb,
  });

  assert.equal(res1.escalated.length, 5, 'Should escalate capped at 5 issues');
  assert.equal(res1.skipped.length, 2, '2 findings should be skipped due to cap');

  // Now run 202 with the SAME 7 findings still present.
  // CRITICAL CHECK: None of the 7 findings should be marked resolved or closed!
  const res2 = await escalateTaskFindings({
    guardianTools: tools,
    repoId,
    runId: 202,
    tasks: initialTasks,
    dbClient: mockDb,
  });

  assert.equal(res2.resolved?.length ?? 0, 0, 'ZERO active findings should be resolved, even if capped out of issue-creation');
  assert.equal(tools.closedIssues.length, 0, 'ZERO GitHub issues should be closed while findings remain');

  console.log('  ✅ Cap sweep integrity verified: Capped findings never falsely closed.');
}

async function testResolutionScopeProtection() {
  console.log('[TEST] 5. Verifying escalation resolution scope protection...');

  const tools = new MockFullGuardianTools();
  const mockDb = new MockDbClient();
  const repoId = '42';

  // Run 301: Compliance finding created
  await escalateTaskFindings({
    guardianTools: tools,
    repoId,
    runId: 301,
    tasks: [{
      agentId: 'compliance',
      findings: [{
        severity: 'HIGH',
        category: 'LICENSE_VIOLATION',
        title: 'GPL violation in library',
        description: 'Incompatible license detected',
        file: 'src/lib.ts',
      }],
    }],
    dbClient: mockDb,
  });

  assert.equal(tools.createdIssues.length, 1);
  assert.equal(mockDb.rows.length, 1);
  assert.equal(mockDb.rows[0].agentId, 'compliance');

  // Run 302: Only security agent runs, and finds 0 findings!
  // CRITICAL: Compliance issue MUST NOT be resolved/closed because compliance agent was not analyzed in this run!
  const res302 = await escalateTaskFindings({
    guardianTools: tools,
    repoId,
    runId: 302,
    tasks: [{
      agentId: 'security',
      findings: [],
    }],
    dbClient: mockDb,
  });

  assert.equal(res302.resolved?.length ?? 0, 0, 'Compliance finding must NOT be resolved by a security-only run');
  assert.equal(tools.closedIssues.length, 0, 'Compliance issue must remain open');
  assert.equal(mockDb.rows[0].status, 'open', 'DB status must remain open');

  // Run 303: Compliance agent runs and finds 0 findings -> Now it SHOULD resolve!
  const res303 = await escalateTaskFindings({
    guardianTools: tools,
    repoId,
    runId: 303,
    tasks: [{
      agentId: 'compliance',
      findings: [],
    }],
    dbClient: mockDb,
  });

  assert.equal(res303.resolved?.length ?? 0, 1, 'Compliance finding should now be resolved by compliance run');
  assert.equal(tools.closedIssues.length, 1, 'Compliance issue should be closed');
  assert.equal(mockDb.rows[0].status, 'resolved');

  console.log('  ✅ Resolution scope protection verified: Only analyzed agents can resolve issues.');
}

async function testCommentThrottle() {
  console.log('[TEST] 6. Verifying 24-hour comment throttle on re-opened findings...');

  const tools = new MockFullGuardianTools();
  const mockDb = new MockDbClient();
  const repoId = '42';

  const tasks: EscalationTaskView[] = [{
    agentId: 'security',
    findings: [{
      severity: 'CRITICAL',
      category: 'SQLI',
      title: 'SQL Injection in users query',
      description: 'Raw query concat',
      file: 'src/users.ts',
    }],
  }];

  // Run 401: Create issue
  await escalateTaskFindings({
    guardianTools: tools,
    repoId,
    runId: 401,
    tasks,
    dbClient: mockDb,
  });
  assert.equal(tools.createdIssues.length, 1);
  assert.equal(tools.commentsAdded.length, 0);

  // Run 402: Re-occurrence triggers initial comment
  await escalateTaskFindings({
    guardianTools: tools,
    repoId,
    runId: 402,
    tasks,
    dbClient: mockDb,
  });
  assert.equal(tools.commentsAdded.length, 1, 'First re-occurrence should add thread comment');

  // Run 403 immediately after: Throttle is active (24h) -> should NOT add another comment
  await escalateTaskFindings({
    guardianTools: tools,
    repoId,
    runId: 403,
    tasks,
    dbClient: mockDb,
  });
  assert.equal(tools.commentsAdded.length, 1, 'Comment throttle must prevent rapid comment spam');

  console.log('  ✅ 24-hour comment throttle verified: Repeated runs do not spam comments.');
}

async function main() {
  console.log('====================================================');
  console.log('Running Escalation Idempotency & Reason Test Suite');
  console.log('====================================================');

  await testFingerprintCalculation();
  await testEscalationReasonRendering();
  await testEscalationFlowIdempotency();
  await testCapDoesNotCorruptSweep();
  await testResolutionScopeProtection();
  await testCommentThrottle();

  console.log('====================================================');
  console.log('PASS: All escalation idempotency tests succeeded! 🎯');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('FAIL: Escalation idempotency test failed:', err);
  process.exit(1);
});
