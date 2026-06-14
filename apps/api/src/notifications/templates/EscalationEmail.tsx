import * as React from 'react';
import { Button, Heading, Text, Link, Container, Section } from '@react-email/components';
import { Layout, colors } from './Layout.js';

interface EscalationEmailProps {
  repoName: string;
  prNumber: number;
  prTitle: string;
  failingTestName: string;
  runId: string;
}

export const EscalationEmail: React.FC<EscalationEmailProps> = ({
  repoName,
  prNumber,
  prTitle,
  failingTestName,
  runId,
}) => {
  const dashboardUrl = `https://codeward.io/dashboard/${repoName}/runs/${runId}`;

  return (
    <Layout previewText={`Urgent: Manual review required for PR #${prNumber}`}>
      <Heading style={heading}>Manual Review Required 🚨</Heading>
      
      <Text style={text}>
        Codeward intercepted a pull request on <strong>{repoName}</strong> that introduces breaking changes, and the AI agent exhausted its retries attempting to auto-fix it.
      </Text>

      <Section style={alertBox}>
        <Text style={alertText}>
          <strong>PR:</strong> #{prNumber} - {prTitle}
        </Text>
        <Text style={alertText}>
          <strong>Blocker:</strong> {failingTestName}
        </Text>
      </Section>

      <Text style={text}>
        To prevent deploying broken code, this PR has been blocked. You can view the exact sandbox logs, diffs, and the agent's internal reasoning on the dashboard.
      </Text>

      <Button href={dashboardUrl} style={button}>
        View Sandbox Logs
      </Button>
      
      <Text style={subtext}>
        Prefer GitHub? We also opened an issue with the diffs attached. <Link href={`https://github.com/${repoName}/issues`} style={link}>View Issue ↗</Link>
      </Text>
    </Layout>
  );
};

export default EscalationEmail;

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: colors.red, // Orange/Red for critical alerts
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const text = {
  fontSize: '16px',
  color: colors.cream,
  lineHeight: '24px',
  marginBottom: '20px',
};

const subtext = {
  fontSize: '14px',
  color: colors.textMuted,
  textAlign: 'center' as const,
  marginTop: '24px',
};

const link = {
  color: colors.blue,
  textDecoration: 'none',
};

const alertBox = {
  backgroundColor: 'rgba(239, 68, 68, 0.1)', // Light red bg
  borderLeft: `4px solid ${colors.red}`,
  padding: '16px',
  marginBottom: '24px',
  borderRadius: '0 4px 4px 0',
};

const alertText = {
  fontSize: '14px',
  color: colors.cream,
  margin: '4px 0',
};

const button = {
  backgroundColor: colors.red,
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
