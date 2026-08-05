import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Heading,
  Hr,
  Img,
  Preview,
} from '@react-email/components';

interface RunFailureEmailProps {
  repoName: string;
  agentId: string;
  runId: number;
  commitSha: string;
  errorMessage: string;
  logTail?: string;
  retryUrl: string;
}

export const RunFailureEmail: React.FC<RunFailureEmailProps> = ({
  repoName,
  agentId,
  runId,
  commitSha,
  errorMessage,
  logTail,
  retryUrl,
}) => {
  return (
    <Html>
      <Head />
      <Preview>Agent {agentId} failed on {repoName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://i.postimg.cc/Jh77M5j8/kelvin-bot.png"
              width="48"
              height="48"
              alt="Codeward Logo"
              style={logo}
            />
            <div style={badge}>Run Failed After Exhausting Retries</div>
            <Heading style={h1}>Your agent run hit a wall</Heading>
            <Text style={subtitle}>
              We automatically retried this run but the sandbox encountered an unrecoverable error. Here's what happened.
            </Text>
          </Section>
          
          <Section style={content}>
            <Text style={sectionTitle}>Run Details</Text>
            <div style={card}>
              <div style={row}>
                <span style={label}>Agent</span>
                <span style={value}>{agentId}</span>
              </div>
              <div style={row}>
                <span style={label}>Project</span>
                <span style={value}>{repoName}</span>
              </div>
              <div style={row}>
                <span style={label}>Commit</span>
                <span style={{ ...value, ...code }}>{commitSha.substring(0, 7)}</span>
              </div>
              <div style={row}>
                <span style={label}>Run ID</span>
                <span style={{ ...value, ...code }}>run_{runId}</span>
              </div>
              <div style={row}>
                <span style={label}>Root Cause</span>
                <span style={{ ...value, ...error }}>{errorMessage}</span>
              </div>
            </div>

            {logTail && (
              <>
                <Text style={sectionTitle}>Last Logs Recorded</Text>
                <div style={terminal}>
                  <div style={terminalHeader}>
                    <div style={{ ...terminalDot, backgroundColor: '#ff5f56' }} />
                    <div style={{ ...terminalDot, backgroundColor: '#ffbd2e' }} />
                    <div style={{ ...terminalDot, backgroundColor: '#27c93f' }} />
                    <span style={terminalTitle}>sandbox — execution</span>
                  </div>
                  <div style={terminalBody}>
                    <pre style={logPre}>{logTail}</pre>
                  </div>
                </div>
              </>
            )}

            <Section style={buttonContainer}>
              <Button style={buttonPrimary} href={retryUrl}>
                View Logs & Retry
              </Button>
            </Section>
          </Section>
          
          <Hr style={hr} />
          
          <Text style={footer}>
            Codeward, Inc. • You are receiving this because you are an admin of {repoName}.
            <br />
            Need help? Check our Docs or contact support.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#0f0f13',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  padding: '40px 16px',
};

const container = {
  backgroundColor: '#16161e',
  margin: '0 auto',
  borderRadius: '16px',
  overflow: 'hidden',
  border: '1px solid #23232d',
  maxWidth: '640px',
};

const header = {
  background: 'linear-gradient(135deg, #1a1a24 0%, #0f0f13 100%)',
  padding: '40px 32px 32px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #23232d',
};

const logo = {
  margin: '0 auto 20px',
  borderRadius: '8px',
};

const badge = {
  display: 'inline-block',
  background: 'rgba(239, 68, 68, 0.12)',
  color: '#ef4444',
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  padding: '6px 14px',
  borderRadius: '999px',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  marginBottom: '20px',
};

const h1 = {
  color: '#f0f0f5',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 8px',
  lineHeight: '1.3',
};

const subtitle = {
  color: '#8b8b9a',
  fontSize: '15px',
  margin: '0',
  lineHeight: '1.6',
};

const content = {
  padding: '32px',
};

const sectionTitle = {
  color: '#a0a0b0',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  margin: '0 0 12px',
};

const card = {
  background: '#1e1e28',
  borderRadius: '12px',
  padding: '20px',
  border: '1px solid #2a2a38',
  marginBottom: '28px',
};

const row = {
  display: 'block',
  width: '100%',
  marginBottom: '14px',
};

const label = {
  display: 'inline-block',
  color: '#6e6e80',
  fontSize: '13px',
  width: '120px',
  verticalAlign: 'top',
};

const value = {
  display: 'inline-block',
  color: '#e0e0ea',
  fontSize: '13px',
  fontWeight: '500',
  verticalAlign: 'top',
  maxWidth: '380px',
};

const code = {
  fontFamily: 'monospace',
  background: '#15151c',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  color: '#a5b4fc',
};

const error = {
  color: '#f87171',
};

const terminal = {
  background: '#0d0d12',
  borderRadius: '10px',
  border: '1px solid #23232d',
  overflow: 'hidden',
  marginBottom: '28px',
};

const terminalHeader = {
  background: '#15151c',
  padding: '10px 16px',
  borderBottom: '1px solid #23232d',
};

const terminalDot = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  display: 'inline-block',
  marginRight: '8px',
};

const terminalTitle = {
  color: '#6e6e80',
  fontSize: '11px',
  fontFamily: 'monospace',
  marginLeft: '4px',
};

const terminalBody = {
  padding: '16px',
};

const logPre = {
  color: '#a0a0b0',
  fontFamily: 'monospace',
  fontSize: '12px',
  lineHeight: '1.7',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-all' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  padding: '8px 0 16px',
};

const buttonPrimary = {
  background: '#6366f1',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
};

const hr = {
  borderColor: '#23232d',
  margin: '0',
};

const footer = {
  padding: '24px 32px',
  textAlign: 'center' as const,
  color: '#4b4b5a',
  fontSize: '12px',
  lineHeight: '18px',
};
