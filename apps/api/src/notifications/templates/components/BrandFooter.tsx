import * as React from 'react';
import { brandColors } from '../BrandEmailLayout.js';
import { LINKEDIN_FALLBACK_LOGO, PRIMARY_LOGO_URL } from './BrandHeader.js';

interface BrandFooterProps {
  recipientName: string;
  recipientMeta?: string; // e.g. "@kelvinmaina01 · Admin @ codeward-"
  purposeText: string;
  isMandatoryTransactional?: boolean;
  unsubscribeUrl?: string;
  appUrl?: string;
  isNoReply?: boolean;
}

export const BrandFooter: React.FC<BrandFooterProps> = ({
  recipientName,
  recipientMeta,
  purposeText,
  isMandatoryTransactional = false,
  unsubscribeUrl,
  appUrl = 'https://codeward.cloud',
  isNoReply = true,
}) => {
  return (
    <div style={footerContainer}>
      {/* 1. Recipient Security Line */}
      <p style={recipientLine}>
        This email was intended for{' '}
        <strong style={strongRecipient}>{recipientName}</strong>
        {recipientMeta ? ` (${recipientMeta})` : ''}.<br />
        <a
          href={`${appUrl}/legal/security#email-verification`}
          style={learnWhyLink}
        >
          Learn why we included this.
        </a>
      </p>

      {/* 2. Contextual Purpose Line */}
      <p style={purposeLine}>
        {purposeText}
      </p>

      {/* 3. LinkedIn Blue Unmonitored Mailbox Notice */}
      {isNoReply && (
        <div style={noReplyBox}>
          <p style={noReplyText}>
            <span style={noReplyPrefix}>Please note:</span>{' '}
            This email was sent from an unmonitored notification address that cannot accept incoming replies.
            To get in touch, visit our{' '}
            <a href={`${appUrl}/docs`} style={blueLink}>
              Help Center
            </a>{' '}
            or contact{' '}
            <a href="mailto:support@codeward.cloud" style={blueLink}>
              support@codeward.cloud
            </a>.
          </p>
        </div>
      )}

      {/* 4. Action Links */}
      <p style={linksParagraph}>
        {isMandatoryTransactional ? (
          <>
            <a href={`${appUrl}/settings/notifications`} style={navLink}>
              Notification Settings
            </a>
            {' · '}
            <a href={`${appUrl}/docs`} style={navLink}>
              Help
            </a>
            {' · '}
            <a href="mailto:support@codeward.cloud" style={navLink}>
              Support
            </a>
          </>
        ) : (
          <>
            <a href={unsubscribeUrl || `${appUrl}/settings/notifications`} style={navLink}>
              Unsubscribe
            </a>
            {' · '}
            <a href={`${appUrl}/settings/notifications`} style={navLink}>
              Preferences
            </a>
            {' · '}
            <a href={`${appUrl}/docs`} style={navLink}>
              Help
            </a>
          </>
        )}
      </p>

      {/* 5. Social Links (LinkedIn Official Page) */}
      <div style={socialWrapper}>
        <a
          href="https://www.linkedin.com/company/get-codeward/"
          style={linkedinBadgeLink}
          title="Follow Codeward on LinkedIn"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src="https://img.icons8.com/color/48/linkedin.png"
            alt="LinkedIn"
            width="18"
            height="18"
            style={socialIcon}
          />
          <span style={linkedinBadgeText}>Follow Codeward on LinkedIn</span>
        </a>
      </div>

      {/* Direct Support Email Link */}
      <div style={supportLinkWrapper}>
        <p style={supportLinkParagraph}>
          Need assistance? Reach us directly at{' '}
          <a href="mailto:support@codeward.cloud" style={supportEmailLink}>
            support@codeward.cloud
          </a>
        </p>
      </div>

      {/* 6. Small Logo with LinkedIn Fallback */}
      <div style={logoWrapper}>
        <img
          src={PRIMARY_LOGO_URL}
          data-fallback-src={LINKEDIN_FALLBACK_LOGO}
          alt="Codeward"
          height="22"
          style={logoImg}
        />
      </div>

      {/* 6. Legal & Copyright (Omit physical address) */}
      <p style={copyrightLine}>
        © 2026 Codeward Cloud. All rights reserved.
      </p>
      <p style={trademarkLine}>
        Codeward and the Codeward Guardian logo are registered trademarks of Codeward.
      </p>
    </div>
  );
};

const footerContainer: React.CSSProperties = {
  marginTop: '36px',
  paddingTop: '24px',
  borderTop: `1px solid ${brandColors.cardBorder}`,
  textAlign: 'center',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  color: brandColors.textMuted,
  fontSize: '12px',
  lineHeight: '1.6',
};

const recipientLine: React.CSSProperties = {
  margin: '0 0 8px 0',
  color: brandColors.textSecondary,
  fontSize: '12px',
};

const strongRecipient: React.CSSProperties = {
  color: brandColors.textPrimary,
};

const learnWhyLink: React.CSSProperties = {
  color: brandColors.purpleAccent,
  textDecoration: 'underline',
  fontSize: '12px',
};

const purposeLine: React.CSSProperties = {
  margin: '0 0 16px 0',
  color: brandColors.textMuted,
  fontSize: '12px',
};

const noReplyBox: React.CSSProperties = {
  margin: '14px auto',
  maxWidth: '480px',
  padding: '10px 14px',
  backgroundColor: 'rgba(10, 102, 194, 0.07)',
  border: '1px solid rgba(10, 102, 194, 0.22)',
  borderRadius: '6px',
  textAlign: 'center',
};

const noReplyText: React.CSSProperties = {
  margin: '0',
  fontSize: '11px',
  lineHeight: '1.5',
  color: brandColors.textSecondary,
};

const noReplyPrefix: React.CSSProperties = {
  color: brandColors.noticeBlue,
  fontWeight: 700,
};

const blueLink: React.CSSProperties = {
  color: brandColors.noticeBlue,
  textDecoration: 'underline',
  fontWeight: 500,
};

const linksParagraph: React.CSSProperties = {
  margin: '0 0 20px 0',
  fontSize: '12px',
};

const navLink: React.CSSProperties = {
  color: brandColors.noticeBlue,
  textDecoration: 'underline',
  margin: '0 4px',
};

const socialWrapper: React.CSSProperties = {
  margin: '0 auto 16px auto',
  textAlign: 'center',
};

const linkedinBadgeLink: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 14px',
  backgroundColor: '#FFFFFF',
  border: '1px solid #E0DFDC',
  borderRadius: '20px',
  textDecoration: 'none',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
};

const socialIcon: React.CSSProperties = {
  display: 'inline-block',
  verticalAlign: 'middle',
  marginRight: '6px',
  border: '0',
};

const linkedinBadgeText: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: brandColors.noticeBlue,
  verticalAlign: 'middle',
};

const supportLinkWrapper: React.CSSProperties = {
  margin: '0 auto 16px auto',
  textAlign: 'center',
};

const supportLinkParagraph: React.CSSProperties = {
  margin: '0',
  fontSize: '12px',
  color: brandColors.textSecondary,
};

const supportEmailLink: React.CSSProperties = {
  color: brandColors.noticeBlue,
  fontWeight: 600,
  textDecoration: 'underline',
};

const logoWrapper: React.CSSProperties = {
  margin: '0 auto 12px auto',
  textAlign: 'center',
};

const logoImg: React.CSSProperties = {
  display: 'inline-block',
  border: '0',
  opacity: 0.85,
  verticalAlign: 'middle',
};

const copyrightLine: React.CSSProperties = {
  margin: '0 0 2px 0',
  color: '#9CA3AF',
  fontSize: '11px',
};

const trademarkLine: React.CSSProperties = {
  margin: '0',
  color: '#9CA3AF',
  fontSize: '11px',
};

export default BrandFooter;
