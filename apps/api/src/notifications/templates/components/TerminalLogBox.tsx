import * as React from 'react';

interface TerminalLogBoxProps {
  logs: string;
  title?: string;
  maxLines?: number;
}

export function sanitizeTerminalLogs(raw: string, maxLines: number = 14): string {
  if (!raw || typeof raw !== 'string') {
    return 'No runtime logs available for this execution.';
  }

  // 1. Strip terminal ANSI color sequences
  const stripped = raw.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );

  // 2. Mask sensitive tokens or private keys if present in logs
  const redacted = stripped
    .replace(/(bearer\s+)[A-Za-z0-9_\-\.]{20,}/gi, '$1[REDACTED_TOKEN]')
    .replace(/(ghp_[A-Za-z0-9]{36})/g, '[REDACTED_GITHUB_KEY]')
    .replace(/(sk_[A-Za-z0-9]{24,})/g, '[REDACTED_API_KEY]');

  // 3. Slice to last N lines
  const lines = redacted.trim().split('\n');
  const slice = lines.slice(-maxLines);

  return slice.join('\n');
}

export const TerminalLogBox: React.FC<TerminalLogBoxProps> = ({
  logs,
  title = 'Runtime Sandbox Log Snapshot',
  maxLines = 14,
}) => {
  const displayLogs = sanitizeTerminalLogs(logs, maxLines);

  return (
    <div style={terminalContainer}>
      {/* Title bar with dots */}
      <div style={terminalHeader}>
        <div style={dotsWrapper}>
          <span style={{ ...dot, backgroundColor: '#EF4444' }} />
          <span style={{ ...dot, backgroundColor: '#F59E0B' }} />
          <span style={{ ...dot, backgroundColor: '#10B981' }} />
        </div>
        <span style={terminalTitleText}>{title}</span>
      </div>

      {/* Code body */}
      <div style={terminalBody}>
        <pre style={preText}>{displayLogs}</pre>
      </div>
    </div>
  );
};

const terminalContainer: React.CSSProperties = {
  margin: '20px 0',
  borderRadius: '8px',
  overflow: 'hidden',
  border: '1px solid #1F2937',
  backgroundColor: '#07080C',
  textAlign: 'left',
};

const terminalHeader: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#111827',
  borderBottom: '1px solid #1F2937',
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
};

const dotsWrapper: React.CSSProperties = {
  display: 'inline-block',
  verticalAlign: 'middle',
};

const dot: React.CSSProperties = {
  display: 'inline-block',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  marginRight: '6px',
};

const terminalTitleText: React.CSSProperties = {
  fontSize: '11px',
  color: '#9CA3AF',
  fontFamily: 'monospace',
  marginLeft: '8px',
  display: 'inline-block',
};

const terminalBody: React.CSSProperties = {
  padding: '14px 16px',
  overflowX: 'auto',
};

const preText: React.CSSProperties = {
  margin: '0',
  fontFamily: '"JetBrains Mono", "SF Mono", Consolas, "Fira Code", monospace',
  fontSize: '11px',
  lineHeight: '1.6',
  color: '#D1D5DB',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

export default TerminalLogBox;
