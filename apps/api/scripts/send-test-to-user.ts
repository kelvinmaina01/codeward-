import * as React from 'react';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import dotenv from 'dotenv';

import { RunCompletedEmail } from '../src/notifications/templates/RunCompletedEmail.js';
import { WelcomeVerificationEmail } from '../src/notifications/templates/WelcomeVerificationEmail.js';
import { TrialLimitEmail } from '../src/notifications/templates/TrialLimitEmail.js';
import { PlanUpgradedEmail } from '../src/notifications/templates/PlanUpgradedEmail.js';
import { RunFailureEmail } from '../src/notifications/templates/RunFailureEmail.js';
import { EscalationEmail } from '../src/notifications/templates/EscalationEmail.js';

dotenv.config();

const targetEmail = process.argv[2] || process.env.TEST_EMAIL || 'kelvin.reallife8@gmail.com';
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error('❌ RESEND_API_KEY not found in environment.');
  process.exit(1);
}

const resend = new Resend(apiKey);

// We will attempt with the brand domain first, and if Resend requires domain verification, fallback to onboarding@resend.dev for test delivery
let fromAddress = process.env.EMAIL_FROM_ADDRESS || 'Codeward <notifications@codeward.cloud>';

async function sendEmailWithFallback(subject: string, reactElement: React.ReactElement) {
  const html = await render(reactElement);

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: targetEmail,
      subject,
      html,
      replyTo: 'support@codeward.cloud',
    });

    if ((result as any)?.error) {
      throw new Error((result as any).error.message);
    }

    console.log(`  ✅ [SENT] "${subject}" -> ID: ${result.data?.id}`);
    return result.data?.id;
  } catch (err: any) {
    // If custom domain is not yet verified in Resend dashboard, switch to Resend testing domain
    if (err.message?.includes('domain is not verified') || err.message?.includes('can only send testing emails') || err.message?.includes('validation_error')) {
      console.warn(`  ⚠️ Custom domain "${fromAddress}" not yet verified on Resend (${err.message}). Retrying with "Codeward <onboarding@resend.dev>"...`);
      fromAddress = 'Codeward <onboarding@resend.dev>';
      
      const retryResult = await resend.emails.send({
        from: fromAddress,
        to: targetEmail,
        subject: `[Codeward Test] ${subject}`,
        html,
        replyTo: 'support@codeward.cloud',
      });

      if ((retryResult as any)?.error) {
        console.error(`  ❌ Failed sending with fallback:`, (retryResult as any).error.message);
        return null;
      }

      console.log(`  ✅ [SENT via fallback] "${subject}" -> ID: ${retryResult.data?.id}`);
      return retryResult.data?.id;
    } else {
      console.error(`  ❌ Error sending "${subject}":`, err.message);
      return null;
    }
  }
}

async function main() {
  console.log(`\n🚀 Sending full email suite to ${targetEmail} via Resend...\n`);

  // 1. Welcome & Dynamic Verification Email
  console.log('1. Dispatching Welcome & Dynamic Verification Email...');
  await sendEmailWithFallback(
    'Welcome to Codeward — Verify Your Email Address',
    React.createElement(WelcomeVerificationEmail, {
      userName: 'Kelvin Gichinga',
      verificationLink: 'https://codeward.cloud/verify-email?token=sec_live_token_7788',
      isOAuth: false,
    })
  );

  // 2. PR Run Completed Report (Flagship with Agent Matrix & Terminal Logs)
  console.log('2. Dispatching Flagship PR Run Completed Report...');
  await sendEmailWithFallback(
    '[GATE PASSED] PR #42 on kelvinmaina01/codeward- (Score: 94/100)',
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
      logTail: `> [Sandbox] Booting Firecracker microVM (125ms)\n> [AST] 4 files parsed cleanly\n> [Security] Zero vulnerabilities found\n> [Guardian] Approved for merge. All checks green.`,
      dashboardUrl: 'https://codeward.cloud/dashboard/runs/101',
      prGithubUrl: 'https://github.com/kelvinmaina01/codeward-/pull/42',
    })
  );

  // 3. Escalation / Blocker Email
  console.log('3. Dispatching Escalation & Manual Review Alert...');
  await sendEmailWithFallback(
    '🚨 Action Required: PR #42 on kelvinmaina01/codeward- blocked',
    React.createElement(EscalationEmail, {
      recipientName: 'Kelvin Gichinga',
      repoName: 'kelvinmaina01/codeward-',
      prNumber: 42,
      prTitle: 'Database migration without RLS check',
      failingTestName: 'test_rls_security_isolation() failed with code 403',
      runId: 102,
    })
  );

  // 4. Free Trial Limit Exhausted Email
  console.log('4. Dispatching Trial Limit Reached Alert...');
  await sendEmailWithFallback(
    '[Action Required] Free trial scans exhausted for codeward-team',
    React.createElement(TrialLimitEmail, {
      userName: 'Kelvin Gichinga',
      orgName: 'codeward-team',
      trialPrLimit: 10,
      upgradeUrl: 'https://codeward.cloud/pricing',
    })
  );

  // 5. Plan Upgraded Confirmation Email
  console.log('5. Dispatching Plan Upgraded Confirmation...');
  await sendEmailWithFallback(
    'Welcome to Codeward Pro — unlimited scans active for codeward-team',
    React.createElement(PlanUpgradedEmail, {
      userName: 'Kelvin Gichinga',
      orgName: 'codeward-team',
      planType: 'pro',
      dashboardUrl: 'https://codeward.cloud/dashboard',
    })
  );

  // 6. Run Failure Error Email
  console.log('6. Dispatching Run Failure Diagnostic Alert...');
  await sendEmailWithFallback(
    '⚠️ Agent Run Failed: security on kelvinmaina01/codeward- (Run #999)',
    React.createElement(RunFailureEmail, {
      recipientName: 'Kelvin Gichinga',
      repoName: 'kelvinmaina01/codeward-',
      agentId: 'security',
      runId: 999,
      commitSha: '9f8e7d6c5b',
      errorMessage: 'Docker sandbox daemon out of memory (OOM)',
      retryUrl: 'https://codeward.cloud/dashboard/runs/999/retry',
      logTail: 'FATAL: Process killed by OOM killer at 0x4f82\nSandbox terminated unexpectedly.',
    })
  );

  console.log('\n🎉 All test emails processed! Check your inbox at: ' + targetEmail + '\n');
}

main().catch(console.error);
