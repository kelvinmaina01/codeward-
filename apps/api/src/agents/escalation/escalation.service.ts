import crypto from 'node:crypto';
import type { SandboxHandle } from '../core/provider.js';
import { createGuardianTools } from '../definitions/guardian/guardian.tools.js';
import { renderGuardianIssueBody, type EscalationReason } from '../guardian/github-renderer.js';

export { type EscalationReason };

export interface EscalationParams {
  sandbox: SandboxHandle;
  repoId: string;
  runId: number;
}

export interface UnresolvedFinding {
  agentId: string;
  severity: string;
  category?: string | null;
  title: string;
  description: string;
  file?: string | null;
  line?: number | null;
  rawEvidence?: string | null;
  suggestedFix?: string | null;
  reason?: EscalationReason;
  reasonDetail?: string | null;
  fingerprint?: string;
  legacyFingerprint?: string;
}

export interface EscalatedIssue {
  agentId: string;
  title: string;
  file: string | null;
  issueNumber: number;
  htmlUrl: string;
  fingerprint?: string;
  reason?: EscalationReason;
}

export interface EscalationResult {
  escalated: EscalatedIssue[];
  skipped: Array<{ title: string; reason: string; issueNumber?: number }>;
  resolved?: Array<{ issueNumber: number; fingerprint: string }>;
}

export interface EscalationTaskView {
  agentId: string;
  findings: unknown;
  reportMeta?: any;
}

export interface EscalationGuardianTools {
  list_issues: { execute: (args: any) => Promise<any> };
  create_issue: { execute: (args: any) => Promise<any> };
  add_issue_comment?: { execute: (args: any) => Promise<any> };
  close_issue?: { execute: (args: any) => Promise<any> };
}

const ESCALATABLE_SEVERITIES = new Set(['CRITICAL', 'HIGH']);
// Real, logged cap — not a silent truncation. Prevents one bad run from spamming a repo with
// issues; anything beyond this per run is logged, not dropped quietly.
export const MAX_ISSUES_PER_RUN = 5;

/**
 * Deterministic fingerprint computation: sha256(repoId:category:sortedFilesJoined)
 * Guarantees that identical findings across multiple runs yield the exact same fingerprint,
 * preventing issue duplication even if GitHub search is laggy.
 */
export function computeFindingFingerprint(
  repoId: string | number,
  category: string | undefined | null,
  files: (string | undefined | null)[]
): string {
  const normCategory = String(category || 'UNKNOWN').toUpperCase().trim();
  const sortedFiles = files
    .filter((f): f is string => Boolean(f))
    .map((f) => f.trim().toLowerCase())
    .sort();
  const raw = `${repoId}:${normCategory}:${sortedFiles.join(',')}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Real Phase 6 (partial): triggered by orchestrator Phase 3 when the run's final gate decision
 * is BLOCK. Walks every non-orchestrator agent task in the run, finds CRITICAL/HIGH findings
 * that are (a) not dismissed and (b) not already covered by a real auto-fix PR (Phase 1) — i.e.
 * genuinely unresolved — and opens a real GitHub issue for each, after a real duplicate check
 * against currently-open issues and the escalatedFindings tracking table.
 */
export async function escalateTaskFindings(params: {
  guardianTools: EscalationGuardianTools;
  repoId: string;
  runId: number;
  tasks: EscalationTaskView[];
  scannedFiles?: string[];
  autoFixEnabled?: boolean;
  dbClient?: any;
  delayBetweenIssuesMs?: number;
  commentThrottleMs?: number;
}): Promise<EscalationResult> {
  const unresolved: UnresolvedFinding[] = [];
  for (const task of params.tasks) {
    const findings = (task.findings as any[]) ?? [];
    const meta = (task.reportMeta as any) ?? {};
    const autoFixPR = meta.autoFixPR;
    const fixedFiles = new Set<string>(
      autoFixPR?.opened && Array.isArray(autoFixPR.appliedFixes)
        ? autoFixPR.appliedFixes.map((f: any) => f.filePath)
        : []
    );

    for (const f of findings) {
      const severity = String(f.severity ?? '').toUpperCase();
      if (!ESCALATABLE_SEVERITIES.has(severity)) continue;
      if (f.dismissed) continue;
      if (f.file && fixedFiles.has(f.file)) continue; // already got a real fix PR — no need to also file an issue

      // Determine explicit reason why this finding was not auto-resolved
      let reason: EscalationReason = 'NOT_ELIGIBLE';
      let reasonDetail: string | null = null;

      if (f.escalationReason) {
        reason = f.escalationReason;
        reasonDetail = f.escalationDetail ?? null;
      } else if (params.autoFixEnabled === false) {
        reason = 'AUTOFIX_DISABLED_FOR_REPO';
      } else if (autoFixPR?.guardianReview && autoFixPR.guardianReview.reviewed === false) {
        reason = 'GUARDIAN_REJECTED';
        reasonDetail = autoFixPR.guardianReview.reason ?? null;
      } else if (autoFixPR && autoFixPR.opened === false) {
        reason = 'AUTOFIX_ATTEMPTED_FAILED';
        reasonDetail = autoFixPR.reason ?? null;
      } else if (task.agentId !== 'bloat') {
        reason = 'NOT_ELIGIBLE';
      }

      const fp = computeFindingFingerprint(params.repoId, `${f.category ?? 'UNKNOWN'}:${f.title ?? ''}`, [f.file]);
      const legacyFp = computeFindingFingerprint(params.repoId, f.category, [f.file]);

      unresolved.push({
        agentId: task.agentId,
        severity,
        category: f.category ?? null,
        title: f.title,
        description: f.description,
        file: f.file ?? null,
        line: f.line ?? null,
        rawEvidence: f.rawEvidence ?? null,
        suggestedFix: f.suggestedFix ?? null,
        reason,
        reasonDetail,
        fingerprint: fp,
        legacyFingerprint: legacyFp,
      });
    }
  }

  // Load existing tracking rows from DB if available
  let db = params.dbClient;
  if (!db) {
    try {
      const dbModule = await import('../../db/index.js');
      db = dbModule.db;
    } catch {
      // Running in a mock test environment without DB
      db = null;
    }
  }

  const existingByFingerprint = new Map<string, any>();
  const numericRepoId = Number(params.repoId);

  if (db && !isNaN(numericRepoId)) {
    try {
      const { escalatedFindings } = await import('../../db/schema.js');
      const { eq, and } = await import('drizzle-orm');
      const rows = await db.select().from(escalatedFindings).where(
        and(eq(escalatedFindings.repoId, numericRepoId), eq(escalatedFindings.status, 'open'))
      );
      for (const row of rows) {
        existingByFingerprint.set(row.fingerprint, row);
      }
    } catch (dbErr) {
      console.warn(`[Escalation] Could not read escalatedFindings table:`, (dbErr as Error).message);
    }
  }

  // Check GitHub open issues as secondary/initial deduplication check
  const existingGithub: any = await params.guardianTools.list_issues.execute({ repoId: params.repoId, state: 'open' });
  if ('error' in existingGithub) {
    return {
      escalated: [],
      skipped: unresolved.map((f) => ({
        title: f.title,
        reason: `Could not check for duplicate issues: ${existingGithub.error}`,
      })),
    };
  }

  const existingTitles = new Map<string, number>();
  for (const i of existingGithub.issues ?? []) {
    existingTitles.set(String(i.title).toLowerCase().trim(), i.number);
  }

  // Build full fingerprint set of all unresolved findings in this run BEFORE applying MAX_ISSUES_PER_RUN.
  // This prevents capped findings from looking "missing" and being falsely auto-closed during the sweep.
  const currentRunFingerprints = new Set<string>();
  for (const f of unresolved) {
    if (f.fingerprint) currentRunFingerprints.add(f.fingerprint);
    if (f.legacyFingerprint) currentRunFingerprints.add(f.legacyFingerprint);
  }
  const analyzedAgents = new Set<string>(params.tasks.map((t) => t.agentId));
  const scannedFilesSet = params.scannedFiles && params.scannedFiles.length > 0
    ? new Set<string>(params.scannedFiles)
    : null;
  const COMMENT_THROTTLE_MS = params.commentThrottleMs ?? 24 * 60 * 60 * 1000;

  const capped = unresolved.slice(0, MAX_ISSUES_PER_RUN);
  const overflow = unresolved.length - capped.length;
  const skipped: Array<{ title: string; reason: string; issueNumber?: number }> = [];

  if (overflow > 0) {
    console.warn(`[Escalation] run #${params.runId}: ${overflow} additional unresolved finding(s) were NOT escalated — capped at ${MAX_ISSUES_PER_RUN} real issues per run to avoid spam.`);
    skipped.push(...unresolved.slice(MAX_ISSUES_PER_RUN).map((f) => ({ title: f.title, reason: `Capped at ${MAX_ISSUES_PER_RUN} issues per run.` })));
  }

  const escalated: EscalatedIssue[] = [];

  for (const finding of capped) {
    const fp = finding.fingerprint!;
    const issueTitle = `[Codeward] ${finding.severity}: ${finding.title}`.slice(0, 250);
    const titleKey = issueTitle.toLowerCase().trim();

    const trackedRow = existingByFingerprint.get(fp) || (finding.legacyFingerprint ? existingByFingerprint.get(finding.legacyFingerprint) : null);
    const existingIssueNum = trackedRow?.githubIssueNumber ?? existingTitles.get(titleKey);

    if (trackedRow || existingTitles.has(titleKey)) {
      // Idempotency: Finding already has an open issue. Apply 24h comment throttle to avoid notification spam.
      const shouldComment = (() => {
        if (!existingIssueNum || !params.guardianTools.add_issue_comment) return false;
        if (!trackedRow?.lastCommentedAt) return true;
        return (Date.now() - new Date(trackedRow.lastCommentedAt).getTime()) >= COMMENT_THROTTLE_MS;
      })();

      let commentPosted = false;
      if (shouldComment && existingIssueNum && params.guardianTools.add_issue_comment) {
        try {
          await params.guardianTools.add_issue_comment.execute({
            repoId: params.repoId,
            issueNumber: existingIssueNum,
            body: `[Codeward] Finding remains unresolved as of run #${params.runId}.\nLocation: \`${finding.file || 'codebase'}${finding.line != null ? `:${finding.line}` : ''}\`\nSeverity: **${finding.severity}**`,
          });
          commentPosted = true;
        } catch (commentErr) {
          console.warn(`[Escalation] Could not comment on existing issue #${existingIssueNum}:`, (commentErr as Error).message);
        }
      }

      if (db && trackedRow) {
        try {
          const { escalatedFindings } = await import('../../db/schema.js');
          const { eq } = await import('drizzle-orm');
          await db.update(escalatedFindings).set({
            lastSeenAt: new Date(),
            ...(commentPosted ? { lastCommentedAt: new Date() } : {}),
            runId: params.runId,
            reason: finding.reason || 'NOT_ELIGIBLE',
            reasonDetail: finding.reasonDetail,
          }).where(eq(escalatedFindings.id, trackedRow.id));
        } catch { /* non-fatal DB update */ }
      }

      skipped.push({
        title: issueTitle,
        reason: 'An open issue with this exact title already exists — not creating a duplicate.',
        issueNumber: existingIssueNum,
      });
      continue;
    }

    // Reserve/claim the fingerprint in DB BEFORE calling GitHub create_issue to eliminate race duplicates
    let reservedRowId: number | null = null;
    if (db && !isNaN(numericRepoId)) {
      try {
        const { escalatedFindings } = await import('../../db/schema.js');
        const insertRes = await db.insert(escalatedFindings).values({
          repoId: numericRepoId,
          fingerprint: fp,
          agentId: finding.agentId,
          file: finding.file ?? null,
          githubIssueNumber: null,
          status: 'open',
          reason: finding.reason || 'NOT_ELIGIBLE',
          reasonDetail: finding.reasonDetail,
          runId: params.runId,
        }).returning();
        const reserved = Array.isArray(insertRes) ? insertRes[0] : insertRes;
        reservedRowId = reserved?.id ?? null;
      } catch (reserveErr: any) {
        const isUniqueConstraint = reserveErr?.code === '23505' || reserveErr?.message?.includes('unique') || reserveErr?.message?.includes('duplicate');
        if (isUniqueConstraint) {
          console.warn(`[Escalation] Fingerprint ${fp} already claimed/open in DB, skipping duplicate create_issue:`, reserveErr?.message);
          skipped.push({
            title: issueTitle,
            reason: 'Already claimed by an active or concurrent escalation run.',
          });
          continue;
        }
        throw reserveErr;
      }
    }

    // Per-issue pacing delay to avoid GitHub secondary abuse rate-limits (if configured)
    if (params.delayBetweenIssuesMs && params.delayBetweenIssuesMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, params.delayBetweenIssuesMs));
    }

    // Render issue body and create GitHub issue
    const body = renderGuardianIssueBody({
      runId: params.runId,
      reason: finding.reason,
      reasonDetail: finding.reasonDetail,
      finding: {
        agentId: finding.agentId,
        severity: finding.severity,
        category: finding.category,
        title: finding.title,
        description: finding.description,
        file: finding.file,
        line: finding.line,
        evidence: finding.rawEvidence,
        suggestedFix: finding.suggestedFix,
        fixStatus: 'escalated',
      },
    });

    let res: any;
    try {
      res = await params.guardianTools.create_issue.execute({
        repoId: params.repoId,
        title: issueTitle,
        body,
        labels: ['codeward', finding.severity.toLowerCase()],
      });
    } catch (createErr) {
      if (db && reservedRowId != null) {
        try {
          const { escalatedFindings } = await import('../../db/schema.js');
          const { eq } = await import('drizzle-orm');
          await db.delete(escalatedFindings).where(eq(escalatedFindings.id, reservedRowId));
        } catch { /* non-fatal DB delete */ }
      }
      throw createErr;
    }

    if (res.success) {
      escalated.push({
        agentId: finding.agentId,
        title: finding.title,
        file: finding.file ?? null,
        issueNumber: res.issueNumber,
        htmlUrl: res.htmlUrl,
        fingerprint: fp,
        reason: finding.reason,
      });

      if (db && reservedRowId != null) {
        try {
          const { escalatedFindings } = await import('../../db/schema.js');
          const { eq } = await import('drizzle-orm');
          await db.update(escalatedFindings).set({
            githubIssueNumber: res.issueNumber,
            lastSeenAt: new Date(),
          }).where(eq(escalatedFindings.id, reservedRowId));
        } catch { /* non-fatal DB update */ }
      }
    } else {
      // Issue creation failed: release the reservation row so future runs can retry
      if (db && reservedRowId != null) {
        try {
          const { escalatedFindings } = await import('../../db/schema.js');
          const { eq } = await import('drizzle-orm');
          await db.delete(escalatedFindings).where(eq(escalatedFindings.id, reservedRowId));
        } catch { /* non-fatal delete */ }
      }
      skipped.push({
        title: issueTitle,
        reason: res.reason || 'GitHub create_issue failed without explicit reason',
      });
    }
  }

  // Unified Resolution Sweep:
  // Evaluates previously open findings against the current run.
  // SCOPE PROTECTION:
  // 1. If an agent did not run in this execution, do NOT resolve its findings.
  // 2. If specific files were targeted and a finding's file was not analyzed, do NOT resolve it.
  // 3. Close the GitHub issue FIRST. Only mark DB status 'resolved' once GitHub successfully closes it.
  const resolved: Array<{ issueNumber: number; fingerprint: string }> = [];
  if (db && !isNaN(numericRepoId)) {
    for (const [fp, row] of existingByFingerprint.entries()) {
      if (currentRunFingerprints.has(fp)) {
        continue; // Still active
      }

      // If analyzedAgents is populated and row has an agentId, ensure that agent actually ran
      if (analyzedAgents.size > 0 && (!row.agentId || !analyzedAgents.has(row.agentId))) {
        continue;
      }

      // If scannedFilesSet is populated and row has a file, ensure that file was actually scanned
      if (scannedFilesSet && (!row.file || !scannedFilesSet.has(row.file))) {
        continue;
      }

      let closedSuccessfully = false;
      if (row.githubIssueNumber && params.guardianTools.close_issue) {
        try {
          const closeRes = await params.guardianTools.close_issue.execute({
            repoId: params.repoId,
            issueNumber: row.githubIssueNumber,
            comment: `[Codeward] ✅ Resolved: This finding was no longer detected in run #${params.runId}. Closing issue automatically.`,
          });
          closedSuccessfully = closeRes?.success !== false;
        } catch (closeErr) {
          console.warn(`[Escalation] Failed to close GitHub issue #${row.githubIssueNumber}:`, (closeErr as Error).message);
          closedSuccessfully = false;
        }
      } else {
        closedSuccessfully = true;
      }

      if (closedSuccessfully) {
        try {
          const { escalatedFindings } = await import('../../db/schema.js');
          const { eq } = await import('drizzle-orm');
          await db.update(escalatedFindings).set({
            status: 'resolved',
            resolvedAt: new Date(),
          }).where(eq(escalatedFindings.id, row.id));

          resolved.push({ issueNumber: row.githubIssueNumber, fingerprint: fp });
        } catch (updateErr) {
          console.warn(`[Escalation] Could not update escalatedFindings status to resolved:`, (updateErr as Error).message);
        }
      }
    }
  }

  return {
    escalated,
    skipped,
    resolved,
  };
}

export async function escalateUnresolvedFindings(params: EscalationParams): Promise<EscalationResult> {
  const { db } = await import('../../db/index.js');
  const { agentTasks, repositories, runs } = await import('../../db/schema.js');
  const { eq, and, notLike } = await import('drizzle-orm');

  const tasks = await db.select().from(agentTasks).where(
    and(eq(agentTasks.runId, params.runId), notLike(agentTasks.agentId, 'orchestrator%'))
  );

  const numericRepoId = Number(params.repoId);
  const [repoRow] = !isNaN(numericRepoId)
    ? await db.select().from(repositories).where(eq(repositories.id, numericRepoId))
    : [];

  const [runRow] = await db.select({ scope: runs.scope }).from(runs).where(eq(runs.id, params.runId));
  const runScope = runRow?.scope as { incremental?: boolean; changedFiles?: string[] } | null;
  const scannedFiles = (runScope?.incremental && Array.isArray(runScope.changedFiles))
    ? runScope.changedFiles
    : undefined;

  return escalateTaskFindings({
    guardianTools: createGuardianTools(params.sandbox),
    repoId: params.repoId,
    runId: params.runId,
    tasks,
    scannedFiles,
    autoFixEnabled: repoRow?.autoFixEnabled !== false,
    dbClient: db,
  });
}
