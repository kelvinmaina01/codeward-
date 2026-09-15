import * as React from 'react';
import { render } from '@react-email/render';
import { WorkspaceInviteEmail } from '../notifications/templates/WorkspaceInviteEmail.js';
import { WorkspaceRemovalEmail } from '../notifications/templates/WorkspaceRemovalEmail.js';

export async function sendWorkspaceInviteMagicLink({
  toEmail,
  workspaceName,
  inviterName,
  inviteToken,
  role,
  existingMembers = []
}: {
  toEmail: string;
  workspaceName: string;
  inviterName: string;
  inviteToken: string;
  role: string;
  existingMembers?: { name: string; role: string; image: string | null }[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const magicLink = `${frontendUrl}/invite/${inviteToken}`;

  const htmlContent = await render(
    React.createElement(WorkspaceInviteEmail, {
      toEmail,
      workspaceName,
      inviterName,
      role,
      magicLink,
      existingMembers,
    })
  );

  if (!apiKey) {
    if (process.env.EUSEND_API_KEY) {
      console.log(`[EmailSender] Resend not configured. Sending Workspace Invite Magic Link via Eusend to ${toEmail}...`);
      const { sendEmailViaEusend } = await import('./email-fallback.service.js');
      const fallbackResult = await sendEmailViaEusend({
        to: toEmail,
        subject: `[Codeward] You're invited to join ${workspaceName}`,
        html: htmlContent,
      });
      if (fallbackResult.success) {
        return { success: true, id: fallbackResult.id };
      }
    }
    console.warn('[Resend] No RESEND_API_KEY found. Logging Magic Link locally:', { toEmail, magicLink });
    return { success: true, id: 'mock-id-no-key' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Codeward Workspaces <support@codeward.cloud>',
        to: [toEmail],
        subject: `[Codeward] You're invited to join ${workspaceName}`,
        html: htmlContent
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Resend] Error sending email:', data);
      if (process.env.EUSEND_API_KEY) {
        console.log(`[EmailSender] 🔄 Failover: Sending Workspace Invite via Eusend to ${toEmail}...`);
        const { sendEmailViaEusend } = await import('./email-fallback.service.js');
        const fallbackResult = await sendEmailViaEusend({
          to: toEmail,
          subject: `[Codeward] You're invited to join ${workspaceName}`,
          html: htmlContent,
        });
        if (fallbackResult.success) {
          return { success: true, id: fallbackResult.id };
        }
      }
      return { success: false, error: data.message || 'Failed to send invite email' };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[Resend] Exception:', err);
    if (process.env.EUSEND_API_KEY) {
      try {
        console.log(`[EmailSender] 🔄 Failover on exception: Sending Workspace Invite via Eusend to ${toEmail}...`);
        const { sendEmailViaEusend } = await import('./email-fallback.service.js');
        const fallbackResult = await sendEmailViaEusend({
          to: toEmail,
          subject: `[Codeward] You're invited to join ${workspaceName}`,
          html: htmlContent,
        });
        if (fallbackResult.success) {
          return { success: true, id: fallbackResult.id };
        }
      } catch (fbErr: any) {
        console.error('[EmailSender] Eusend fallback exception:', fbErr.message);
      }
    }
    return { success: false, error: err.message || 'Resend service failure' };
  }
}

export async function sendWorkspaceRemovalNotification({
  toEmail,
  workspaceName,
  actorName,
  memberRole = 'member'
}: {
  toEmail: string;
  workspaceName: string;
  actorName: string;
  memberRole?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const dashboardUrl = `${frontendUrl}/dashboard`;

  const htmlContent = await render(
    React.createElement(WorkspaceRemovalEmail, {
      toEmail,
      workspaceName,
      actorName,
      memberRole,
      dashboardUrl,
    })
  );

  if (!apiKey) {
    if (process.env.EUSEND_API_KEY) {
      console.log(`[EmailSender] Resend not configured. Sending Workspace Removal via Eusend to ${toEmail}...`);
      const { sendEmailViaEusend } = await import('./email-fallback.service.js');
      const fallbackResult = await sendEmailViaEusend({
        to: toEmail,
        subject: `[Codeward] You have been removed from ${workspaceName}`,
        html: htmlContent,
      });
      if (fallbackResult.success) {
        return { success: true, id: fallbackResult.id };
      }
    }
    console.warn('[Resend] No RESEND_API_KEY found. Logging removal notification locally:', { toEmail, workspaceName, actorName });
    return { success: true, id: 'mock-id-no-key' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Codeward Workspaces <support@codeward.cloud>',
        to: [toEmail],
        subject: `[Codeward] You have been removed from ${workspaceName}`,
        html: htmlContent
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Resend] Error sending removal email:', data);
      if (process.env.EUSEND_API_KEY) {
        console.log(`[EmailSender] 🔄 Failover: Sending Workspace Removal via Eusend to ${toEmail}...`);
        const { sendEmailViaEusend } = await import('./email-fallback.service.js');
        const fallbackResult = await sendEmailViaEusend({
          to: toEmail,
          subject: `[Codeward] You have been removed from ${workspaceName}`,
          html: htmlContent,
        });
        if (fallbackResult.success) {
          return { success: true, id: fallbackResult.id };
        }
      }
      return { success: false, error: data.message || 'Failed to send removal email' };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[Resend] Exception sending removal email:', err);
    if (process.env.EUSEND_API_KEY) {
      try {
        console.log(`[EmailSender] 🔄 Failover on exception: Sending Workspace Removal via Eusend to ${toEmail}...`);
        const { sendEmailViaEusend } = await import('./email-fallback.service.js');
        const fallbackResult = await sendEmailViaEusend({
          to: toEmail,
          subject: `[Codeward] You have been removed from ${workspaceName}`,
          html: htmlContent,
        });
        if (fallbackResult.success) {
          return { success: true, id: fallbackResult.id };
        }
      } catch (fbErr: any) {
        console.error('[EmailSender] Eusend fallback exception:', fbErr.message);
      }
    }
    return { success: false, error: err.message || 'Resend service failure' };
  }
}

