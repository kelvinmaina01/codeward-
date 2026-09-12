import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from '@react-email/components';

interface BrandEmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export const brandColors = {
  canvasBg: '#F3F2EF',       // LinkedIn-style warm light gray canvas
  cardBg: '#FFFFFF',         // Clean white card container
  cardBorder: '#E0DFDC',     // Subtle border
  textPrimary: '#020203',    // Ultra-crisp near black
  textSecondary: '#4B5563',  // Subdued gray
  textMuted: '#6B7280',      // Muted footer text
  ctaPillBg: '#FCE2BA',      // User's requested warm peach/cream CTA button
  ctaPillText: '#040407',    // User's requested dark text for CTA
  noticeBlue: '#0A66C2',     // Official LinkedIn blue for notices & unmonitored mailbox
  successGreen: '#10B981',
  warningYellow: '#F59E0B',
  dangerRed: '#EF4444',
  purpleAccent: '#8B5CF6',
};

export const BrandEmailLayout: React.FC<BrandEmailLayoutProps> = ({
  previewText,
  children,
}) => {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={mainBody}>
        <Container style={outerContainer}>
          <Section style={whiteCard}>
            {children}
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const mainBody: React.CSSProperties = {
  backgroundColor: brandColors.canvasBg,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: '0',
  padding: '36px 0',
  WebkitFontSmoothing: 'antialiased',
};

const outerContainer: React.CSSProperties = {
  margin: '0 auto',
  maxWidth: '600px',
  width: '100%',
  padding: '0 12px',
};

const whiteCard: React.CSSProperties = {
  backgroundColor: brandColors.cardBg,
  border: `1px solid ${brandColors.cardBorder}`,
  borderRadius: '12px',
  padding: '36px 28px',
  textAlign: 'center',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
};

export default BrandEmailLayout;
