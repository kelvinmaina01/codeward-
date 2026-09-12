import * as React from 'react';
import { BrandEmailLayout, brandColors } from './BrandEmailLayout.js';
import { BrandHeader } from './components/BrandHeader.js';
import { BrandFooter } from './components/BrandFooter.js';
import { BrandButton } from './components/BrandButton.js';
import { AgentMatrixTable, AgentTaskItem } from './components/AgentMatrixTable.js';
import { TerminalLogBox } from './components/TerminalLogBox.js';

export interface CriticalFindingItem {
  severity: string;
  category: string;
  title: string;
  file?: string;
  line?: number;
}

interface RunCompletedEmailProps {
  recipientName: string;
  recipientMeta?: string;
  repoName: string;
  prNumber?: number | null;
  prTitle?: string;
  commitSha: string;
  branch?: string;
  gateDecision: 'PASS' | 'WARN' | 'BLOCK';
  overallScore: number;
  tasks: AgentTaskItem[];
  criticalFindings?: CriticalFindingItem[];
  autoFixPrUrl?: string | null;
  logTail?: string;
  dashboardUrl: string;
  prGithubUrl?: string;
}

export const RunCompletedEmail: React.FC<RunCompletedEmailProps> = ({
  recipientName,
  recipientMeta,
  repoName,
  prNumber,
  prTitle,
  commitSha,
  branch = 'main',
  gateDecision,
  overallScore,
  tasks,
  criticalFindings = [],
  autoFixPrUrl,
  logTail,
  dashboardUrl,
  prGithubUrl,
}) => {
  const isPass = gateDecision === 'PASS';
  const isWarn = gateDecision === 'WARN';
  const isBlock = gateDecision === 'BLOCK';

  const decisionLabel = isPass
    ? 'GATE PASSED'
    : isWarn
    ? 'PASSED WITH WARNINGS'
    : 'GATE BLOCKED';

  const decisionColor = isPass
    ? brandColors.successGreen
    : isWarn
    ? brandColors.warningYellow
    : brandColors.dangerRed;

  const shortSha = commitSha.slice(0, 7);
  const prLabel = prNumber ? `PR #${prNumber}` : `Commit ${shortSha}`;

  return (
    <BrandEmailLayout previewText={`[${decisionLabel}] ${prLabel} on ${repoName} (Score: ${overallScore}/100)`}>
      {/* 1. Header with Logo, #020203 Headline, and Score Hero */}
      <BrandHeader
        headline={`${prLabel} Analysis Complete`}
        subtitle={`${repoName} · branch ${branch} · commit ${shortSha}`}
        heroStat={{
          value: `${overallScore}`,
          label: decisionLabel,
          valueColor: brandColors.textPrimary,
          labelColor: decisionColor,
        }}
      />

      {/* 2. Context Card */}
      {prTitle && (
        <div style={contextCard}>
          <p style={prTitleStyle}>
            <strong>Pull Request:</strong> {prTitle}
          </p>
        </div>
      )}

      {/* 3. The Multi-Agent Work Matrix Table */}
      <div style={sectionHeader}>
        <span style={sectionTitle}>Autonomous Agent Review Matrix</span>
      </div>
      <AgentMatrixTable tasks={tasks} />

      {/* 4. Critical Findings (if any) */}
      {criticalFindings.length > 0 && (
        <div style={findingsBox}>
          <h3 style={findingsBoxTitle}>
            ⚠️ Top Findings Requiring Attention ({criticalFindings.length})
          </h3>
          <ul style={findingsList}>
            {criticalFindings.slice(0, 3).map((f, i) => (
              <li key={i} style={findingItem}>
                <strong style={{ color: brandColors.dangerRed }}>[{f.severity.toUpperCase()}]</strong>{' '}
                <span style={{ color: brandColors.textPrimary, fontWeight: 600 }}>{f.title}</span>
                {f.file ? (
                  <div style={findingFileText}>
                    in <code>{f.file}{f.line ? `:${f.line}` : ''}</code>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Auto-Fix Remediation PR notice (if Guardian created one) */}
      {autoFixPrUrl && (
        <div style={autoFixCard}>
          <div style={autoFixTitle}>
            🤖 Codeward Guardian Auto-Fix Available
          </div>
          <p style={autoFixBody}>
            An automated remediation PR has been created to resolve blocking issues detected during this run.
          </p>
          <a href={autoFixPrUrl} style={autoFixLink}>
            Review Auto-Fix PR on GitHub →
          </a>
        </div>
      )}

      {/* 6. Execution Log Tail */}
      {logTail && (
        <TerminalLogBox
          logs={logTail}
          title="Sandbox Execution Console (Tail)"
          maxLines={12}
        />
      )}

      {/* 7. Primary Action Button (#FCE2BA Pill) */}
      <BrandButton href={dashboardUrl}>
        View Full Run Analysis & Sandboxes →
      </BrandButton>

      {/* Secondary GitHub PR link */}
      {prGithubUrl && (
        <div style={secondaryLinkWrapper}>
          <a href={prGithubUrl} style={secondaryLink}>
            Open {prLabel} on GitHub ↗
          </a>
        </div>
      )}

      {/* 8. Dynamic Footer */}
      <BrandFooter
        recipientName={recipientName}
        recipientMeta={recipientMeta}
        purposeText={`This is an automated code review report triggered by a pull request on ${repoName}.`}
        isMandatoryTransactional={false}
      />
    </BrandEmailLayout>
  );
};

const contextCard: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  border: `1px solid ${brandColors.cardBorder}`,
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '0 0 16px 0',
  textAlign: 'center',
};

const prTitleStyle: React.CSSProperties = {
  margin: '0',
  color: brandColors.textPrimary,
  fontSize: '13px',
};

const sectionHeader: React.CSSProperties = {
  textAlign: 'left',
  marginTop: '20px',
  marginBottom: '6px',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: brandColors.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const findingsBox: React.CSSProperties = {
  margin: '20px 0',
  padding: '16px',
  backgroundColor: 'rgba(239, 68, 68, 0.04)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  borderRadius: '8px',
  textAlign: 'left',
};

const findingsBoxTitle: React.CSSProperties = {
  margin: '0 0 10px 0',
  fontSize: '13px',
  color: brandColors.dangerRed,
  fontWeight: 700,
};

const findingsList: React.CSSProperties = {
  margin: '0',
  paddingLeft: '18px',
  color: brandColors.textPrimary,
  fontSize: '12px',
  lineHeight: '1.6',
};

const findingItem: React.CSSProperties = {
  marginBottom: '8px',
};

const findingFileText: React.CSSProperties = {
  fontSize: '11px',
  color: brandColors.textSecondary,
  marginTop: '2px',
};

const autoFixCard: React.CSSProperties = {
  margin: '20px 0',
  padding: '16px',
  backgroundColor: 'rgba(139, 92, 246, 0.06)',
  border: '1px solid rgba(139, 92, 246, 0.25)',
  borderRadius: '8px',
  textAlign: 'center',
};

const autoFixTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: brandColors.purpleAccent,
  marginBottom: '6px',
};

const autoFixBody: React.CSSProperties = {
  margin: '0 0 10px 0',
  fontSize: '12px',
  color: brandColors.textSecondary,
  lineHeight: '1.5',
};

const autoFixLink: React.CSSProperties = {
  color: brandColors.purpleAccent,
  fontWeight: 600,
  fontSize: '13px',
  textDecoration: 'underline',
};

const secondaryLinkWrapper: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '-12px',
  marginBottom: '20px',
};

const secondaryLink: React.CSSProperties = {
  color: brandColors.noticeBlue,
  fontSize: '13px',
  textDecoration: 'underline',
};

export default RunCompletedEmail;
