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

export const SPECIALIZED_AGENTS: Record<string, { name: string; domain: string; focus: string }> = {
  security: {
    name: '🛡️ Runtime Security',
    domain: 'OWASP & AppSec',
    focus: 'SQLi, broken auth/RLS, secret leaks & vulnerability vectors',
  },
  architecture: {
    name: '🏛️ Architecture',
    domain: 'System Design',
    focus: 'Circular dependencies, architectural drift & module coupling',
  },
  bloat: {
    name: '📦 Bloat & Dead Code',
    domain: 'Code Health',
    focus: 'Zombie exports, bundle overhead & unused packages',
  },
  data_dx: {
    name: '⚡ Data & DX',
    domain: 'Database & Queries',
    focus: 'Schema migrations, index efficiency & query antipatterns',
  },
  ai_era: {
    name: '🧠 AI-Era Safety',
    domain: 'LLM & Prompts',
    focus: 'Prompt injection, model leakage & RAG hygiene',
  },
  broken_code: {
    name: '🩺 Bug Detection',
    domain: 'Reliability',
    focus: 'Null dereferences, unhandled promises & runtime bugs',
  },
  compliance: {
    name: '⚖️ Compliance',
    domain: 'Governance',
    focus: 'License compatibility, PII handling & audit trails',
  },
  guardian: {
    name: '💂 Guardian',
    domain: 'Orchestrator',
    focus: 'Verification in sandbox, auto-fix dry-runs & merge verdict',
  },
};

export function resolveDispatchedAgents(agentsConfig?: Record<string, any>, dispatchedAgentIds?: string[]) {
  if (dispatchedAgentIds && dispatchedAgentIds.length > 0) {
    const list = dispatchedAgentIds.map(id => ({
      id,
      ...(SPECIALIZED_AGENTS[id] || { name: `🤖 ${id}`, domain: 'Specialized', focus: 'Custom checks' }),
    }));
    if (!list.some(a => a.id === 'guardian')) {
      list.push({ id: 'guardian', ...SPECIALIZED_AGENTS.guardian });
    }
    return list;
  }

  if (agentsConfig && typeof agentsConfig === 'object') {
    const activeKeys = Object.keys(agentsConfig).filter(k => Boolean(agentsConfig[k]));
    if (activeKeys.length > 0) {
      const list = activeKeys.map(id => ({
        id,
        ...(SPECIALIZED_AGENTS[id] || { name: `🤖 ${id}`, domain: 'Specialized', focus: 'Custom checks' }),
      }));
      if (!list.some(a => a.id === 'guardian')) {
        list.push({ id: 'guardian', ...SPECIALIZED_AGENTS.guardian });
      }
      return list;
    }
  }

  // Default fleet
  return Object.entries(SPECIALIZED_AGENTS).map(([id, meta]) => ({ id, ...meta }));
}

export function renderGuardianStatusComment(params: {
  repoFullName: string;
  commitSha: string;
  estimatedDurationSeconds: number;
  runId?: number | string;
  agentsConfig?: Record<string, any>;
  dispatchedAgentIds?: string[];
}): string {
  const runUrl = `${process.env.FRONTEND_URL || 'https://codeward.cloud'}/runs/${params.runId ?? 'pending'}`;
  const activeAgents = resolveDispatchedAgents(params.agentsConfig, params.dispatchedAgentIds);
  const count = activeAgents.length;
  const estMin = Math.max(1, Math.round(params.estimatedDurationSeconds / 60));

  const tableRows = activeAgents.map(a => {
    const status = a.id === 'guardian' ? '⏳ Waiting for signals' : '🔄 Analyzing in sandbox';
    return `| **${a.name}** | ${a.domain} | ${a.focus} | ${status} |`;
  }).join('\n');

  return [
    `### 🛡️ Codeward Autonomous Code Review Dispatched`,
    '',
    `Codeward received this pull request and initialized an isolated **Firecracker microVM sandbox** for comprehensive multi-agent analysis on \`${params.repoFullName}@${shortSha(params.commitSha)}\`.`,
    '',
    `#### 🤖 ${count} Dispatched Specialized Agents`,
    '| Agent | Domain | Focus Area | Status |',
    '| :--- | :--- | :--- | :--- |',
    tableRows,
    '',
    '> ☕ **Please be patient while our agents do the heavy lifting.**',
    `> Unlike traditional superficial linters, Codeward executes real static & dynamic checks and dry-runs potential fixes in an isolated sandbox. Analysis typically takes **~${estMin} minutes**.`,
    '',
    `📡 [**Track Live Sandbox Execution & Agent Feed on Codeward Dashboard →**](${runUrl})`,
    '',
    `<sub>Run #${params.runId ?? 'pending'} · Commit \`${shortSha(params.commitSha)}\`</sub>`,
  ].join('\n');
}

export function buildDispatchOutput(params: {
  runId: number | string;
  repoFullName?: string;
  agentsConfig?: Record<string, any>;
  dispatchedAgentIds?: string[];
  estimatedDurationSeconds?: number;
}): { title: string; summary: string; text: string } {
  const runUrl = `${process.env.FRONTEND_URL || 'https://codeward.cloud'}/runs/${params.runId}`;
  const activeAgents = resolveDispatchedAgents(params.agentsConfig, params.dispatchedAgentIds);
  const count = activeAgents.length;
  const estMin = Math.max(1, Math.round((params.estimatedDurationSeconds ?? 180) / 60));

  const bulletList = activeAgents.map(a => {
    const simpleName = a.name.replace(/^[^\s]+\s*/, '');
    return `• **${simpleName}** — spinning up sandbox`;
  }).join('\n');

  const tableRows = activeAgents.map(a => {
    const status = a.id === 'guardian' ? '⏳ Waiting for signals' : '🔄 Analyzing in sandbox';
    return `| **${a.name}** | ${a.domain} | ${a.focus} | ${status} |`;
  }).join('\n');

  return {
    title: `🛡️ ${count} agents dispatched`,
    summary: 'Codeward is reviewing this PR in isolated sandboxes. Usually done in under 6 minutes.',
    text: [
      '### 🛡️ Codeward',
      '',
      `${count} agents dispatched into ephemeral Firecracker sandboxes:`,
      bulletList,
      '',
      '#### 🤖 Multi-Agent Review Team',
      '| Agent | Domain | Focus Area | Status |',
      '| :--- | :--- | :--- | :--- |',
      tableRows,
      '',
      'Each runs independently — SAST, dependency checks, architecture and compliance review — then reports to the orchestrator for one consolidated verdict.',
      '',
      '> ☕ **Please be patient while our agents do the heavy lifting.**',
      `> Unlike traditional superficial linters, Codeward executes real static & dynamic checks and dry-runs potential fixes in an isolated Firecracker microVM sandbox. Analysis typically takes **~${estMin} minutes**.`,
      '',
      `[Watch it live →](${runUrl})`,
    ].join('\n'),
  };
}

export function buildCompletionOutput(params: {
  runId: number | string;
  durationSeconds?: number;
  findings?: Array<{ severity: string }>;
}): { title: string; summary: string; text: string; conclusion: 'success' | 'failure' | 'neutral' } {
  const runUrl = `${process.env.FRONTEND_URL || 'https://codeward.cloud'}/runs/${params.runId}`;
  const duration = params.durationSeconds ?? 180;
  const findings = params.findings ?? [];
  const critical = findings.filter(f => String(f.severity).toUpperCase() === 'CRITICAL').length;
  const high = findings.filter(f => String(f.severity).toUpperCase() === 'HIGH').length;
  const medium = findings.filter(f => String(f.severity).toUpperCase() === 'MEDIUM').length;
  const low = findings.filter(f => String(f.severity).toUpperCase() === 'LOW').length;
  const total = findings.length;

  if (total === 0) {
    return {
      title: '✅ Clean — no issues found',
      conclusion: 'success',
      summary: 'All agents reported back clean.',
      text: [
        '### 🛡️ Codeward',
        '',
        'All agents reported back clean.',
        '',
        `Completed in ${duration}s. [Full report on the dashboard →](${runUrl})`,
      ].join('\n'),
    };
  }

  const conclusion: 'failure' | 'neutral' = critical > 0 ? 'failure' : 'neutral';
  const critText = critical > 0 ? ` (${critical} critical)` : '';

  return {
    title: `🔍 ${total} finding${total > 1 ? 's' : ''}${critText}`,
    conclusion,
    summary: `Review complete — ${total} finding${total > 1 ? 's' : ''} detected across agents.`,
    text: [
      '### 🛡️ Codeward',
      '',
      "Review complete — here's what the agents found:",
      '',
      '| Severity | Count |',
      '| :--- | :--- |',
      ...(critical > 0 ? [`| 🔴 Critical | ${critical} |`] : []),
      ...(high > 0 ? [`| 🟠 High | ${high} |`] : []),
      ...(medium > 0 ? [`| 🟡 Medium | ${medium} |`] : []),
      ...(low > 0 ? [`| 🔵 Low | ${low} |`] : []),
      '',
      `Completed in ${duration}s. [Full report on the dashboard →](${runUrl})`,
    ].join('\n'),
  };
}

export function renderGuardianInitialCheck(params: {
  repoFullName: string;
  commitSha: string;
  runId?: number | string;
}): { title: string; summary: string } {
  const dispatch = buildDispatchOutput({ runId: params.runId ?? 'pending', repoFullName: params.repoFullName });
  return {
    title: dispatch.title,
    summary: `${dispatch.summary}\n\n${dispatch.text}`,
  };
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
    `## Codeward Escalation - ${severity}`,
    '',
    `### ${icon} ${severity} · ${categoryStr}`,
    '',
    f.description ? f.description : f.title,
    '',
    '| Field | Value |',
    '|---|---|',
    `| Agent | ${esc(f.agentId)} |`,
    `| Severity | ${severity} |`,
    f.category ? `| Category | ${esc(f.category)} |` : '',
    f.file ? `| Location | \`${f.file}${f.line != null ? `:${f.line}` : ''}\` |` : '',
    `| Run | #${params.runId} |`,
    `| Status | 🔴 Escalated — needs manual review |`,
    '',
    '---',
    '',
    '### Why Codeward did not auto-fix',
    '',
    `> ${whyNotFixed.split('\n').join('\n> ')}`,
    '',
    '---',
    '',
    '### Details',
    '',
  ].filter(Boolean);

  if (f.file) {
    lines.push(`**Location**: \`${f.file}${f.line != null ? `:${f.line}` : ''}\``, '');
  }

  if (f.evidence) {
    lines.push(
      '<details>',
      '<summary><strong>🔍 Raw tool evidence</strong></summary>',
      '',
      '```text',
      f.evidence.slice(0, 2000),
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

  const appSlug = process.env.GITHUB_APP_SLUG || 'codeward-code-review-agent';

  lines.push(
    '_Escalated by Codeward because the automated pipeline could not safely resolve this finding._',
    '',
    `<sub>🤖 Opened by [Codeward](https://github.com/apps/${appSlug}) · Run #${params.runId}</sub>`
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
