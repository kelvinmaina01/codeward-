import * as React from 'react';

interface PlanUpgradedEmailProps {
  userName: string;
  orgName: string;
  planType: 'pro' | 'team';
  dashboardUrl: string;
  supportEmail: string;
}

const planLabels: Record<string, string> = {
  pro:  'Pro',
  team: 'Team',
};

const planFeatures: Record<string, string[]> = {
  pro: [
    '100 PR scans per billing period',
    'Security agent — auth, secrets, injection patterns',
    'Architecture agent — design and structure issues',
    'Bloat agent — dead code, redundant patterns',
    'AI Era agent — LLM misuse & prompt injection risks',
    'Full compliance & data-dx agents',
    'Priority support',
  ],
  team: [
    'Unlimited PR scans',
    'All Pro features',
    'Multi-repo dashboards',
    'Team RBAC & audit logs',
    'Dedicated onboarding support',
    'SLA-backed uptime',
  ],
};

export function PlanUpgradedEmail({ userName, orgName, planType, dashboardUrl, supportEmail }: PlanUpgradedEmailProps) {
  const label    = planLabels[planType] ?? planType;
  const features = planFeatures[planType] ?? [];

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", maxWidth: '560px', margin: '0 auto', padding: '32px 24px', backgroundColor: '#0c0d0e', color: '#f3f4f6', borderRadius: '12px', border: '1px solid #1f2937' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <img src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png" alt="Codeward" height="32" style={{ display: 'block', margin: '0 auto' }} />
        <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '4px' }}>Automated Principal Engineer Platform</p>
      </div>

      {/* Hero */}
      <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '36px' }}>🚀</span>
        </div>
        <h2 style={{ fontSize: '20px', color: '#ffffff', margin: '0 0 8px 0', textAlign: 'center' }}>
          You're on {label}!
        </h2>
        <p style={{ color: '#d1d5db', fontSize: '14px', lineHeight: '1.6', textAlign: 'center', margin: '0' }}>
          Hi <strong>{userName}</strong> — <strong>{orgName}</strong> is now on the <strong>{label} plan</strong>.
          Your next PR will get the full Codeward treatment automatically.
        </p>
      </div>

      {/* Feature list */}
      <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: 'rgba(168, 85, 247, 0.07)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '8px' }}>
        <h3 style={{ color: '#a855f7', fontSize: '12px', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>What's unlocked</h3>
        <ul style={{ color: '#d1d5db', fontSize: '13px', paddingLeft: '20px', margin: '0', lineHeight: '1.8' }}>
          {features.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <a href={dashboardUrl} style={{ display: 'inline-block', backgroundColor: '#a855f7', color: '#ffffff', textDecoration: 'none', fontWeight: 600, padding: '12px 28px', borderRadius: '8px', fontSize: '14px' }}>
          Open Dashboard →
        </a>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingTop: '24px', borderTop: '1px solid #1f2937' }}>
        <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 8px 0' }}>
          Questions? Reply to this email or reach us at{' '}
          <a href={`mailto:${supportEmail}`} style={{ color: '#a855f7', textDecoration: 'none' }}>{supportEmail}</a>.
        </p>
        <p style={{ color: '#374151', fontSize: '11px', margin: '0' }}>
          © 2026 Codeward. All rights reserved. Nairobi, Kenya.
        </p>
      </div>

    </div>
  );
}
