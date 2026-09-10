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

async function main() {
  console.log('====================================================');
  console.log('Running Escalation Idempotency & Reason Test Suite');
  console.log('====================================================');

  await testFingerprintCalculation();
  await testEscalationReasonRendering();
  await testEscalationFlowIdempotency();

  console.log('====================================================');
  console.log('PASS: All escalation idempotency tests succeeded! 🎯');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('FAIL: Escalation idempotency test failed:', err);
  process.exit(1);
});
