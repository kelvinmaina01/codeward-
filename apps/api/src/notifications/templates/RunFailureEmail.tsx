import * as React from 'react';
import { BrandEmailLayout, brandColors } from './BrandEmailLayout.js';
import { BrandHeader } from './components/BrandHeader.js';
import { BrandFooter } from './components/BrandFooter.js';
import { BrandButton } from './components/BrandButton.js';
import { TerminalLogBox } from './components/TerminalLogBox.js';

interface RunFailureEmailProps {
  recipientName?: string;
  repoName: string;
  agentId: string;
  runId: number;
  commitSha: string;
  errorMessage: string;
  logTail?: string;
  retryUrl: string;
}

export const RunFailureEmail: React.FC<RunFailureEmailProps> = ({
  recipientName = 'Developer',
  repoName,
  agentId,
  runId,
  commitSha,
  errorMessage,
  logTail,
  retryUrl,
}) => {
  const shortSha = commitSha ? commitSha.slice(0, 7) : 'latest';

  return (
    <BrandEmailLayout previewText={`[Action Required] Agent ${agentId} failed on ${repoName}`}>
      {/* 1. Header with Logo, #020203 Headline, and Error Stat */}
      <BrandHeader
        headline="Agent Execution Error"
        subtitle={`${repoName} · run #${runId} · commit ${shortSha}`}
        heroStat={{
          value: 'FAILED',
          label: `Agent: ${agentId}`,
          valueColor: brandColors.dangerRed,
          labelColor: brandColors.textSecondary,
        }}
      />

      {/* 2. Error Explanation */}
      <div style={messageBox}>
        <p style={leadText}>
          Hi <strong style={{ color: brandColors.textPrimary }}>{recipientName}</strong>,
        </p>
        <p style={bodyText}>
          Codeward automatically attempted to execute the <strong>{agentId}</strong> agent on your repository, but the execution encountered an unrecoverable runtime exception after retrying.
        </p>
      </div>

      {/* 3. Error Diagnostic Card */}
      <div style={errorCard}>
        <div style={errorCardHeader}>
          <strong>Exception Summary:</strong>
        </div>
        <p style={errorMessageText}>
          {errorMessage || 'Unknown execution failure.'}
        </p>
      </div>

      {/* 4. Terminal Log Box */}
      {logTail && (
        <TerminalLogBox
          logs={logTail}
          title="Sandbox Error Log (Tail)"
          maxLines={12}
        />
      )}

      {/* 5. Action Button (#FCE2BA Pill) */}
      <BrandButton href={retryUrl}>
        Retry Run in Clean Sandbox →
      </BrandButton>

      {/* 6. Dynamic Footer */}
      <BrandFooter
        recipientName={recipientName}
        purposeText={`This is a runtime alert regarding an agent failure on ${repoName}.`}
        isMandatoryTransactional={true}
      />
    </BrandEmailLayout>
  );
};

const messageBox: React.CSSProperties = {
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

const errorCard: React.CSSProperties = {
  margin: '20px 0',
  padding: '14px 16px',
  backgroundColor: 'rgba(239, 68, 68, 0.05)',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  borderRadius: '8px',
  textAlign: 'left',
};

const errorCardHeader: React.CSSProperties = {
  fontSize: '12px',
  color: brandColors.dangerRed,
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

const errorMessageText: React.CSSProperties = {
  margin: '0',
  fontSize: '13px',
  color: brandColors.textPrimary,
  fontFamily: 'monospace',
  lineHeight: '1.5',
};

export default RunFailureEmail;
