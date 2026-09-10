import { renderCoachingPrompt } from '../escalation/render-coaching-prompt.js';

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

export type EscalationReason =
  | 'NOT_ELIGIBLE'                  // category not in AUTO_FIX_ELIGIBLE_AGENTS
  | 'AUTOFIX_DISABLED_FOR_REPO'     // repoForClone.autoFixEnabled === false
  | 'AUTOFIX_ATTEMPTED_FAILED'      // openFixPR threw or applied zero fixes
  | 'AUTO_FIX_VERIFICATION_FAILED'  // tests/gates failed during verification of auto-fix
  | 'AUTO_FIX_CONFIDENCE_TOO_LOW'   // confidence below minimum threshold
  | 'SEVERITY_REQUIRES_MANUAL_REVIEW' // critical/high architecture or security finding requiring manual inspection
  | 'GUARDIAN_REJECTED'             // reviewFixPR came back negative
  | 'APPROVAL_EXPIRED';             // merge approval deadline passed with no action

export const ESCALATION_REASON_DESCRIPTIONS: Record<EscalationReason, (detail?: string | null) => string> = {
  NOT_ELIGIBLE: () => "This finding category isn't yet covered by Codeward's automatic-fix support.",
  AUTOFIX_DISABLED_FOR_REPO: () => "Auto-fix is currently disabled for this repository. Enable it in repo settings if you'd like Codeward to attempt fixes automatically.",
  AUTOFIX_ATTEMPTED_FAILED: (detail) => `Codeward attempted to generate an automatic fix but was unable to complete it. Details: ${detail || 'no further detail available'}`,
  AUTO_FIX_VERIFICATION_FAILED: (detail) => `Codeward generated an automated fix, but verification checks or tests failed. Details: ${detail || 'regression detected during dry-run'}`,
  AUTO_FIX_CONFIDENCE_TOO_LOW: (detail) => `Codeward identified a potential fix, but confidence was below the safety threshold. Details: ${detail || 'insufficient certainty to auto-commit'}`,
  SEVERITY_REQUIRES_MANUAL_REVIEW: (detail) => `This finding impacts critical architecture or security and requires human engineer review. Details: ${detail || 'manual validation mandated'}`,
  GUARDIAN_REJECTED: () => `Codeward generated a fix, but its own review agent flagged it as risky and did not merge it. See PR for details.`,
  APPROVAL_EXPIRED: () => `A fix was generated and reviewed, but the approval window passed without merge.`,
};

export function renderGuardianIssueBody(params: {
  finding: GuardianFindingView;
  runId: string | number;
  autoFixReason?: string | null;
  reason?: EscalationReason | null;
  reasonDetail?: string | null;
  fixPrUrl?: string | null;
}): string {
  const f = params.finding;
  const severity = String(f.severity).toUpperCase();
  const categoryStr = f.category ? esc(f.category) : 'Unknown';
  
  // Severity emoji map
  const severityEmojis: Record<string, string> = {
    CRITICAL: '🚨',
    HIGH: '🟠',
    MEDIUM: '🟡',
    LOW: '🔵',
    INFO: '⚪',
  };
  const icon = severityEmojis[severity] || '⚠️';

  // Determine reason text
  const baseDesc = params.reason && ESCALATION_REASON_DESCRIPTIONS[params.reason]
    ? ESCALATION_REASON_DESCRIPTIONS[params.reason](params.reasonDetail)
    : params.autoFixReason || 'No verified auto-fix PR covered this finding, or the category requires human validation.';

  const whyNotFixed = params.reasonDetail && !baseDesc.includes(params.reasonDetail)
    ? `${baseDesc}\n\n**Additional context:** ${params.reasonDetail}`
    : baseDesc;

  // Render the coaching prompt if we have a category and reason
  let coachingPromptSection = '';
  if (f.category && params.reason) {
    const promptText = renderCoachingPrompt({
      category: f.category,
      severity,
      location: f.file ? `${f.file}${f.line != null ? `:${f.line}` : ''}` : 'Unknown',
      description: f.description || f.title,
      rawEvidence: f.evidence || '',
      reason: params.reason,
      reasonDetail: params.reasonDetail,
      fixPrUrl: params.fixPrUrl,
    });

    coachingPromptSection = `
### 🤖 Fix this with your coding agent

Copy the prompt below into Claude Code, Cursor, or any coding agent with repo access:

<details>
<summary><strong>📋 Copy-paste fix prompt</strong></summary>

\`\`\`text
${promptText}
\`\`\`

</details>
`;
  }

  const lines = [
    `## ${icon} ${severity} · ${categoryStr}`,
    '',
    f.description ? f.description : f.title,
    '',
    '| | |',
    '|---|---|',
    `| **Agent** | \`${esc(f.agentId)}\` |`,
    `| **Run** | #${params.runId} |`,
    `| **Status** | 🔴 Escalated — needs manual review |`,
    '',
    '---',
    '',
    '### Why this needed a human',
    '',
    `> ${whyNotFixed.split('\n').join('\n> ')}`,
    '',
    '---',
    '',
    '### Details',
    '',
  ];

  if (f.file) {
    lines.push(`**Location**: \`${f.file}${f.line != null ? `:${f.line}` : ''}\``, '');
  }

  if (f.evidence) {
    lines.push(
      '<details>',
      '<summary><strong>🔍 Raw tool evidence</strong></summary>',
      '',
      '```text',
      f.evidence.slice(0, 2000), // increased slice a bit
      '```',
      '',
      '</details>',
      ''
    );
  }

  lines.push('---', '');

  if (f.suggestedFix) {
    lines.push(
      '### Suggested next step',
      '',
      f.suggestedFix,
      '',
      '---'
    );
  } else {
    // Generic next step
    lines.push(
      '### Suggested next step',
      '',
      'Review the finding details and either apply a fix manually, or close this issue if the finding is a false positive or intentionally accepted.',
      '',
      '---'
    );
  }

  if (coachingPromptSection) {
    lines.push(coachingPromptSection.trim(), '', '---', '');
  }

  lines.push(
    `<sub>🤖 Opened by [Codeward](https://github.com/apps/codeward-guardian) · Run #${params.runId}</sub>`
  );

  return lines.join('\n');
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
