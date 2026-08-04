import * as React from 'react';
import { Button, Heading, Text, Section, Row, Column } from '@react-email/components';
import { Layout, colors } from './Layout.js';

interface WelcomeVerificationEmailProps {
  userName: string;
  verificationLink: string;
  isOAuth?: boolean; // If true, they logged in via GitHub and don't need email verification
}

export const WelcomeVerificationEmail: React.FC<WelcomeVerificationEmailProps> = ({
  userName,
  verificationLink,
  isOAuth = false,
}) => {
  return (
    <Layout previewText={`Welcome to Codeward, ${userName}!`}>
      <Heading style={heading}>
        Welcome to Codeward.<br />Your AI Principal Engineer is Ready.
      </Heading>
      
      <Text style={text}>
        Hi {userName},
      </Text>
      
      <Text style={text}>
        You are seconds away from unleashing the most advanced, multi-agent code review engine on your pull requests. Codeward isn't a simple linter—it's a <strong>full testing and security engine</strong> that runs directly on your commits.
      </Text>

      <Section style={pillarsSection}>
        <Row style={pillarRow}>
          <Column style={pillarEmoji}>🛡️</Column>
          <Column>
            <Text style={pillarTitle}>Unmatched Security</Text>
            <Text style={pillarDescription}>Catch 18+ critical vulnerabilities, including AI-era flaws, prompt injections, and database RLS gaps.</Text>
          </Column>
        </Row>
        <Row style={pillarRow}>
          <Column style={pillarEmoji}>🚀</Column>
          <Column>
            <Text style={pillarTitle}>Zero Bloat</Text>
            <Text style={pillarDescription}>Automatically detect semantic duplicates, dead code, and God files via deep AST scanning.</Text>
          </Column>
        </Row>
        <Row style={pillarRow}>
          <Column style={pillarEmoji}>🔬</Column>
          <Column>
            <Text style={pillarTitle}>Flawless Execution</Text>
            <Text style={pillarDescription}>We run your code in a Firecracker microVM to detect memory leaks and race conditions before production.</Text>
          </Column>
        </Row>
      </Section>

      <Section style={terminalSection}>
        <Text style={terminalText}>
          <span style={{ color: colors.blue }}>{'>'}</span> codeward analyze --commit 4f2a8c1<br />
          <span style={{ color: colors.green }}>[✓]</span> Firecracker sandbox booted (125ms)<br />
          <span style={{ color: colors.green }}>[✓]</span> 8 Agents running in parallel...<br />
          <span style={{ color: colors.red }}>[!]</span> Security Agent caught 1 Critical SQLi<br />
          <span style={{ color: colors.green }}>[✓]</span> Merge blocked. Fix suggestion posted to PR.
        </Text>
      </Section>

      <Text style={text}>
        To get started, please {isOAuth ? 'connect your first repository' : 'verify your email address'} below:
      </Text>

      <Button href={verificationLink} style={button}>
        {isOAuth ? 'Connect Your First Repository' : 'Verify Email Address'}
      </Button>
      
      <Text style={subtext}>
        If you didn't request this email, you can safely ignore it.
      </Text>
    </Layout>
  );
};

export default WelcomeVerificationEmail;

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#ffffff',
  textAlign: 'center' as const,
  marginBottom: '32px',
  lineHeight: '1.3',
};

const text = {
  fontSize: '16px',
  color: colors.cream,
  lineHeight: '24px',
  marginBottom: '20px',
};

const pillarsSection = {
  marginBottom: '32px',
  padding: '24px',
  backgroundColor: '#1c2130',
  borderRadius: '8px',
  border: `1px solid ${colors.border}`,
};

const pillarRow = {
  marginBottom: '16px',
};

const pillarEmoji = {
  width: '32px',
  fontSize: '20px',
  verticalAlign: 'top' as const,
};

const pillarTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#ffffff',
  margin: '0 0 4px 0',
};

const pillarDescription = {
  fontSize: '14px',
  color: colors.textMuted,
  margin: '0',
  lineHeight: '1.4',
};

const terminalSection = {
  backgroundColor: '#000000',
  padding: '16px',
  borderRadius: '6px',
  border: '1px solid #333333',
  marginBottom: '32px',
};

const terminalText = {
  fontFamily: 'monospace, "Courier New", Courier',
  fontSize: '13px',
  color: '#c9d1d9',
  margin: '0',
  lineHeight: '1.6',
};

const subtext = {
  fontSize: '14px',
  color: colors.textMuted,
  textAlign: 'center' as const,
  marginTop: '32px',
};

const button = {
  backgroundColor: colors.blue,
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '14px 0',
  border: '1px solid #3a63cc',
};
