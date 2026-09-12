import * as React from 'react';

interface TrialLimitEmailProps {
  userName: string;
  orgName: string;
  trialPrLimit: number;
  upgradeUrl: string;
  supportEmail: string;
}

export function TrialLimitEmail({ userName, orgName, trialPrLimit, upgradeUrl, supportEmail }: TrialLimitEmailProps) {
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
          <span style={{ fontSize: '36px' }}>🔒</span>
        </div>
        <h2 style={{ fontSize: '20px', color: '#ffffff', margin: '0 0 8px 0', textAlign: 'center' }}>
          Trial limit reached
        </h2>
        <p style={{ color: '#d1d5db', fontSize: '14px', lineHeight: '1.6', textAlign: 'center', margin: '0' }}>
          Hi <strong>{userName}</strong> — <strong>{orgName}</strong> has used all{' '}
          <strong>{trialPrLimit} free PR reviews</strong> in your trial.
          Your most recent PR didn't receive a full scan.
        </p>
      </div>

      {/* What they're missing */}
      <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px' }}>
        <h3 style={{ color: '#f87171', fontSize: '12px', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>What this PR missed</h3>
        <ul style={{ color: '#d1d5db', fontSize: '13px', paddingLeft: '20px', margin: '0', lineHeight: '1.8' }}>
          <li>🔐 <strong>Security agent</strong> — auth vulnerabilities, exposed secrets, injection risks</li>
          <li>🏛️ <strong>Architecture agent</strong> — design flaws, structural antipatterns</li>
          <li>🧹 <strong>Bloat agent</strong> — dead code, duplicated logic</li>
          <li>🤖 <strong>AI Era agent</strong> — LLM misuse patterns, prompt injection risks</li>
        </ul>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <a
          href={upgradeUrl}
          style={{ display: 'inline-block', backgroundColor: '#a855f7', color: '#ffffff', textDecoration: 'none', fontWeight: 600, padding: '14px 32px', borderRadius: '8px', fontSize: '15px' }}
        >
          Upgrade to Pro →
        </a>
      </div>
      <p style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', margin: '0 0 24px 0' }}>
        Scans resume automatically on your very next PR — no re-setup.
      </p>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingTop: '24px', borderTop: '1px solid #1f2937' }}>
        <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 8px 0' }}>
          Already upgraded?{' '}
          <a href={upgradeUrl} style={{ color: '#a855f7', textDecoration: 'none' }}>Refresh your plan status</a>
          {' '}or reach us at{' '}
          <a href={`mailto:${supportEmail}`} style={{ color: '#a855f7', textDecoration: 'none' }}>{supportEmail}</a>.
        </p>
        <p style={{ color: '#374151', fontSize: '11px', margin: '0' }}>
          © 2026 Codeward. All rights reserved. Nairobi, Kenya.
        </p>
      </div>

    </div>
  );
}
