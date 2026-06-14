import { Resend } from 'resend';
import { render } from '@react-email/render';
import * as React from 'react';
import { WelcomeVerificationEmail } from './templates/WelcomeVerificationEmail.js';
import { EscalationEmail } from './templates/EscalationEmail.js';
import { RepoConnectedSuccessEmail } from './templates/RepoConnectedSuccessEmail.js';
import dotenv from 'dotenv';

dotenv.config();

// We initialize Resend, but if the key is missing we just mock the send.
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock');

export class NotificationService {
  private static async sendEmail(to: string, subject: string, reactComponent: React.ReactElement) {
    const isMock = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_mock';
    
    // Convert the React component to raw HTML table string for Gmail safety
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
        from: 'Codeward <system@codeward.io>',
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

  static async sendWelcomeVerification(to: string, userName: string, verificationLink: string) {
    return this.sendEmail(
      to,
      'Welcome to Codeward — Action Required',
      React.createElement(WelcomeVerificationEmail, { userName, verificationLink })
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
}
