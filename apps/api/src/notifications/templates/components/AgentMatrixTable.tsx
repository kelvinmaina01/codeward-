import * as React from 'react';
import { brandColors } from '../BrandEmailLayout.js';

export interface AgentTaskItem {
  agentId: string;
  status: string; // 'completed' | 'failed' | 'running' | 'skipped'
  score?: number | null;
  findingsCount?: number | null;
  durationMs?: number | null;
}

interface AgentMatrixTableProps {
  tasks: AgentTaskItem[];
}

const agentLabels: Record<string, string> = {
  security: '🛡️ Security',
  architecture: '🏛️ Architecture',
  bloat: '🧹 Bloat & Debt',
  ai_era: '🤖 AI-Era Flaws',
  compliance: '⚖️ Compliance',
  data_dx: '📊 Data & DX',
  broken_code: '🔧 Broken Code',
  guardian: '🛡️ Guardian Gate',
  orchestrator: '🎯 Orchestrator',
};

export const AgentMatrixTable: React.FC<AgentMatrixTableProps> = ({ tasks }) => {
  if (!tasks || tasks.length === 0) return null;

  return (
    <div style={containerStyle}>
      <table
        width="100%"
        cellPadding="0"
        cellSpacing="0"
        border={0}
        style={tableStyle}
      >
        <thead>
          <tr style={tableHeaderRow}>
            <th style={thLeft}>Agent</th>
            <th style={thCenter}>Status</th>
            <th style={thCenter}>Score</th>
            <th style={thRight}>Duration</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, idx) => {
            const label = agentLabels[task.agentId] || `Agent (${task.agentId})`;
            const isLast = idx === tasks.length - 1;
            const isSuccess = task.status === 'completed';
            const isFail = task.status === 'failed';
            const durationSec = task.durationMs ? `${(task.durationMs / 1000).toFixed(1)}s` : '—';
            const scoreDisplay = task.score !== null && task.score !== undefined ? `${task.score}/100` : '—';

            return (
              <tr
                key={task.agentId}
                style={{
                  ...tableRow,
                  borderBottom: isLast ? 'none' : `1px solid ${brandColors.cardBorder}`,
                }}
              >
                <td style={tdLeft}>
                  <strong style={agentNameText}>{label}</strong>
                  {task.findingsCount ? (
                    <span style={findingsCountText}>
                      {' '}· {task.findingsCount} finding{task.findingsCount === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </td>
                <td style={tdCenter}>
                  <span
                    style={{
                      ...badgeBase,
                      backgroundColor: isSuccess
                        ? 'rgba(16, 185, 129, 0.12)'
                        : isFail
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(156, 163, 175, 0.12)',
                      color: isSuccess
                        ? brandColors.successGreen
                        : isFail
                        ? brandColors.dangerRed
                        : brandColors.textSecondary,
                      border: `1px solid ${
                        isSuccess
                          ? 'rgba(16, 185, 129, 0.25)'
                          : isFail
                          ? 'rgba(239, 68, 68, 0.25)'
                          : 'rgba(156, 163, 175, 0.25)'
                      }`,
                    }}
                  >
                    {task.status.toUpperCase()}
                  </span>
                </td>
                <td style={tdCenter}>
                  <span style={scoreText}>{scoreDisplay}</span>
                </td>
                <td style={tdRight}>
                  <span style={durationText}>{durationSec}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  margin: '22px 0',
  borderRadius: '8px',
  overflow: 'hidden',
  border: `1px solid ${brandColors.cardBorder}`,
  backgroundColor: '#FFFFFF',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const tableHeaderRow: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  borderBottom: `1px solid ${brandColors.cardBorder}`,
};

const thLeft: React.CSSProperties = {
  padding: '10px 12px',
  color: brandColors.textSecondary,
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  textAlign: 'left',
};

const thCenter: React.CSSProperties = {
  padding: '10px 12px',
  color: brandColors.textSecondary,
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  textAlign: 'center',
};

const thRight: React.CSSProperties = {
  padding: '10px 12px',
  color: brandColors.textSecondary,
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  textAlign: 'right',
};

const tableRow: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
};

const tdLeft: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  verticalAlign: 'middle',
};

const tdCenter: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'center',
  verticalAlign: 'middle',
};

const tdRight: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'right',
  verticalAlign: 'middle',
};

const agentNameText: React.CSSProperties = {
  color: brandColors.textPrimary,
  fontSize: '13px',
};

const findingsCountText: React.CSSProperties = {
  color: brandColors.textSecondary,
  fontSize: '11px',
};

const badgeBase: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.4px',
};

const scoreText: React.CSSProperties = {
  color: brandColors.textPrimary,
  fontSize: '12px',
  fontWeight: 600,
};

const durationText: React.CSSProperties = {
  color: brandColors.textSecondary,
  fontSize: '12px',
  fontFamily: 'monospace',
};

export default AgentMatrixTable;
