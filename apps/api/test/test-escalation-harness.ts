import assert from 'node:assert/strict';
import { escalateTaskFindings, type EscalationGuardianTools, type EscalationTaskView } from '../src/agents/escalation/escalation.service.js';

class MockGuardianTools implements EscalationGuardianTools {
  created: Array<{ repoId: string; title: string; body: string; labels: string[] }> = [];
  existingTitles: string[];

  constructor(existingTitles: string[] = []) {
    this.existingTitles = existingTitles;
  }

  list_issues = {
    execute: async () => ({
      issues: this.existingTitles.map((title, i) => ({ number: i + 1, title, labels: [] })),
    }),
  };

  create_issue = {
    execute: async (args: any) => {
      this.created.push(args);
      return {
        success: true,
        issueNumber: 100 + this.created.length,
        htmlUrl: `https://github.test/acme/widget/issues/${100 + this.created.length}`,
      };
    },
  };
}

const baseTasks: EscalationTaskView[] = [
  {
    agentId: 'security',
    findings: [
      {
        severity: 'CRITICAL',
        category: 'AUTH_BYPASS',
        title: 'Unsigned role cookie grants admin',
        description: 'Forged cookie returned admin access.',
        file: 'src/auth/session.ts',
        line: 42,
        rawEvidence: 'curl /admin with role=admin returned 200',
        suggestedFix: 'Resolve role from server-side session only.',
      },
      {
        severity: 'HIGH',
        title: 'Already fixed secret literal',
        description: 'Secret literal was removed by auto-fix.',
        file: 'src/config.ts',
      },
      {
        severity: 'HIGH',
        title: 'Dismissed finding',
        description: 'Team dismissed this.',
        dismissed: true,
        file: 'src/legacy.ts',
      },
      {
        severity: 'MEDIUM',
        title: 'Medium finding is not escalated',
        description: 'Should remain in report only.',
        file: 'src/medium.ts',
      },
    ],
    reportMeta: {
      autoFixPR: {
        opened: true,
        appliedFixes: [{ filePath: 'src/config.ts' }],
      },
    },
  },
];

async function main() {
  {
    const tools = new MockGuardianTools();
    const result = await escalateTaskFindings({ guardianTools: tools, repoId: 'repo-1', runId: 55, tasks: baseTasks });

    assert.equal(result.escalated.length, 1);
    assert.equal(result.skipped.length, 0);
    assert.equal(result.escalated[0].issueNumber, 101);
    assert.equal(tools.created.length, 1);
    assert.deepEqual(tools.created[0].labels, ['codeward', 'critical']);
    assert.equal(tools.created[0].title, '[Codeward] CRITICAL: Unsigned role cookie grants admin');
    assert.ok(tools.created[0].body.includes('## Codeward Escalation - CRITICAL'));
    assert.ok(tools.created[0].body.includes('| Agent | security |'));
    assert.ok(tools.created[0].body.includes('| Location | `src/auth/session.ts:42` |'));
    assert.ok(tools.created[0].body.includes('### Why Codeward did not auto-fix'));
    assert.ok(tools.created[0].body.includes('curl /admin with role=admin returned 200'));
    assert.ok(tools.created[0].body.includes('| Run | #55 |'));
  }

  {
    const tools = new MockGuardianTools(['[Codeward] CRITICAL: Unsigned role cookie grants admin']);
    const result = await escalateTaskFindings({ guardianTools: tools, repoId: 'repo-1', runId: 55, tasks: baseTasks });

    assert.equal(result.escalated.length, 0);
    assert.equal(tools.created.length, 0);
    assert.deepEqual(result.skipped, [{
      title: '[Codeward] CRITICAL: Unsigned role cookie grants admin',
      issueNumber: 1,
      reason: 'An open issue with this exact title already exists — not creating a duplicate.',
    }]);
  }

  {
    const many: EscalationTaskView[] = [{
      agentId: 'security',
      findings: Array.from({ length: 7 }, (_, i) => ({
        severity: 'HIGH',
        title: `High finding ${i + 1}`,
        description: `Description ${i + 1}`,
        file: `src/${i + 1}.ts`,
      })),
    }];
    const tools = new MockGuardianTools();
    const result = await escalateTaskFindings({ guardianTools: tools, repoId: 'repo-1', runId: 56, tasks: many });

    assert.equal(result.escalated.length, 5);
    assert.equal(tools.created.length, 5);
    assert.equal(result.skipped.length, 2);
    assert.equal(result.skipped[0].reason, 'Capped at 5 issues per run.');
  }

  {
    const tools: EscalationGuardianTools = {
      list_issues: { execute: async () => ({ error: 'GitHub unavailable' }) },
      create_issue: { execute: async () => { throw new Error('should not create when duplicate check fails'); } },
    };
    const result = await escalateTaskFindings({ guardianTools: tools, repoId: 'repo-1', runId: 57, tasks: baseTasks });
    assert.equal(result.escalated.length, 0);
    assert.equal(result.skipped[0].reason, 'Could not check for duplicate issues: GitHub unavailable');
  }

  console.log('PASS: Escalation harness verified unresolved filtering, duplicate suppression, caps, and issue body contract.');
}

main().catch((e) => {
  console.error('FAIL: Escalation harness failed.');
  console.error(e);
  process.exit(1);
});
