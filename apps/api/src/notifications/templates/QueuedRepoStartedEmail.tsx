import * as React from 'react';
import { BrandEmailLayout, brandColors } from './BrandEmailLayout.js';
import { BrandHeader } from './components/BrandHeader.js';
import { BrandFooter } from './components/BrandFooter.js';
import { BrandButton } from './components/BrandButton.js';

interface QueuedRepoStartedEmailProps {
  userName: string;
  previousRepo: string;
  activeRepo: string;
  remainingQueuedRepos?: string[];
  streamUrl: string;
  dashboardUrl?: string;
  supportEmail?: string;
}

export function QueuedRepoStartedEmail({
  userName,
  previousRepo,
  activeRepo,
  remainingQueuedRepos = [],
  streamUrl,
  dashboardUrl = 'https://codeward.cloud/dashboard',
  supportEmail: _supportEmail = 'support@codeward.cloud',
}: QueuedRepoStartedEmailProps) {
  const hasMoreQueued = remainingQueuedRepos.length > 0;

  return (
    <BrandEmailLayout previewText={`Now scanning ${activeRepo} — previous scan for ${previousRepo} complete`}>
      {/* 1. Header with Brand Logo, Bold Headline, and Hero Stat */}
      <BrandHeader
        headline="Next Repository Dequeued"
        subtitle={`Audit complete for ${previousRepo} · Now analyzing ${activeRepo}`}
        heroStat={{
          value: '7 AGENTS',
          label: `Scanning ${activeRepo}`,
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
          The baseline analysis for <strong>{previousRepo}</strong> has finished. In accordance with your sequential execution policy, Codeward has popped <strong>{activeRepo}</strong> from your queue and initiated its deep audit.
        </p>
      </div>

      {/* 3. Active Repository Card (No emojis) */}
      <div style={activeCard}>
        <div style={cardHeader}>
          <span style={activeBadge}>NOW RUNNING</span>
        </div>
        <div style={repoTitle}>{activeRepo}</div>
        <p style={cardDesc}>
          Isolated microVM running: parsing AST, checking CVEs and secret leaks, detecting code debt, and establishing continuous PR protection.
        </p>
      </div>

      {/* 4. Remaining Queued Repositories (Count only, no table) */}
      {hasMoreQueued && (
        <div style={queuedSection}>
          <div style={queuedCounterBox}>
            <span style={queuedText}>
              {`${remainingQueuedRepos.length} ${remainingQueuedRepos.length === 1 ? 'repository' : 'repositories'} remaining in queue`}
            </span>
          </div>
        </div>
      )}

      {/* 5. Primary Action: Watch Live Agent Stream */}
      <BrandButton href={streamUrl}>
        Watch Live Agent Stream
      </BrandButton>

      {/* 6. Contextual Note */}
      <p style={footnote}>
        You can also review completed findings on your <a href={dashboardUrl} style={inlineLink}>Codeward Dashboard</a>.
      </p>

      {/* 7. Compliant Security Footer */}
      <BrandFooter
        recipientName={userName}
        purposeText="This transactional notification was sent because your repository queue transitioned to the next scheduled scan."
        isMandatoryTransactional={true}
        appUrl={dashboardUrl}
      />
    </BrandEmailLayout>
  );
}

export default QueuedRepoStartedEmail;

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
  margin: '16px 0',
};

const queuedCounterBox: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  border: `1px solid ${brandColors.cardBorder}`,
  borderRadius: '8px',
  padding: '10px 14px',
};

const queuedText: React.CSSProperties = {
  fontSize: '13px',
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
