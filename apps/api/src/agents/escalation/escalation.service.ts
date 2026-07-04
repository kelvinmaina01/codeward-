import type { SandboxHandle } from '../core/provider.js';
import { createGuardianTools } from '../definitions/guardian/guardian.tools.js';

export interface EscalationParams {
  sandbox: SandboxHandle;
  repoId: string;
  runId: number;
}

interface UnresolvedFinding {
  agentId: string;
  severity: string;
  category?: string | null;
  title: string;
  description: string;
  file?: string | null;
  line?: number | null;
  rawEvidence?: string | null;
  suggestedFix?: string | null;
}

export interface EscalatedIssue {
  agentId: string;
  title: string;
  file: string | null;
  issueNumber: number;
  htmlUrl: string;
}

export interface EscalationResult {
  escalated: EscalatedIssue[];
  skipped: Array<{ title: string; reason: string }>;
}

const ESCALATABLE_SEVERITIES = new Set(['CRITICAL', 'HIGH']);
// Real, logged cap — not a silent truncation. Prevents one bad run from spamming a repo with
// issues; anything beyond this per run is logged, not dropped quietly.
const MAX_ISSUES_PER_RUN = 5;

/**
 * Real Phase 6 (partial): triggered by orchestrator Phase 3 when the run's final gate decision
 * is BLOCK. Walks every non-orchestrator agent task in the run, finds CRITICAL/HIGH findings
 * that are (a) not dismissed and (b) not already covered by a real auto-fix PR (Phase 1) — i.e.
 * genuinely unresolved — and opens a real GitHub issue for each, after a real duplicate check
 * against currently-open issues. This is the "agents fail to fix it, so they escalate" path.
 */
export async function escalateUnresolvedFindings(params: EscalationParams): Promise<EscalationResult> {
  const { db } = await import('../../db/index.js');
  const { agentTasks } = await import('../../db/schema.js');
  const { eq, and, notLike } = await import('drizzle-orm');

  const tasks = await db.select().from(agentTasks).where(
    and(eq(agentTasks.runId, params.runId), notLike(agentTasks.agentId, 'orchestrator%'))
  );

  const unresolved: UnresolvedFinding[] = [];
  for (const task of tasks) {
    const findings = (task.findings as any[]) ?? [];
    const meta = (task.reportMeta as any) ?? {};
    const fixedFiles = new Set<string>(
      meta.autoFixPR?.opened ? meta.autoFixPR.appliedFixes.map((f: any) => f.filePath) : []
    );
    for (const f of findings) {
      const severity = String(f.severity ?? '').toUpperCase();
      if (!ESCALATABLE_SEVERITIES.has(severity)) continue;
      if (f.dismissed) continue;
      if (f.file && fixedFiles.has(f.file)) continue; // already got a real fix PR — no need to also file an issue
      unresolved.push({
        agentId: task.agentId, severity, category: f.category ?? null, title: f.title, description: f.description,
        file: f.file ?? null, line: f.line ?? null, rawEvidence: f.rawEvidence ?? null, suggestedFix: f.suggestedFix ?? null,
      });
    }
  }

  if (unresolved.length === 0) return { escalated: [], skipped: [] };

  const guardianTools = createGuardianTools(params.sandbox);
  const existing: any = await guardianTools.list_issues.execute({ repoId: params.repoId, state: 'open' });
  if ('error' in existing) {
    return { escalated: [], skipped: unresolved.map((f) => ({ title: f.title, reason: `Could not check for duplicate issues: ${existing.error}` })) };
  }
  const existingTitles = new Set<string>((existing.issues ?? []).map((i: any) => String(i.title).toLowerCase().trim()));

  const capped = unresolved.slice(0, MAX_ISSUES_PER_RUN);
  const overflow = unresolved.length - capped.length;
  const skipped: Array<{ title: string; reason: string }> = [];
  if (overflow > 0) {
    console.warn(`[Escalation] run #${params.runId}: ${overflow} additional unresolved finding(s) were NOT escalated — capped at ${MAX_ISSUES_PER_RUN} real issues per run to avoid spam.`);
    skipped.push(...unresolved.slice(MAX_ISSUES_PER_RUN).map((f) => ({ title: f.title, reason: `Capped at ${MAX_ISSUES_PER_RUN} issues per run.` })));
  }

  const escalated: EscalatedIssue[] = [];
  for (const finding of capped) {
    const issueTitle = `[Codeward] ${finding.severity}: ${finding.title}`.slice(0, 250);
    if (existingTitles.has(issueTitle.toLowerCase().trim())) {
      skipped.push({ title: issueTitle, reason: 'An open issue with this exact title already exists — not creating a duplicate.' });
      continue;
    }

    const body = [
      `**Agent**: ${finding.agentId}`,
      `**Severity**: ${finding.severity}`,
      finding.category ? `**Category**: ${finding.category}` : '',
      finding.file ? `**Location**: \`${finding.file}${finding.line != null ? `:${finding.line}` : ''}\`` : '',
      '',
      `**Description**: ${finding.description}`,
      finding.rawEvidence ? `\n**Evidence**:\n\`\`\`\n${finding.rawEvidence.slice(0, 1000)}\n\`\`\`` : '',
      finding.suggestedFix ? `\n**Suggested fix**: ${finding.suggestedFix}` : '',
      '',
      `_Codeward's automated pipeline could not auto-resolve this finding and is escalating it for manual review (run #${params.runId})._`,
    ].filter(Boolean).join('\n');

    const res: any = await guardianTools.create_issue.execute({
      repoId: params.repoId, title: issueTitle, body, labels: ['codeward', finding.severity.toLowerCase()],
    });

    if (res.success) {
      escalated.push({ agentId: finding.agentId, title: finding.title, file: finding.file ?? null, issueNumber: res.issueNumber, htmlUrl: res.htmlUrl });
    } else {
      skipped.push({ title: issueTitle, reason: `create_issue failed: ${res.error ?? 'unknown error'}` });
    }
  }

  return { escalated, skipped };
}
