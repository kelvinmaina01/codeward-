export async function sendWorkspaceInviteOtp({
  toEmail,
  workspaceName,
  inviterName,
  otpCode,
  role
}: {
  toEmail: string;
  workspaceName: string;
  inviterName: string;
  otpCode: string;
  role: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('[Resend] No RESEND_API_KEY found. Logging OTP locally:', { toEmail, otpCode });
    return { success: true, id: 'mock-id-no-key' };
  }

  try {
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #0c0d0e; color: #f3f4f6; border-radius: 12px; border: 1px solid #1f2937;">
        <div style="margin-bottom: 24px; text-align: center;">
          <h1 style="color: #a855f7; font-size: 24px; font-weight: 700; margin: 0;">Codeward</h1>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 4px;">Automated Principal Engineer Platform</p>
        </div>
        
        <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; color: #ffffff; margin-top: 0;">Workspace Invitation</h2>
          <p style="color: #d1d5db; font-size: 14px; line-height: 1.5;">
            <strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on Codeward as a <strong>${role}</strong>.
          </p>
          
          <div style="margin: 28px 0; text-align: center;">
            <span style="font-size: 12px; text-transform: uppercase; tracking: 1px; color: #9ca3af; display: block; margin-bottom: 8px;">Your One-Time Passcode (OTP)</span>
            <div style="display: inline-block; background-color: #1f2937; border: 1px solid #374151; color: #38bdf8; font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 12px 24px; border-radius: 8px;">
              ${otpCode}
            </div>
            <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">This code will expire in 24 hours.</p>
          </div>
        </div>

        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          If you were not expecting this invitation, you can safely ignore this email.
        </p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Codeward Workspaces <onboarding@resend.dev>',
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
