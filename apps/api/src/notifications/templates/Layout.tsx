import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface LayoutProps {
  previewText: string;
  children: React.ReactNode;
}

const baseUrl = 'https://codeward.io'; // Replace with actual production URL
// Use the exact logo from the Auth page
const logoUrl = 'https://raw.githubusercontent.com/kelvinmaina01/codeward-/main/apps/web/public/logo.png'; 

export const Layout: React.FC<LayoutProps> = ({ previewText, children }) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={logoUrl}
              width="180"
              alt="Codeward"
              style={logo}
            />
          </Section>
          
          <Section style={content}>
            {children}
          </Section>
          
          <Hr style={hr} />
          <Text style={footer}>
            Codeward AI — The Developer's Guardian
            <br />
            123 Secure Code Way, San Francisco, CA
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Brand Colors
export const colors = {
  bg: '#0f1117',
  bgContainer: '#161b27',
  text: '#e8e8e6',
  textMuted: '#aaaaaa',
  border: '#2a3040',
  blue: '#4B7BEC',
  green: '#22C55E',
  red: '#EF4444',
  orange: '#F59E0B',
  purple: '#8B5CF6',
  cream: '#F3F0EA',
};

const main = {
  backgroundColor: colors.bg,
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  margin: '0',
  padding: '40px 0',
};

const container = {
  backgroundColor: colors.bgContainer,
  border: `1px solid ${colors.border}`,
  borderRadius: '8px',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
};

const header = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logo = {
  margin: '0 auto',
  display: 'block',
};

const content = {
  color: colors.text,
};

const hr = {
  borderColor: colors.border,
  margin: '32px 0',
};

const footer = {
  color: colors.textMuted,
  fontSize: '12px',
  textAlign: 'center' as const,
  lineHeight: '1.5',
};
