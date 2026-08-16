export interface GuardianFindingView {
  agentId: string;
  severity: string;
  title: string;
  file?: string | null;
  line?: number | null;
  category?: string | null;
  description?: string | null;
  evidence?: string | null;
  suggestedFix?: string | null;
  fixStatus?: 'fixed' | 'pr_opened' | 'escalated' | 'skipped' | 'suggested' | 'dismissed';
}

export interface GuardianCheckView {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  summary: string;
}

export interface GuardianAutoFixView {
  opened: boolean;
  pullRequestNumber?: number;
  htmlUrl?: string;
  branchName?: string;
  fixes?: Array<{ filePath: string; rationale: string; verificationMethod?: string | null }>;
  skipped?: Array<{ file: string; error: string }>;
  reason?: string;
  guardianReview?: { reviewed: boolean; event?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'; reason?: string };
}

export interface GuardianEscalationView {
  issues: Array<{ issueNumber: number; htmlUrl: string; title: string; agentId: string; file?: string | null }>;
  skippedCount?: number;
}

export interface GuardianRunView {
  repoFullName: string;
  runId: number | string;
  commitSha: string;
  gateDecision: 'APPROVE' | 'WARN' | 'BLOCK' | 'COMMENT' | string;
  summary: string;
  findings: GuardianFindingView[];
  checks: GuardianCheckView[];
  autoFixPR?: GuardianAutoFixView | null;
  escalation?: GuardianEscalationView | null;
  memoryUsed?: Array<{ writtenBy: string; summary: string; filePath?: string | null }>;
}

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };

function esc(s: unknown): string {
  return String(s ?? '').replace(/\|/g, '\\|').trim();
}

function shortSha(sha: string): string {
  return sha ? sha.slice(0, 7) : 'unknown';
}

function statusIcon(status: GuardianCheckView['status']): string {
  if (status === 'passed') return 'PASS';
  if (status === 'failed') return 'FAIL';
  return 'SKIP';
}

function reviewText(review?: GuardianAutoFixView['guardianReview']): string {
  if (!review) return 'Guardian review pending';
  if (!review.reviewed) return `Guardian review incomplete: ${review.reason ?? 'unknown reason'}`;
  return `Guardian verdict: ${review.event}`;
}

function topFindings(findings: GuardianFindingView[]): GuardianFindingView[] {
  return [...findings].sort((a, b) => {
    const sev = (SEVERITY_RANK[String(b.severity).toUpperCase()] ?? -1) - (SEVERITY_RANK[String(a.severity).toUpperCase()] ?? -1);
    return sev || a.title.localeCompare(b.title);
  }).slice(0, 10);
}

export function renderGuardianStatusComment(params: {
  repoFullName: string;
  commitSha: string;
  estimatedDurationSeconds: number;
}): string {
  return [
    '## Codeward is working',
    '',
    `Analyzing \`${params.repoFullName}@${shortSha(params.commitSha)}\` in an isolated sandbox.`,
    '',
    `Estimated time: ${params.estimatedDurationSeconds}s.`,
  ].join('\n');
}

export function renderGuardianInlineFindingComment(finding: GuardianFindingView): string {
  const lines = [
    `**${String(finding.severity).toUpperCase()} - ${finding.agentId}**`,
    '',
    finding.title,
  ];
  if (finding.evidence) lines.push('', `Evidence: ${finding.evidence.slice(0, 500)}`);
  if (finding.fixStatus) lines.push('', `Codeward action: ${finding.fixStatus}.`);
  if (finding.suggestedFix) lines.push('', `Fix path: ${finding.suggestedFix}`);
  return lines.join('\n');
}

export function renderGuardianIssueBody(params: {
  finding: GuardianFindingView;
  runId: string | number;
  autoFixReason?: string | null;
}): string {
  const f = params.finding;
  return [
    `## Codeward Escalation - ${String(f.severity).toUpperCase()}`,
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Agent | ${esc(f.agentId)} |`,
    `| Severity | ${esc(String(f.severity).toUpperCase())} |`,
    f.category ? `| Category | ${esc(f.category)} |` : '',
    f.file ? `| Location | \`${f.file}${f.line != null ? `:${f.line}` : ''}\` |` : '',
    `| Run | #${params.runId} |`,
    '',
    '### Finding',
    f.title,
    f.description ? `\n### Description\n${f.description}` : '',
    f.evidence ? `\n### Evidence\n\`\`\`\n${f.evidence.slice(0, 1000)}\n\`\`\`` : '',
    params.autoFixReason ? `\n### Why Codeward did not auto-fix\n${params.autoFixReason}` : '',
    f.suggestedFix ? `\n### Suggested manual fix\n${f.suggestedFix}` : '',
    '',
    '_Escalated by Codeward because the automated pipeline could not safely resolve this finding._',
  ].filter(Boolean).join('\n');
}

export function renderGuardianFinalReview(view: GuardianRunView): string {
  const counts = view.findings.reduce<Record<string, number>>((acc, f) => {
    const sev = String(f.severity || 'INFO').toUpperCase();
    acc[sev] = (acc[sev] ?? 0) + 1;
    return acc;
  }, {});
  const countText = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
    .filter((s) => counts[s])
    .map((s) => `${s}: ${counts[s]}`)
    .join(' | ') || 'No findings';

  const sections = [
    `## Codeward Guardian Review - ${view.gateDecision}`,
    '',
    `Run #${view.runId} on \`${view.repoFullName}@${shortSha(view.commitSha)}\`.`,
    '',
    view.summary,
    '',
    `**Finding summary**: ${countText}`,
  ];

  if (view.checks.length > 0) {
    sections.push('', '### Checks run', '', '| Status | Check | Result |', '| --- | --- | --- |');
    for (const check of view.checks) sections.push(`| ${statusIcon(check.status)} | ${esc(check.name)} | ${esc(check.summary)} |`);
  }

  if (view.autoFixPR) {
    sections.push('', '### Codeward action', '');
    if (view.autoFixPR.opened) {
      sections.push(`Opened auto-fix PR #${view.autoFixPR.pullRequestNumber}: ${view.autoFixPR.htmlUrl}`);
      sections.push(reviewText(view.autoFixPR.guardianReview));
      for (const fix of view.autoFixPR.fixes ?? []) {
        sections.push(`- \`${fix.filePath}\` - ${fix.rationale}${fix.verificationMethod ? ` (verified: ${fix.verificationMethod})` : ''}`);
      }
    } else {
      sections.push(`No auto-fix PR opened: ${view.autoFixPR.reason ?? 'no eligible verified fix'}`);
    }
    if ((view.autoFixPR.skipped ?? []).length > 0) {
      sections.push('', '<details><summary>Skipped fixes</summary>', '');
      for (const skipped of view.autoFixPR.skipped ?? []) sections.push(`- \`${skipped.file}\`: ${skipped.error}`);
      sections.push('', '</details>');
    }
  }

  if (view.escalation && view.escalation.issues.length > 0) {
    sections.push('', '### Escalated issues', '');
    for (const issue of view.escalation.issues) {
      sections.push(`- #${issue.issueNumber}: ${issue.title} (${issue.agentId}) - ${issue.htmlUrl}`);
    }
  }

  const visibleFindings = topFindings(view.findings);
  if (visibleFindings.length > 0) {
    sections.push('', '### Findings', '');
    for (const f of visibleFindings) {
      const location = f.file ? ` - \`${f.file}${f.line != null ? `:${f.line}` : ''}\`` : '';
      sections.push(`- **${String(f.severity).toUpperCase()}** ${f.title} (${f.agentId})${location}`);
    }
  }

  if ((view.memoryUsed ?? []).length > 0) {
    sections.push('', '<details><summary>Context used</summary>', '');
    for (const memory of view.memoryUsed ?? []) {
      sections.push(`- ${memory.writtenBy}${memory.filePath ? ` - \`${memory.filePath}\`` : ''}: ${memory.summary}`);
    }
    sections.push('', '</details>');
  }

  return sections.join('\n');
}
