import * as React from 'react';
import { BrandEmailLayout, brandColors } from './BrandEmailLayout.js';
import { BrandHeader } from './components/BrandHeader.js';
import { BrandFooter } from './components/BrandFooter.js';
import { BrandButton } from './components/BrandButton.js';

interface RepoConnectedSuccessEmailProps {
  repoName: string;
  baselineScore: number;
  dashboardUrl: string;
  recipientName?: string;
}

export const RepoConnectedSuccessEmail: React.FC<RepoConnectedSuccessEmailProps> = ({
  repoName,
  baselineScore,
  dashboardUrl,
  recipientName = 'Engineer',
}) => {
  const isHealthy = baselineScore >= 80;
  const scoreColor = isHealthy ? brandColors.successGreen : baselineScore >= 60 ? brandColors.warningYellow : brandColors.dangerRed;

  return (
    <BrandEmailLayout previewText={`Initial Deep Scan Complete: ${repoName} (Score: ${baselineScore}/100)`}>
      {/* 1. Brand Header with Logo, Bold Headline, and Hero Stat */}
      <BrandHeader
        headline="Initial Deep Scan Complete"
        subtitle={`Repository baseline established · PR guard active for ${repoName}`}
        heroStat={{
          value: `${baselineScore}/100`,
          label: 'Baseline Code & Security Score',
          valueColor: scoreColor,
          labelColor: brandColors.textSecondary,
        }}
      />

      {/* 2. Introductory Context */}
      <div style={contentBlock}>
        <p style={paragraph}>
          Hello <strong>{recipientName}</strong>,
        </p>
        <p style={paragraph}>
          We have completed the comprehensive Initial Deep Scan for <strong>{repoName}</strong>. Our 7 autonomous agents have mapped your AST graph, identified vulnerabilities, and calibrated continuous PR test environments.
        </p>
      </div>

      {/* 3. Protection Guarantee Card */}
      <div style={protectionCard}>
        <div style={protectionTitle}>Continuous Autonomous Protection Active</div>
        <p style={protectionText}>
          From now on, Codeward will intercept incoming Pull Requests, execute test suites inside isolated microVM sandboxes, and automatically remediate vulnerabilities before they reach production.
        </p>
      </div>

      {/* 4. Primary CTA: View Full Dashboard */}
      <BrandButton href={dashboardUrl}>
        View Full Health Report & Audit
      </BrandButton>

      {/* 5. Compliant Brand Footer */}
      <BrandFooter
        recipientName={recipientName}
        purposeText="This transactional notification was sent because your repository's baseline audit completed."
        isMandatoryTransactional={true}
        appUrl={dashboardUrl}
      />
    </BrandEmailLayout>
  );
};

export default RepoConnectedSuccessEmail;

// ─── STYLES ────────────────────────────────────────────────────────
const contentBlock: React.CSSProperties = {
  textAlign: 'left',
  margin: '20px 0 16px',
};

const paragraph: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: brandColors.textSecondary,
  margin: '0 0 12px',
};

const protectionCard: React.CSSProperties = {
  backgroundColor: '#FAF9FF',
  border: `1px solid ${brandColors.cardBorder}`,
  borderRadius: '10px',
  padding: '16px 20px',
  textAlign: 'left',
  margin: '18px 0',
};

const protectionTitle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '700',
  color: brandColors.textPrimary,
  marginBottom: '6px',
};

const protectionText: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '19px',
  color: brandColors.textSecondary,
  margin: '0',
};
