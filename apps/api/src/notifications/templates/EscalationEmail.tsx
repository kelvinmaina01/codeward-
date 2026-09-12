import * as React from 'react';
import { BrandEmailLayout, brandColors } from './BrandEmailLayout.js';
import { BrandHeader } from './components/BrandHeader.js';
import { BrandFooter } from './components/BrandFooter.js';
import { BrandButton } from './components/BrandButton.js';

interface EscalationEmailProps {
  recipientName?: string;
  repoName: string;
  prNumber: number;
  prTitle: string;
  failingTestName: string;
  runId: string | number;
  dashboardUrl?: string;
}

export const EscalationEmail: React.FC<EscalationEmailProps> = ({
  recipientName = 'Developer',
  repoName,
  prNumber,
  prTitle,
  failingTestName,
  runId,
  dashboardUrl: customDashboardUrl,
}) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://codeward.cloud';
  const dashboardUrl = customDashboardUrl || `${baseUrl}/dashboard/runs/${runId}`;

  return (
    <BrandEmailLayout previewText={`Urgent: Manual review required for PR #${prNumber} on ${repoName}`}>
      {/* 1. Header with Logo, #020203 Headline, and Blocker Stat */}
      <BrandHeader
        headline="Manual Review Required"
        subtitle={`${repoName} · PR #${prNumber}`}
        heroStat={{
          value: 'BLOCKED',
          label: 'Auto-Fix Retries Exhausted',
          valueColor: brandColors.dangerRed,
          labelColor: brandColors.textSecondary,
        }}
      />

      {/* 2. Message */}
      <div style={messageBox}>
        <p style={leadText}>
          Hi <strong style={{ color: brandColors.textPrimary }}>{recipientName}</strong>,
        </p>
        <p style={bodyText}>
          Codeward intercepted a pull request introducing breaking changes. The AI agent exhausted its sandbox auto-fix retries without achieving a passing test suite.
        </p>
      </div>

      {/* 3. Blocker Details Box */}
      <div style={alertBox}>
        <p style={alertLine}>
          <strong style={{ color: brandColors.textPrimary }}>Pull Request:</strong> #{prNumber} — {prTitle}
        </p>
        <p style={alertLine}>
          <strong style={{ color: brandColors.dangerRed }}>Blocking Failure:</strong> {failingTestName}
        </p>
      </div>

      {/* 4. Action Button (#FCE2BA Pill) */}
      <BrandButton href={dashboardUrl}>
        Inspect Sandbox Logs & Diffs →
      </BrandButton>

      {/* Secondary GitHub issue link */}
      <div style={secondaryLinkWrapper}>
        <a href={`https://github.com/${repoName}/pull/${prNumber}`} style={secondaryLink}>
          View PR #{prNumber} on GitHub ↗
        </a>
      </div>

      {/* 5. Dynamic Footer */}
      <BrandFooter
        recipientName={recipientName}
        purposeText={`This is a critical security and merge blocker alert for ${repoName}.`}
        isMandatoryTransactional={true}
      />
    </BrandEmailLayout>
  );
};

const messageBox: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '20px',
};

const leadText: React.CSSProperties = {
  fontSize: '15px',
  color: brandColors.textPrimary,
  margin: '0 0 8px 0',
};

const bodyText: React.CSSProperties = {
  fontSize: '13px',
  color: brandColors.textSecondary,
  lineHeight: '1.6',
  margin: '0',
};

const alertBox: React.CSSProperties = {
  margin: '20px 0',
  padding: '16px',
  backgroundColor: 'rgba(239, 68, 68, 0.05)',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  borderRadius: '8px',
  textAlign: 'left',
};

const alertLine: React.CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: '13px',
  color: brandColors.textSecondary,
};

const secondaryLinkWrapper: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '-12px',
  marginBottom: '20px',
};

const secondaryLink: React.CSSProperties = {
  color: brandColors.noticeBlue,
  fontSize: '13px',
  textDecoration: 'underline',
};

export default EscalationEmail;
