import * as React from 'react';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { AccountDeletionEmail } from '../src/notifications/templates/AccountDeletionEmail.js';

dotenv.config();

const targetEmail = process.argv[2] || process.env.TEST_EMAIL || 'kelvin.reallife8@gmail.com';
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error('❌ RESEND_API_KEY not found in environment.');
  process.exit(1);
}

const resend = new Resend(apiKey);
let fromAddress = process.env.EMAIL_FROM_ADDRESS || 'Codeward <notifications@codeward.cloud>';

async function main() {
  console.log(`\n🚀 Sending Account Deletion Queued email to ${targetEmail} via Resend...\n`);

  const reactElement = React.createElement(AccountDeletionEmail, {
    userName: 'Kelvin Gichinga',
    dataSummary: {
      'Connected Repositories': 2,
      'Scanned Pull Requests': 14,
      'Active Workspaces': 1,
      'API Keys & Webhooks': 3,
      'Sandbox Audit Logs': 58,
    },
  });

  const html = await render(reactElement);
  const subject = 'Your Codeward account deletion is queued — 30-day compliance window active';

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

    console.log(`✅ [SENT] "${subject}" -> ID: ${result.data?.id}`);
  } catch (err: any) {
    if (
      err.message?.includes('domain is not verified') ||
      err.message?.includes('can only send testing emails') ||
      err.message?.includes('validation_error')
    ) {
      console.warn(`⚠️ Custom domain not verified (${err.message}). Retrying with onboarding@resend.dev...`);
      fromAddress = 'Codeward <onboarding@resend.dev>';

      const retryResult = await resend.emails.send({
        from: fromAddress,
        to: targetEmail,
        subject: `[Codeward Test] ${subject}`,
        html,
        replyTo: 'support@codeward.cloud',
      });

      if ((retryResult as any)?.error) {
        console.error('❌ Failed sending with fallback:', (retryResult as any).error.message);
        process.exit(1);
      }

      console.log(`✅ [SENT via fallback] "${subject}" -> ID: ${retryResult.data?.id}`);
    } else {
      console.error('❌ Error sending email:', err.message);
      process.exit(1);
    }
  }

  console.log(`\n🎉 Test email successfully delivered to ${targetEmail}!\n`);
}

main().catch(console.error);
