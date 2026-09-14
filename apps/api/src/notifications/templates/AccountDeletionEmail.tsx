import * as React from 'react';
import { BrandEmailLayout, brandColors } from './BrandEmailLayout.js';
import { BrandHeader } from './components/BrandHeader.js';
import { BrandFooter } from './components/BrandFooter.js';
import { BrandButton } from './components/BrandButton.js';

interface AccountDeletionEmailProps {
  userName: string;
  dataSummary: Record<string, number>;
}

export const AccountDeletionEmail: React.FC<AccountDeletionEmailProps> = ({
  userName,
  dataSummary = {},
}) => {
  const summaryEntries = Object.entries(dataSummary || {});

  return (
    <BrandEmailLayout previewText="Your Codeward account deletion is queued — 30-day compliance window active">
      {/* 1. Brand Header */}
      <BrandHeader
        headline="Account Deletion Queued"
        subtitle="Data purge scheduled · 30-day compliance retention window active"
        heroStat={{
          value: '30 DAYS',
          label: 'Safety Window Before Permanent Removal',
          valueColor: brandColors.dangerRed,
          labelColor: brandColors.textSecondary,
        }}
      />

      {/* 2. Personalized Message */}
      <div style={messageContainer}>
        <p style={leadText}>
          Hi <strong style={{ color: brandColors.textPrimary }}>{userName}</strong>,
        </p>
        <p style={bodyText}>
          We received your request to delete your Codeward account. In accordance with SOC 2 compliance and GDPR guidelines, all data associated with your account has been queued for permanent, irreversible removal.
        </p>
      </div>

      {/* 3. Minimalistic Vertical Table for Queued Deletions */}
      {summaryEntries.length > 0 && (
        <div style={tableWrapper}>
          <div style={tableHeaderLabel}>
            Items Queued for Deletion
          </div>
          <table
            width="100%"
            cellPadding="0"
            cellSpacing="0"
            border={0}
            style={minimalTable}
          >
            <tbody>
              {summaryEntries.map(([key, value], idx) => {
                const isLast = idx === summaryEntries.length - 1;
                return (
                  <tr key={key} style={tableRowStyle}>
                    <td
                      style={{
                        ...tdLabelStyle,
                        borderBottom: isLast ? 'none' : '1px solid #ECEAE6',
                      }}
                    >
                      <span style={labelDot}>•</span>
                      {key}
                    </td>
                    <td
                      style={{
                        ...tdValueStyle,
                        borderBottom: isLast ? 'none' : '1px solid #ECEAE6',
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Security Warning Callout */}
      <div style={warningBox}>
        <p style={warningTitle}>⚠️ Didn't request this deletion?</p>
        <p style={warningText}>
          This operation is permanent after the 30-day grace period. If you did not initiate this request, your account credentials may be compromised. Please cancel immediately or reach out to our security team.
        </p>
      </div>

      {/* 5. Action Button */}
      <BrandButton href="mailto:support@codeward.cloud?subject=URGENT%3A%20Cancel%20Account%20Deletion">
        Cancel Deletion & Contact Security →
      </BrandButton>

      {/* 6. Standard Footer */}
      <BrandFooter
        recipientName={userName}
        purposeText="This is a mandatory security and compliance notice regarding your Codeward account."
        isMandatoryTransactional={true}
      />
    </BrandEmailLayout>
  );
};

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

const tableWrapper: React.CSSProperties = {
  margin: '22px 0',
  textAlign: 'left',
};

const tableHeaderLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.6px',
  textTransform: 'uppercase',
  color: brandColors.textSecondary,
  marginBottom: '8px',
};

const minimalTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  borderTop: '1px solid #ECEAE6',
  borderBottom: '1px solid #ECEAE6',
};

const tableRowStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
};

const tdLabelStyle: React.CSSProperties = {
  padding: '11px 4px',
  fontSize: '13px',
  fontWeight: 600,
  color: brandColors.textPrimary,
  textAlign: 'left',
  verticalAlign: 'middle',
};

const tdValueStyle: React.CSSProperties = {
  padding: '11px 4px',
  fontSize: '13px',
  fontWeight: 700,
  color: brandColors.textPrimary,
  textAlign: 'right',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
};

const labelDot: React.CSSProperties = {
  color: brandColors.dangerRed,
  marginRight: '8px',
  fontWeight: 900,
};

const warningBox: React.CSSProperties = {
  margin: '22px 0',
  padding: '14px 16px',
  backgroundColor: 'rgba(239, 68, 68, 0.04)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  borderRadius: '8px',
  textAlign: 'left',
};

const warningTitle: React.CSSProperties = {
  margin: '0 0 4px 0',
  fontSize: '13px',
  color: brandColors.dangerRed,
  fontWeight: 700,
};

const warningText: React.CSSProperties = {
  margin: '0',
  fontSize: '12px',
  color: brandColors.textSecondary,
  lineHeight: '1.5',
};

export default AccountDeletionEmail;
