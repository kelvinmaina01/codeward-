import * as React from 'react';
import { BrandEmailLayout, brandColors } from './BrandEmailLayout.js';
import { BrandHeader } from './components/BrandHeader.js';
import { BrandFooter } from './components/BrandFooter.js';
import { BrandButton } from './components/BrandButton.js';

interface WorkspaceRemovalEmailProps {
  toEmail: string;
  workspaceName: string;
  actorName: string;
  memberRole?: string;
  dashboardUrl: string;
}

export const WorkspaceRemovalEmail: React.FC<WorkspaceRemovalEmailProps> = ({
  toEmail,
  workspaceName,
  actorName,
  memberRole = 'member',
  dashboardUrl,
}) => {
  return (
    <BrandEmailLayout previewText={`Workspace Access Update: ${workspaceName}`}>
      {/* 1. Brand Header */}
      <BrandHeader
        headline="Workspace Membership Update"
        subtitle={`Access removed from ${workspaceName}`}
      />

      {/* 2. Message */}
      <div style={messageContainer}>
        <p style={leadParagraph}>
          Hello, this is to inform you that your access as a{' '}
          <strong style={{ color: brandColors.textPrimary, textTransform: 'capitalize' }}>{memberRole}</strong> to the{' '}
          <strong style={{ color: brandColors.textPrimary }}>{workspaceName}</strong> workspace on Codeward has been removed by{' '}
          <strong style={{ color: brandColors.textPrimary }}>{actorName}</strong>.
        </p>
      </div>

      {/* 3. Info Notice Card */}
      <div style={infoCard}>
        <div style={infoTitle}>What this means</div>
        <ul style={infoList}>
          <li style={infoItem}>
            You will no longer be able to access repositories, audits, or pull requests in <strong>{workspaceName}</strong>.
          </li>
          <li style={infoItem}>
            Your personal Codeward account and any other workspaces remain active and unaffected.
          </li>
          <li style={infoItem}>
            If you believe this was done in error, please contact your workspace administrator directly.
          </li>
        </ul>
      </div>

      {/* 4. Action Button */}
      <div style={{ margin: '26px 0 12px' }}>
        <BrandButton href={dashboardUrl}>
          Go to Your Dashboard →
        </BrandButton>
      </div>

      {/* 5. Brand Footer */}
      <BrandFooter
        recipientName={toEmail}
        purposeText="This essential security and access control notification was sent by Codeward."
        isMandatoryTransactional={true}
        appUrl={dashboardUrl}
      />
    </BrandEmailLayout>
  );
};

export default WorkspaceRemovalEmail;

// ─── STYLES ────────────────────────────────────────────────────────
const messageContainer: React.CSSProperties = {
  textAlign: 'left',
  margin: '12px 0 18px',
};

const leadParagraph: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: brandColors.textSecondary,
  margin: '0',
};

const infoCard: React.CSSProperties = {
  backgroundColor: '#FAF9FF',
  border: `1px solid ${brandColors.cardBorder}`,
  borderRadius: '10px',
  padding: '16px 20px',
  textAlign: 'left',
  margin: '18px 0',
};

const infoTitle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: brandColors.textPrimary,
  marginBottom: '8px',
};

const infoList: React.CSSProperties = {
  margin: '0',
  paddingLeft: '18px',
  color: brandColors.textSecondary,
  fontSize: '13px',
  lineHeight: '20px',
};

const infoItem: React.CSSProperties = {
  marginBottom: '6px',
};
