import * as React from 'react';
import { BrandEmailLayout, brandColors } from './BrandEmailLayout.js';
import { BrandHeader } from './components/BrandHeader.js';
import { BrandFooter } from './components/BrandFooter.js';
import { BrandButton } from './components/BrandButton.js';

interface ReposConnectedInitiatedEmailProps {
  userName: string;
  activeRepo: string;
  queuedRepos?: string[];
  streamUrl: string;
  dashboardUrl?: string;
  supportEmail?: string;
}

export function ReposConnectedInitiatedEmail({
  userName,
  activeRepo,
  queuedRepos = [],
  streamUrl,
  dashboardUrl = 'https://codeward.cloud/dashboard',
  supportEmail: _supportEmail = 'support@codeward.cloud',
}: ReposConnectedInitiatedEmailProps) {
  const hasQueued = queuedRepos.length > 0;

  return (
    <BrandEmailLayout previewText={`Codeward Protection Initiated for ${activeRepo}`}>
      {/* 1. Header with Brand Logo, Bold Headline, and Hero Stat */}
      <BrandHeader
        headline="Repository Protection Initiated"
        subtitle={`Encrypted handshake verified · Continuous PR shield active for ${activeRepo}`}
        heroStat={{
          value: '7 AGENTS',
          label: `Analyzing ${activeRepo}`,
          valueColor: brandColors.textPrimary,
          labelColor: brandColors.successGreen,
        }}
      />

      {/* 2. Introductory Note */}
      <div style={contentBlock}>
        <p style={paragraph}>
          Hello <strong>{userName}</strong>,
        </p>
        <p style={paragraph}>
          Your repository has been successfully connected to Codeward. We have allocated an isolated microVM sandbox and initialized the comprehensive baseline scan.
        </p>
      </div>

      {/* 3. Active Repository Card (No emojis, clean engineering style) */}
      <div style={activeCard}>
        <div style={cardHeader}>
          <span style={activeBadge}>RUNNING BASELINE AUDIT</span>
        </div>
        <div style={repoTitle}>{activeRepo}</div>
        <p style={cardDesc}>
          7 autonomous agents are actively parsing AST graphs, inspecting CVEs, checking for secret leaks, detecting code debt, and validating test infrastructure.
        </p>
      </div>

      {/* 4. Queued Repositories Summary (Only count, no long table) */}
      {hasQueued && (
        <div style={queuedSection}>
          <div style={queuedCounterBox}>
            <span style={queuedText}>
              {`${queuedRepos.length} ${queuedRepos.length === 1 ? 'repository' : 'repositories'} queued for sequential scan`}
            </span>
          </div>

          {/* Sequential Execution Policy Box */}
          <div style={policyBox}>
            <strong>Sequential Policy: </strong>
            To protect your team from GitHub API rate limits, VM saturation, and agent throttling, repositories undergo baseline scans one at a time. Each queued repository will begin automatically upon completion of the previous run.
          </div>
        </div>
      )}

      {/* 5. Primary Action: Watch Live Agent Stream */}
      <BrandButton href={streamUrl}>
        Watch Live Agent Stream
      </BrandButton>

      {/* 6. Contextual Note */}
      <p style={footnote}>
        You can also enter your <a href={dashboardUrl} style={inlineLink}>Codeward Dashboard</a> at any time to monitor repositories, configure team rules, and manage alerts.
      </p>

      {/* 7. Compliant Security Footer */}
      <BrandFooter
        recipientName={userName}
        purposeText="This transactional notification was sent because you linked a code repository to Codeward."
        isMandatoryTransactional={true}
        appUrl={dashboardUrl}
      />
    </BrandEmailLayout>
  );
}

export default ReposConnectedInitiatedEmail;

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

const activeCard: React.CSSProperties = {
  backgroundColor: '#FAF9FF',
  border: `1.5px solid ${brandColors.purpleAccent}`,
  borderRadius: '10px',
  padding: '18px 20px',
  textAlign: 'left',
  margin: '18px 0',
};

const cardHeader: React.CSSProperties = {
  marginBottom: '6px',
};

const activeBadge: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  color: brandColors.purpleAccent,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
};

const repoTitle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '700',
  fontFamily: 'monospace',
  color: brandColors.textPrimary,
  marginBottom: '6px',
};

const cardDesc: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '18px',
  color: brandColors.textSecondary,
  margin: '0',
};

const queuedSection: React.CSSProperties = {
  textAlign: 'left',
  margin: '18px 0',
};

const queuedCounterBox: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  border: `1px solid ${brandColors.cardBorder}`,
  borderRadius: '8px',
  padding: '12px 14px',
  marginBottom: '10px',
};

const queuedText: React.CSSProperties = {
  fontSize: '13px',
  color: brandColors.textPrimary,
};

const policyBox: React.CSSProperties = {
  backgroundColor: '#F3F4F6',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  padding: '12px 14px',
  fontSize: '12px',
  lineHeight: '18px',
  color: brandColors.textSecondary,
};

const footnote: React.CSSProperties = {
  fontSize: '12px',
  color: brandColors.textMuted,
  textAlign: 'center',
  margin: '16px 0 24px',
};

const inlineLink: React.CSSProperties = {
  color: brandColors.noticeBlue,
  textDecoration: 'none',
  fontWeight: '600',
};
