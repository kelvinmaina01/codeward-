import * as React from 'react';
import { BrandEmailLayout, brandColors } from './BrandEmailLayout.js';
import { BrandHeader } from './components/BrandHeader.js';
import { BrandFooter } from './components/BrandFooter.js';
import { BrandButton } from './components/BrandButton.js';

interface TrialLimitEmailProps {
  userName: string;
  orgName: string;
  trialPrLimit: number;
  upgradeUrl: string;
  supportEmail?: string;
}

export function TrialLimitEmail({
  userName,
  orgName,
  trialPrLimit = 10,
  upgradeUrl,
  supportEmail: _supportEmail = 'support@codeward.cloud',
}: TrialLimitEmailProps) {
  return (
    <BrandEmailLayout previewText={`[Action Required] Trial limit reached for ${orgName}`}>
      {/* 1. Header with Logo, #020203 Headline, and 10/10 Hero Stat */}
      <BrandHeader
        headline="Free Trial Scans Exhausted"
        subtitle={`Organization: ${orgName} · Lifetime Free Quota Reached`}
        heroStat={{
          value: `${trialPrLimit}/${trialPrLimit}`,
          label: 'Free PR Scans Completed',
          valueColor: brandColors.warningYellow,
          labelColor: brandColors.textSecondary,
        }}
      />

      {/* 2. Notification Message */}
      <div style={messageBox}>
        <p style={leadText}>
          Hi <strong style={{ color: brandColors.textPrimary }}>{userName}</strong>,
        </p>
        <p style={bodyText}>
          <strong>{orgName}</strong> has completed all <strong>{trialPrLimit} complimentary PR reviews</strong>. Your most recent pull request could not be audited because your organization has hit the free-tier cap.
        </p>
      </div>

      {/* 3. Value At Stake Card */}
      <div style={missedCard}>
        <h3 style={missedTitle}>
          🔒 What Unaudited PRs Miss Without Codeward Pro:
        </h3>
        <ul style={missedList}>
          <li style={missedItem}>
            <strong>🛡️ Runtime Security Agent</strong> — SQLi, secret exposure, broken RLS checks
          </li>
          <li style={missedItem}>
            <strong>🏛️ Architecture Agent</strong> — Circular dependencies, cyclomatic debt, structural decay
          </li>
          <li style={missedItem}>
            <strong>🧹 Bloat Agent</strong> — Dead code branches, redundant utility libraries
          </li>
          <li style={missedItem}>
            <strong>🤖 AI-Era Flaws</strong> — Unvalidated LLM output vulnerabilities, prompt injection risks
          </li>
          <li style={missedItem}>
            <strong>🤖 Guardian Auto-Fix</strong> — Automated pull requests with ready-to-merge fixes
          </li>
        </ul>
      </div>

      {/* 4. Action Button (#FCE2BA Pill) */}
      <BrandButton href={upgradeUrl}>
        Upgrade to Pro for Unlimited Scans →
      </BrandButton>

      <p style={subNote}>
        Scans resume automatically on your very next commit — zero re-configuration required.
      </p>

      {/* 5. Dynamic Footer */}
      <BrandFooter
        recipientName={userName}
        recipientMeta={`Owner @ ${orgName}`}
        purposeText={`This is a usage notification regarding your free PR trial quota for ${orgName}.`}
        isMandatoryTransactional={false}
      />
    </BrandEmailLayout>
  );
}

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

const missedCard: React.CSSProperties = {
  margin: '22px 0',
  padding: '18px 20px',
  backgroundColor: 'rgba(245, 158, 11, 0.05)',
  border: '1px solid rgba(245, 158, 11, 0.25)',
  borderRadius: '8px',
  textAlign: 'left',
};

const missedTitle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: '13px',
  color: brandColors.warningYellow,
  fontWeight: 700,
};

const missedList: React.CSSProperties = {
  margin: '0',
  paddingLeft: '18px',
  fontSize: '12px',
  color: brandColors.textPrimary,
  lineHeight: '1.7',
};

const missedItem: React.CSSProperties = {
  marginBottom: '4px',
};

const subNote: React.CSSProperties = {
  color: brandColors.textMuted,
  fontSize: '12px',
  textAlign: 'center',
  marginTop: '-12px',
  marginBottom: '20px',
};

export default TrialLimitEmail;
