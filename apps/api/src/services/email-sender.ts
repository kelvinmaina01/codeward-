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

  if (!apiKey) {
    console.warn('[Resend] No RESEND_API_KEY found. Logging Magic Link locally:', { toEmail, magicLink });
    return { success: true, id: 'mock-id-no-key' };
  }

  const roleDescriptions: Record<string, string[]> = {
    owner: ['Full access to workspace settings', 'Can invite and remove members', 'Manage billing and subscriptions', 'Full access to AI and repositories'],
    admin: ['Can invite members', 'Can edit workspace settings', 'Full access to AI and repositories', 'Cannot delete workspace'],
    developer: ['Can connect code repositories', 'Can interact with AI agents', 'Cannot invite members', 'Read-only access to settings'],
    member: ['Read-only access to workspace activity', 'Can view connected repositories', 'Cannot interact with AI', 'Cannot invite members'],
    viewer: ['Read-only access to workspace activity', 'Can view connected repositories', 'Cannot interact with AI', 'Cannot invite members']
  };

  const permissionsList = (roleDescriptions[role.toLowerCase()] || roleDescriptions.member).map(p => `<li style="margin-bottom: 8px;">${p}</li>`).join('');

  const membersHtml = existingMembers.length > 0 ? `
    <div style="margin-top: 32px; border-top: 1px solid #1f2937; padding-top: 24px;">
      <h3 style="color: #ffffff; font-size: 14px; margin-top: 0; margin-bottom: 16px;">Current Workspace Members</h3>
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 1px solid #374151;">
            <th style="padding: 8px 4px; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 600;">Profile</th>
            <th style="padding: 8px 4px; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 600;">Name</th>
            <th style="padding: 8px 4px; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 600;">Role</th>
          </tr>
        </thead>
        <tbody>
          ${existingMembers.map(m => `
            <tr style="border-bottom: 1px solid #1f2937;">
              <td style="padding: 12px 4px; width: 40px;">
                <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #374151; display: inline-block; text-align: center; line-height: 28px; font-size: 12px; color: #d1d5db; overflow: hidden; vertical-align: middle;">
                  ${m.image ? `<img src="${m.image}" style="width: 100%; height: 100%; object-fit: cover;" />` : m.name.charAt(0).toUpperCase()}
                </div>
              </td>
              <td style="padding: 12px 4px; color: #ffffff; font-size: 13px; font-weight: 500;">${m.name}</td>
              <td style="padding: 12px 4px; color: #9ca3af; font-size: 12px; text-transform: capitalize;">${m.role}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  try {
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #0c0d0e; color: #f3f4f6; border-radius: 12px; border: 1px solid #1f2937;">
        <div style="margin-bottom: 24px; text-align: center;">
          <img src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png" alt="Codeward" height="32" style="display: block; margin: 0 auto;" />
          <p style="color: #9ca3af; font-size: 13px; margin-top: 4px;">Automated Principal Engineer Platform</p>
        </div>
        
        <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; color: #ffffff; margin-top: 0;">Workspace Invitation</h2>
          <p style="color: #d1d5db; font-size: 14px; line-height: 1.5;">
            <strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on Codeward as a <strong style="text-transform: capitalize;">${role}</strong>.
          </p>
          
          <div style="margin-top: 24px; padding: 16px; background-color: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 8px;">
            <h3 style="color: #a855f7; font-size: 13px; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Your Role Permissions</h3>
            <ul style="color: #d1d5db; font-size: 13px; padding-left: 20px; margin: 0;">
              ${permissionsList}
            </ul>
          </div>
          
          <div style="margin: 32px 0; text-align: center;">
            <a href="${magicLink}" style="display: inline-block; background-color: #a855f7; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 8px; font-size: 14px;">
              Join Workspace
            </a>
            <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">This link will expire in 24 hours.</p>
          </div>

          ${membersHtml}
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 32px; border-top: 1px solid #1f2937;">
          <div style="margin: 0 0 24px 0;">
            <img src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png" alt="Codeward" height="28" style="display: inline-block;" />
          </div>
          
          <p style="color: #ffffff; font-size: 13px; margin: 0 0 24px 0;">
            © 2026 Codeward. All rights reserved. Nairobi, Kenya
          </p>
          
          <div style="margin-bottom: 32px;">
            <a href="#" style="display: inline-block; margin: 0 12px; text-decoration: none;">
              <img src="https://cdn.simpleicons.org/x/white" alt="X (Twitter)" width="20" height="20" style="display: block; border: 0;" />
            </a>
            <a href="https://www.linkedin.com/company/get-codeward" style="display: inline-block; margin: 0 12px; text-decoration: none;">
              <img src="https://cdn.simpleicons.org/linkedin/white" alt="LinkedIn" width="20" height="20" style="display: block; border: 0;" />
            </a>
            <a href="https://github.com/apps/codeward-guardian" style="display: inline-block; margin: 0 12px; text-decoration: none;">
              <img src="https://cdn.simpleicons.org/github/white" alt="GitHub" width="20" height="20" style="display: block; border: 0;" />
            </a>
          </div>
          
          <p style="color: #ffffff; font-size: 13px; line-height: 1.6; margin: 0 0 24px 0;">
            This email was sent to ${toEmail}.<br>
            Don't want to receive emails from Codeward? Change your email preferences. If you have any questions or concerns, please contact us at <a href="mailto:support@codeward.cloud" style="color: #ffffff; text-decoration: none;">support@codeward.cloud</a>.
          </p>
          
          <div style="font-size: 13px;">
            <a href="#" style="color: #0ea5e9; text-decoration: underline; margin: 0 12px;">View in Browser</a>
            <a href="#" style="color: #0ea5e9; text-decoration: underline; margin: 0 12px;">Privacy Policy</a>
            <a href="#" style="color: #0ea5e9; text-decoration: underline; margin: 0 12px;">Unsubscribe</a>
          </div>
        </div>
      </div>
    `;

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
      return { success: false, error: data.message || 'Failed to send invite email' };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[Resend] Exception:', err);
    return { success: false, error: err.message || 'Resend service failure' };
  }
}
