import assert from 'node:assert/strict';
import {
  renderGuardianFinalReview,
  renderGuardianInlineFindingComment,
  renderGuardianIssueBody,
  renderGuardianStatusComment,
} from './agents/guardian/github-renderer.js';

function includesAll(body: string, required: string[]) {
  for (const text of required) assert.ok(body.includes(text), `expected output to include: ${text}\n\n${body}`);
}

async function main() {
  const status = renderGuardianStatusComment({
    repoFullName: 'acme/widget',
    commitSha: 'abcdef1234567890',
    estimatedDurationSeconds: 90,
  });
  assert.equal(status, [
    '## Codeward is working',
    '',
    'Analyzing `acme/widget@abcdef1` in an isolated sandbox.',
    '',
    'Estimated time: 90s.',
  ].join('\n'));

  const inline = renderGuardianInlineFindingComment({
    agentId: 'security',
    severity: 'HIGH',
    title: 'JWT accepted without audience validation',
    evidence: 'sandbox reproduced missing aud check in auth middleware',
    fixStatus: 'escalated',
    suggestedFix: 'Validate aud before accepting token claims.',
  });
  includesAll(inline, [
    '**HIGH · security**',
    'JWT accepted without audience validation',
    'Evidence: sandbox reproduced missing aud check',
    'Codeward action: escalated.',
    'Fix path: Validate aud',
  ]);

  const issue = renderGuardianIssueBody({
    runId: 412,
    autoFixReason: 'The change affects auth behavior and requires a human-owned regression test.',
    finding: {
      agentId: 'security',
      severity: 'CRITICAL',
      category: 'AUTH_BYPASS',
      title: 'Session middleware trusts unsigned role claim',
      description: 'A crafted cookie can escalate a user to admin.',
      file: 'src/auth/session.ts',
      line: 88,
      evidence: 'curl /admin with forged role=admin returned 200 in sandbox',
      suggestedFix: 'Verify role from server-side session storage.',
    },
  });
  includesAll(issue, [
    '**Agent**: security',
    '**Severity**: CRITICAL',
    '**Location**: `src/auth/session.ts:88`',
    '**Why Codeward did not auto-fix**: The change affects auth behavior',
    '_Escalated by Codeward',
  ]);

  const finalReview = renderGuardianFinalReview({
    repoFullName: 'acme/widget',
    runId: 412,
    commitSha: 'abcdef1234567890',
    gateDecision: 'BLOCK',
    summary: 'Codeward ran the PR in sandbox and found one blocking auth issue plus one safe cleanup.',
    findings: [
      {
        agentId: 'security',
        severity: 'CRITICAL',
        title: 'Session middleware trusts unsigned role claim',
        file: 'src/auth/session.ts',
        line: 88,
      },
      {
        agentId: 'bloat',
        severity: 'LOW',
        title: 'Unused helper can be removed',
        file: 'src/unused.ts',
      },
    ],
    checks: [
      { name: 'npm install', status: 'passed', summary: 'Dependencies installed without new failures' },
      { name: 'typecheck', status: 'failed', summary: '1 new TypeScript error after candidate fix' },
    ],
    autoFixPR: {
      opened: true,
      pullRequestNumber: 52,
      htmlUrl: 'https://github.test/acme/widget/pull/52',
      guardianReview: { reviewed: true, event: 'APPROVE' },
      fixes: [{ filePath: 'src/unused.ts', rationale: 'Removed unreachable helper', verificationMethod: 'typecheck' }],
      skipped: [{ file: 'src/auth/session.ts', error: 'Requires human security test' }],
    },
    escalation: {
      issues: [{ issueNumber: 91, htmlUrl: 'https://github.test/acme/widget/issues/91', title: 'Session middleware trusts unsigned role claim', agentId: 'security', file: 'src/auth/session.ts' }],
    },
    memoryUsed: [{ writtenBy: 'security', filePath: 'src/auth/session.ts', summary: 'Team previously asked to block auth findings until tests exist.' }],
  });

  includesAll(finalReview, [
    '## Codeward Guardian Review — BLOCK',
    '**Finding summary**: CRITICAL: 1 · LOW: 1',
    '### Checks run',
    '| FAIL | typecheck | 1 new TypeScript error after candidate fix |',
    '### Codeward action',
    'Opened auto-fix PR #52',
    'Guardian verdict: APPROVE',
    '`src/unused.ts` — Removed unreachable helper (verified: typecheck)',
    '<details><summary>Skipped fixes</summary>',
    '### Escalated issues',
    '#91: Session middleware trusts unsigned role claim',
    '### Findings',
    '<details><summary>Context used</summary>',
  ]);

  console.log('PASS: Guardian renderer harness verified status, inline, issue, and final review Markdown.');
}

main().catch((e) => {
  console.error('FAIL: Guardian renderer harness failed.');
  console.error(e);
  process.exit(1);
});
