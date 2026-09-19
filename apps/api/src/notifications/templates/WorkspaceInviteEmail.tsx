import * as React from 'react';
import { BrandEmailLayout, brandColors } from './BrandEmailLayout.js';
import { BrandHeader } from './components/BrandHeader.js';
import { BrandFooter } from './components/BrandFooter.js';
import { BrandButton } from './components/BrandButton.js';

interface WorkspaceMember {
  name: string;
  role: string;
  image: string | null;
}

interface WorkspaceInviteEmailProps {
  toEmail: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  magicLink: string;
  existingMembers?: WorkspaceMember[];
}

export const WorkspaceInviteEmail: React.FC<WorkspaceInviteEmailProps> = ({
  toEmail,
  workspaceName,
  inviterName,
  role,
  magicLink,
  existingMembers = [],
}) => {
  const roleDescriptions: Record<string, string[]> = {
    owner: [
      'Full access to workspace settings',
      'Can invite and remove members',
      'Manage billing and subscriptions',
      'Full access to AI and repositories',
    ],
    admin: [
      'Can invite members',
      'Can edit workspace settings',
      'Full access to AI and repositories',
      'Cannot delete workspace',
    ],
    developer: [
      'Can connect code repositories',
      'Can interact with AI agents',
      'Cannot invite members',
      'Read-only access to settings',
    ],
    member: [
      'Read-only access to workspace activity',
      'Can view connected repositories',
      'Cannot interact with AI',
      'Cannot invite members',
    ],
    viewer: [
      'Read-only access to workspace activity',
      'Can view connected repositories',
      'Cannot interact with AI',
      'Cannot invite members',
    ],
  };

  const permissions = roleDescriptions[role.toLowerCase()] || roleDescriptions.member;

  return (
    <BrandEmailLayout previewText={`${inviterName} invited you to join ${workspaceName} on Codeward`}>
      {/* 1. Header with Logo & Headline */}
      <BrandHeader
        headline="Workspace Invitation"
        subtitle={`Collaborate with ${inviterName} in the ${workspaceName} workspace`}
      />

      {/* 2. Invitation Message */}
      <div style={messageContainer}>
        <p style={leadParagraph}>
          <strong style={{ color: brandColors.textPrimary }}>{inviterName}</strong> has invited you to join the{' '}
          <strong style={{ color: brandColors.textPrimary }}>{workspaceName}</strong> workspace on Codeward as a{' '}
          <strong style={{ color: brandColors.noticeBlue, textTransform: 'capitalize' }}>{role}</strong>.
        </p>
      </div>

      {/* 3. Role Permissions Card */}
      <div style={permissionsCard}>
        <div style={permissionsTitle}>Your Role Permissions ({role})</div>
        <ul style={permissionsList}>
          {permissions.map((p, idx) => (
            <li key={idx} style={permissionItem}>
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* 4. CTA Button (#FCE2BA Pill) */}
      <div style={{ margin: '28px 0 10px' }}>
        <BrandButton href={magicLink}>
          Join Workspace →
        </BrandButton>
        <p style={expiryNotice}>This invitation link will expire in 7 days.</p>
      </div>

      {/* 5. Existing Workspace Members Table */}
      {existingMembers.length > 0 && (
        <div style={membersSection}>
          <h3 style={membersTitle}>Current Workspace Members ({existingMembers.length})</h3>
          <table style={membersTable}>
            <thead>
              <tr style={tableHeaderRow}>
                <th style={tableHeaderCell}>Member</th>
                <th style={tableHeaderCell}>Role</th>
              </tr>
            </thead>
            <tbody>
              {existingMembers.map((m, idx) => (
                <tr key={idx} style={tableRow}>
                  <td style={memberCell}>
                    <div style={avatarCircle}>
                      {m.image ? (
                        <img src={m.image} alt={m.name} style={avatarImg} />
                      ) : (
                        m.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span style={memberName}>{m.name}</span>
                  </td>
                  <td style={roleCell}>{m.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Compliant Brand Footer */}
      <BrandFooter
        recipientName={toEmail}
        purposeText={`You received this invitation because ${inviterName} added you to ${workspaceName} on Codeward.`}
        isMandatoryTransactional={true}
        appUrl="https://www.codeward.cloud"
      />
    </BrandEmailLayout>
  );
};

export default WorkspaceInviteEmail;

// ─── STYLES ────────────────────────────────────────────────────────
const messageContainer: React.CSSProperties = {
  textAlign: 'left',
  margin: '12px 0 20px',
};

const leadParagraph: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: brandColors.textSecondary,
  margin: '0',
};

const permissionsCard: React.CSSProperties = {
  backgroundColor: '#FAF9FF',
  border: `1px solid ${brandColors.cardBorder}`,
  borderRadius: '10px',
  padding: '16px 20px',
  textAlign: 'left',
  margin: '18px 0',
};

const permissionsTitle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: brandColors.purpleAccent,
  marginBottom: '10px',
};

const permissionsList: React.CSSProperties = {
  margin: '0',
  paddingLeft: '18px',
  color: brandColors.textSecondary,
  fontSize: '13px',
  lineHeight: '20px',
};

const permissionItem: React.CSSProperties = {
  marginBottom: '6px',
};

const expiryNotice: React.CSSProperties = {
  color: brandColors.textMuted,
  fontSize: '12px',
  marginTop: '8px',
  textAlign: 'center',
};

const membersSection: React.CSSProperties = {
  marginTop: '28px',
  paddingTop: '20px',
  borderTop: `1px solid ${brandColors.cardBorder}`,
  textAlign: 'left',
};

const membersTitle: React.CSSProperties = {
  color: brandColors.textPrimary,
  fontSize: '13px',
  fontWeight: '700',
  margin: '0 0 12px 0',
};

const membersTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const tableHeaderRow: React.CSSProperties = {
  borderBottom: `1px solid ${brandColors.cardBorder}`,
};

const tableHeaderCell: React.CSSProperties = {
  padding: '8px 4px',
  color: brandColors.textMuted,
  fontSize: '11px',
  textTransform: 'uppercase',
  fontWeight: 600,
  textAlign: 'left',
};

const tableRow: React.CSSProperties = {
  borderBottom: '1px solid #F3F4F6',
};

const memberCell: React.CSSProperties = {
  padding: '10px 4px',
  verticalAlign: 'middle',
};

const avatarCircle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  backgroundColor: '#E5E7EB',
  display: 'inline-block',
  textAlign: 'center',
  lineHeight: '24px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#374151',
  overflow: 'hidden',
  verticalAlign: 'middle',
  marginRight: '8px',
};

const avatarImg: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const memberName: React.CSSProperties = {
  color: brandColors.textPrimary,
  fontSize: '13px',
  fontWeight: 500,
  verticalAlign: 'middle',
};

const roleCell: React.CSSProperties = {
  padding: '10px 4px',
  color: brandColors.textMuted,
  fontSize: '12px',
  textTransform: 'capitalize',
  verticalAlign: 'middle',
  textAlign: 'left',
};
