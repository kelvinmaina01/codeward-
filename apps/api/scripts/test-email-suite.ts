import * as React from 'react';
import { render } from '@react-email/render';
import { RunCompletedEmail } from '../src/notifications/templates/RunCompletedEmail.js';
import { WelcomeVerificationEmail } from '../src/notifications/templates/WelcomeVerificationEmail.js';
import { TrialLimitEmail } from '../src/notifications/templates/TrialLimitEmail.js';
import { PlanUpgradedEmail } from '../src/notifications/templates/PlanUpgradedEmail.js';
import { RunFailureEmail } from '../src/notifications/templates/RunFailureEmail.js';
import { EscalationEmail } from '../src/notifications/templates/EscalationEmail.js';
import { verifyEmailRealTime } from '../src/services/email-verifier.js';
import { NotificationService } from '../src/notifications/NotificationService.js';

async function runTestSuite() {
  console.log('🧪 Starting Codeward Email Infrastructure & Design Verification Suite...\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: RunCompletedEmail (Flagship Multi-Agent Breakdown Table)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Testing RunCompletedEmail (Agent Breakdown Matrix & Logs) ---');
  const runCompletedHtml = await render(
    React.createElement(RunCompletedEmail, {
      recipientName: 'Kelvin Gichinga',
      recipientMeta: '@kelvinmaina01 · Admin @ codeward-',
      repoName: 'kelvinmaina01/codeward-',
      prNumber: 42,
      prTitle: 'Feat: Add runtime firecracker microVM sandbox hooks',
      commitSha: '4f2a8c199e7b23d04a11f2c98d',
      branch: 'main',
      gateDecision: 'PASS',
      overallScore: 94,
      tasks: [
        { agentId: 'security', status: 'completed', score: 96, findingsCount: 0, durationMs: 1100 },
        { agentId: 'architecture', status: 'completed', score: 88, findingsCount: 1, durationMs: 1800 },
        { agentId: 'bloat', status: 'completed', score: 100, findingsCount: 0, durationMs: 400 },
        { agentId: 'ai_era', status: 'completed', score: 92, findingsCount: 0, durationMs: 900 },
        { agentId: 'compliance', status: 'completed', score: 100, findingsCount: 0, durationMs: 600 },
        { agentId: 'data_dx', status: 'completed', score: 90, findingsCount: 0, durationMs: 700 },
        { agentId: 'broken_code', status: 'completed', score: 100, findingsCount: 0, durationMs: 1200 },
        { agentId: 'guardian', status: 'completed', score: 95, findingsCount: 0, durationMs: 500 },
      ],
      criticalFindings: [],
      autoFixPrUrl: 'https://github.com/kelvinmaina01/codeward-/pull/43',
      logTail: `> [Sandbox] Booting Firecracker microVM (125ms)\n> [AST] 4 files parsed cleanly\n> [Security] Zero vulnerabilities found\n> [Guardian] Approved for merge`,
      dashboardUrl: 'https://codeward.cloud/dashboard/runs/101',
      prGithubUrl: 'https://github.com/kelvinmaina01/codeward-/pull/42',
    })
  );

  assert(runCompletedHtml.length > 0, 'RunCompletedEmail rendered valid HTML');
  assert(runCompletedHtml.length < 60000, `RunCompletedEmail byte size (${runCompletedHtml.length} bytes) is safely under Gmail 102KB limit`);
  assert(runCompletedHtml.includes('#F3F2EF'), 'Container includes canvas background #F3F2EF');
  assert(runCompletedHtml.includes('#FCE2BA'), 'CTA button includes pill background #FCE2BA');
  assert(runCompletedHtml.includes('#020203'), 'Headline includes requested text color #020203');
  assert(runCompletedHtml.includes('#0A66C2'), 'Unmonitored notice includes LinkedIn blue #0A66C2');
  assert(runCompletedHtml.includes('company-logo_100_100'), 'Includes LinkedIn logo fallback URL');
  assert(runCompletedHtml.includes('Security'), 'Includes Agent Matrix table entries');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: WelcomeVerificationEmail
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing WelcomeVerificationEmail ---');
  const welcomeHtml = await render(
    React.createElement(WelcomeVerificationEmail, {
      userName: 'Kelvin',
      verificationLink: 'https://codeward.cloud/verify-email?token=sec_abc123',
      isOAuth: false,
    })
  );
  assert(welcomeHtml.includes('Welcome to Codeward'), 'Welcome headline rendered');
  assert(welcomeHtml.includes('#FCE2BA'), 'Welcome email uses #FCE2BA button');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: TrialLimitEmail
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing TrialLimitEmail ---');
  const trialHtml = await render(
    React.createElement(TrialLimitEmail, {
      userName: 'Saverio',
      orgName: 'acme-corp',
      trialPrLimit: 10,
      upgradeUrl: 'https://codeward.cloud/pricing',
    })
  );
  assert(trialHtml.includes('10/10'), 'TrialLimitEmail shows 10/10 hero stat');
  assert(trialHtml.includes('#FCE2BA'), 'TrialLimitEmail uses #FCE2BA button');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: PlanUpgradedEmail
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing PlanUpgradedEmail ---');
  const planHtml = await render(
    React.createElement(PlanUpgradedEmail, {
      userName: 'Kelvin',
      orgName: 'codeward-team',
      planType: 'pro',
      dashboardUrl: 'https://codeward.cloud/dashboard',
    })
  );
  assert(planHtml.includes('PRO'), 'PlanUpgradedEmail shows plan hero stat');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: RunFailureEmail
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing RunFailureEmail ---');
  const failureHtml = await render(
    React.createElement(RunFailureEmail, {
      recipientName: 'Kelvin',
      repoName: 'kelvinmaina01/codeward-',
      agentId: 'security',
      runId: 999,
      commitSha: '9f8e7d6c5b',
      errorMessage: 'Docker sandbox daemon out of memory (OOM)',
      retryUrl: 'https://codeward.cloud/dashboard/runs/999/retry',
      logTail: 'FATAL: Process killed by OOM killer at 0x4f82',
    })
  );
  assert(failureHtml.includes('Agent Execution Error'), 'RunFailureEmail headline rendered');
  assert(failureHtml.includes('OOM killer'), 'RunFailureEmail includes sanitized log snippet');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: EscalationEmail
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing EscalationEmail ---');
  const escalationHtml = await render(
    React.createElement(EscalationEmail, {
      recipientName: 'Kelvin',
      repoName: 'kelvinmaina01/codeward-',
      prNumber: 42,
      prTitle: 'Database migration without RLS check',
      failingTestName: 'test_rls_security_isolation() failed with code 403',
      runId: 102,
    })
  );
  assert(escalationHtml.includes('Manual Review Required'), 'EscalationEmail headline rendered');
  assert(!escalationHtml.includes('codeward.io'), 'No old codeward.io domains present');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: 3-Tier Dynamic Email Verifier
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Testing 3-Tier Dynamic Email Verifier ---');
  const validCheck = await verifyEmailRealTime('kelvin202maina@gmail.com');
  assert(validCheck.isValid === true, `Valid email verified: ${validCheck.message}`);

  const invalidSyntax = await verifyEmailRealTime('bad-email-without-at');
  assert(invalidSyntax.isValid === false && invalidSyntax.reason === 'invalid_syntax', 'Invalid syntax caught');

  const disposableCheck = await verifyEmailRealTime('attacker@mailinator.com');
  assert(disposableCheck.isValid === false && disposableCheck.reason === 'disposable_domain', 'Disposable email caught by blocklist');

  const noMxCheck = await verifyEmailRealTime('fake@nonexistentdomain123987456.xyz');
  assert(noMxCheck.isValid === false && noMxCheck.reason === 'no_mx_records', 'Non-existent domain caught by MX verification');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: NotificationService Mock Dispatch
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 8. Testing NotificationService Mock Dispatch ---');
  const mockDispatch = await NotificationService.sendWelcomeVerification(
    'test@codeward.cloud',
    'Kelvin Test',
    'https://codeward.cloud/connect-repo',
    true
  );
  assert(Boolean(mockDispatch?.id), 'NotificationService dispatched mock email safely without throwing');

  console.log(`\n======================================================`);
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`======================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
