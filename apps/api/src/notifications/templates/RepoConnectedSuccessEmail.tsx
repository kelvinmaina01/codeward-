import * as React from 'react';
import { Button, Heading, Text, Section } from '@react-email/components';
import { Layout, colors } from './Layout.js';

interface RepoConnectedSuccessEmailProps {
  repoName: string;
  baselineScore: number;
  dashboardUrl: string;
}

export const RepoConnectedSuccessEmail: React.FC<RepoConnectedSuccessEmailProps> = ({
  repoName,
  baselineScore,
  dashboardUrl,
}) => {
  return (
    <Layout previewText={`Initial scan complete for ${repoName}`}>
      <Heading style={heading}>Repository Connected! 🚀</Heading>
      
      <Text style={text}>
        Your repository <strong>{repoName}</strong> has been successfully connected to Codeward. We have completed the Initial Deep Scan and established the baseline context for your agents.
      </Text>

      <Section style={scoreBox}>
        <Text style={scoreTitle}>Initial Security & Debt Score</Text>
        <Heading style={scoreValue}>{baselineScore}/100</Heading>
      </Section>

      <Text style={text}>
        From now on, Codeward will intercept all Pull Requests, run them in an isolated sandbox, and auto-fix security vulnerabilities and broken code before they ever reach production.
      </Text>

      <Button href={dashboardUrl} style={button}>
        View Full Dashboard
      </Button>
    </Layout>
  );
};

export default RepoConnectedSuccessEmail;

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: colors.green, // Green for success
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const text = {
  fontSize: '16px',
  color: colors.cream,
  lineHeight: '24px',
  marginBottom: '20px',
};

const scoreBox = {
  backgroundColor: 'rgba(34, 197, 94, 0.1)', // Light green bg
  border: `1px solid ${colors.green}`,
  padding: '24px',
  marginBottom: '24px',
  borderRadius: '8px',
  textAlign: 'center' as const,
};

const scoreTitle = {
  fontSize: '14px',
  color: colors.green,
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const scoreValue = {
  fontSize: '48px',
  color: colors.cream,
  margin: '10px 0 0 0',
};

const button = {
  backgroundColor: colors.green,
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px 0',
};
