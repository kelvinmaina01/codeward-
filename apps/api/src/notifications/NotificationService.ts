import { Resend } from 'resend';
import * as React from 'react';
import { WelcomeVerificationEmail } from './templates/WelcomeVerificationEmail.js';
import { EscalationEmail } from './templates/EscalationEmail.js';
import { RepoConnectedSuccessEmail } from './templates/RepoConnectedSuccessEmail.js';
import { RunFailureEmail } from './templates/RunFailureEmail.js';
import { AccountDeletionEmail } from './templates/AccountDeletionEmail.js';
import { PlanUpgradedEmail } from './templates/PlanUpgradedEmail.js';
import { TrialLimitEmail } from './templates/TrialLimitEmail.js';
import dotenv from 'dotenv';

dotenv.config();

// We initialize Resend, but if the key is missing we just mock the send.
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock');

export class NotificationService {
  private static async sendEmail(to: string, subject: string, reactComponent: React.ReactElement) {
    const isMock = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_mock';
    
    // Convert the React component to raw HTML table string for Gmail safety
    const { render } = await import('@react-email/render');
    const html = await render(reactComponent);

    if (isMock) {
      console.log(`\n======================================================`);
      console.log(`📧 [MOCK EMAIL SENT]`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML Body Size: ${html.length} bytes`);
      console.log(`(Provide a valid RESEND_API_KEY in .env to send for real)`);
      console.log(`======================================================\n`);
      return { id: 'mock-id' };
    }

    try {
      const data = await resend.emails.send({
        from: process.env.EMAIL_FROM_ADDRESS || 'Codeward <hello@codeward.cloud>',
        to,
        subject,
        html,
      });
      return data;
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      throw error;
    }
  }

  static async sendWelcomeVerification(to: string, userName: string, verificationLink: string, isOAuth: boolean = false) {
    return this.sendEmail(
      to,
      isOAuth ? 'Welcome to Codeward' : 'Welcome to Codeward — Action Required',
      React.createElement(WelcomeVerificationEmail, { userName, verificationLink, isOAuth })
    );
  }

  static async sendEscalation(
    to: string, 
    repoName: string, 
    prNumber: number, 
    prTitle: string, 
    failingTestName: string, 
    runId: string
  ) {
    return this.sendEmail(
      to,
      `Urgent: Manual review required for PR #${prNumber} on ${repoName}`,
      React.createElement(EscalationEmail, { repoName, prNumber, prTitle, failingTestName, runId })
    );
  }

  static async sendRepoConnectedSuccess(to: string, repoName: string, baselineScore: number, dashboardUrl: string) {
    return this.sendEmail(
      to,
      `Codeward Initial Scan Complete: ${repoName}`,
      React.createElement(RepoConnectedSuccessEmail, { repoName, baselineScore, dashboardUrl })
    );
  }

  static async sendRunFailure(
    to: string,
    repoName: string,
    agentId: string,
    runId: number,
    commitSha: string,
    errorMessage: string,
    retryUrl: string,
    logTail?: string
  ) {
    return this.sendEmail(
      to,
      `Agent Run Failed: ${agentId} on ${repoName}`,
      React.createElement(RunFailureEmail, {
        repoName,
        agentId,
        runId,
        commitSha,
        errorMessage,
        retryUrl,
        logTail
      })
    );
  }

  static async sendAccountDeletionQueued(to: string, userName: string, dataSummary: Record<string, number>) {
    return this.sendEmail(
      to,
      'Your Codeward account deletion is queued — complete data removal will finish within 30 days',
      React.createElement(AccountDeletionEmail, { userName, dataSummary })
    );
  }

  /** Sent when an org upgrades to Pro or Team via Polar. */
  static async sendPlanUpgraded(
    to: string,
    userName: string,
    orgName: string,
    planType: 'pro' | 'team'
  ) {
    const label = planType === 'team' ? 'Team' : 'Pro';
    const dashboardUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/dashboard`
      : 'https://codeward.cloud/dashboard';
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@codeward.cloud';
    return this.sendEmail(
      to,
      `[Codeward] Welcome to ${label} — your scans are now unlimited`,
      React.createElement(PlanUpgradedEmail, { userName, orgName, planType, dashboardUrl, supportEmail })
    );
  }

  /** Sent when a free org exhausts their lifetime PR trial slots. */
  static async sendTrialLimitReached(
    to: string,
    userName: string,
    orgName: string,
    upgradeUrl: string
  ) {
    const trialPrLimit = Number(process.env.TRIAL_PR_LIMIT || '10');
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@codeward.cloud';
    return this.sendEmail(
      to,
      '[Codeward] Your free trial scans are used up — upgrade to keep scanning',
      React.createElement(TrialLimitEmail, { userName, orgName, trialPrLimit, upgradeUrl, supportEmail })
    );
  }
}
