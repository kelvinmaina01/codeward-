import * as React from 'react';
import { BrandEmailLayout, brandColors } from './BrandEmailLayout.js';
import { BrandHeader } from './components/BrandHeader.js';
import { BrandFooter } from './components/BrandFooter.js';
import { BrandButton } from './components/BrandButton.js';

interface PlanUpgradedEmailProps {
  userName: string;
  orgName: string;
  planType: 'pro' | 'team';
  dashboardUrl: string;
  supportEmail?: string;
}

const planLabels: Record<string, string> = {
  pro: 'Codeward Pro',
  team: 'Codeward Team',
};

const planFeatures: Record<string, string[]> = {
  pro: [
    '100 Full PR scans per billing period',
    'Runtime Security Agent — SQLi, secret scans, RLS leaks',
    'Architecture Agent — Circular dependencies, cyclomatic debt',
    'Bloat & Tech Debt Agent — Dead code, duplicated logic',
    'AI-Era Flaws Agent — LLM misuse & prompt injection vectors',
    'Firecracker MicroVM Sandbox Test Execution',
    'Guardian Auto-Fix PR Remediation',
  ],
  team: [
    'Unlimited PR Scans across all repositories',
    'All Pro Tier Capabilities included',
    'Multi-Repo Global Code Quality Dashboard',
    'Team RBAC, Member Roles & Audit Logs',
    'Dedicated Priority Onboarding & Live Support',
    'SLA-Backed MicroVM Infrastructure',
  ],
};

export function PlanUpgradedEmail({
  userName,
  orgName,
  planType,
  dashboardUrl,
  supportEmail: _supportEmail = 'support@codeward.cloud',
}: PlanUpgradedEmailProps) {
  const label = planLabels[planType] ?? 'Codeward Pro';
  const features = planFeatures[planType] ?? planFeatures.pro;

  return (
    <BrandEmailLayout previewText={`Welcome to ${label}! Your scans are now active for ${orgName}`}>
      {/* 1. Header with Logo, #020203 Headline, and Hero Stat */}
      <BrandHeader
        headline={`You're on ${label}!`}
        subtitle={`${orgName} is now upgraded · Unlimited review capabilities unlocked`}
        heroStat={{
          value: planType.toUpperCase(),
          label: 'Plan Active on All Repositories',
          valueColor: brandColors.textPrimary,
          labelColor: brandColors.successGreen,
        }}
      />

      {/* 2. Message */}
      <div style={messageContainer}>
        <p style={leadText}>
          Hi <strong style={{ color: brandColors.textPrimary }}>{userName}</strong>,
        </p>
        <p style={bodyText}>
          Thank you for trusting Codeward! Your subscription for <strong>{orgName}</strong> is active. Every incoming pull request will now automatically trigger the full autonomous agent review pipeline.
        </p>
      </div>

      {/* 3. Unlocked Features Card */}
      <div style={featuresBox}>
        <h3 style={featuresTitle}>🚀 Unlocked for Your Team:</h3>
        <ul style={featuresList}>
          {features.map((f, i) => (
            <li key={i} style={featureItem}>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* 4. Action Button (#FCE2BA Pill) */}
      <BrandButton href={dashboardUrl}>
        Launch Codeward Dashboard →
      </BrandButton>

      {/* 5. Dynamic Footer */}
      <BrandFooter
        recipientName={userName}
        recipientMeta={`Owner @ ${orgName}`}
        purposeText={`This is a subscription confirmation for your ${label} plan.`}
        isMandatoryTransactional={true}
      />
    </BrandEmailLayout>
  );
}

const messageContainer: React.CSSProperties = {
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

const featuresBox: React.CSSProperties = {
  margin: '22px 0',
  padding: '18px 20px',
  backgroundColor: 'rgba(16, 185, 129, 0.05)',
  border: '1px solid rgba(16, 185, 129, 0.25)',
  borderRadius: '8px',
  textAlign: 'left',
};

const featuresTitle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: '13px',
  color: brandColors.successGreen,
  fontWeight: 700,
};

const featuresList: React.CSSProperties = {
  margin: '0',
  paddingLeft: '18px',
  fontSize: '12px',
  color: brandColors.textPrimary,
  lineHeight: '1.7',
};

const featureItem: React.CSSProperties = {
  marginBottom: '4px',
};

export default PlanUpgradedEmail;
