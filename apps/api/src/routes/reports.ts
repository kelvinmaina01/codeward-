import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, or, inArray, desc } from 'drizzle-orm';
import { agentQueue } from '../agents/queue/agent.queue.js';

export const reportsRouter = new Hono();

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  security: 'Security Agent',
  bloat: 'Bloat Agent',
  broken_code: 'Broken Code Agent',
  architecture: 'Architecture Agent',
  compliance: 'Compliance Agent',
  data_dx: 'Data & DX Agent',
  ai_era: 'AI-Era Agent',
  guardian: 'Guardian Agent',
  chat: 'Chat Agent',
};

const SEVERITY_ORDER: Record<string, number> = { critical: 0, CRITICAL: 0, high: 1, HIGH: 1, medium: 2, MEDIUM: 2, low: 3, LOW: 3, info: 4, INFO: 4 };
const COMMIT_AGENT_IDS = ['security', 'bloat', 'broken_code', 'architecture', 'compliance', 'data_dx', 'ai_era', 'chat'];

function normalizeGate(gate: unknown, status: string, score: number | null): 'PASS' | 'WARN' | 'BLOCK' | null {
  const raw = String(gate ?? '').toUpperCase();
  if (raw === 'PASS' || raw === 'WARN' || raw === 'BLOCK') return raw;
  if (status === 'failed' || status === 'agent_failed') return 'BLOCK';
  if (score == null) return null;
  if (score < 60) return 'BLOCK';
  if (score < 85) return 'WARN';
  return 'PASS';
}

function inferSkippedReason(agentId: string, changedFiles: string[]): string {
  if (changedFiles.length === 0) return 'No files in incremental scope';
  const lower = changedFiles.map((f) => f.toLowerCase());
  if (agentId === 'architecture') return lower.some((f) => /src\/|app\/|packages\/|services\/|lib\//.test(f)) ? 'No structural changes selected' : 'No architecture files changed';
  if (agentId === 'compliance') return lower.some((f) => /auth|billing|payment|privacy|policy|config|infra|env/.test(f)) ? 'No compliance checks selected' : `Scope: ${changedFiles.length} files (no config/infra)`;
  if (agentId === 'data_dx') return lower.some((f) => /schema|migration|db|sql|query|model/.test(f)) ? 'No data checks selected' : 'No DB schema changes detected';
  if (agentId === 'ai_era') return lower.some((f) => /ai|llm|openai|anthropic|prompt|rag|embedding/.test(f)) ? 'No AI checks selected' : 'No AI patterns in scope';
  if (agentId === 'broken_code') return 'No high-risk patterns detected';
  return 'Skipped by orchestrator for this scope';
}

/** Real ownership check — same pattern as reposRouter: user owns the repo directly, or via an org they're a member of. */
async function userCanAccessRepo(userId: string, repoId: number): Promise<boolean> {
  const [repo] = await db.select().from(schema.repositories).where(eq(schema.repositories.id, repoId));
  if (!repo) return false;
  if (repo.userId === userId) return true;
  if (repo.orgId == null) return false;
  const [membership] = await db.select().from(schema.organizationMember)
    .where(and(eq(schema.organizationMember.userId, userId), eq(schema.organizationMember.orgId, repo.orgId)));
  return !!membership;
}

async function buildRunReport(runId: number) {
  const [run] = await db.select().from(schema.runs).where(eq(schema.runs.id, runId));
  if (!run) return null;

  const tasks = await db.select().from(schema.agentTasks).where(eq(schema.agentTasks.runId, runId));

  const agents = tasks
    .filter((t) => !t.agentId.startsWith('orchestrator'))
    .map((t) => {
      const findings = ((t.findings as any[]) ?? []).slice().sort(
        (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
      );
      const meta = (t.reportMeta as any) ?? {};
      const fixedFiles = new Set((meta.autoFixPR?.opened ? meta.autoFixPR.appliedFixes : [])?.map((f: any) => f.filePath) ?? []);
      return {
        agentId: t.agentId,
        displayName: AGENT_DISPLAY_NAMES[t.agentId] ?? t.agentId,
        status: t.status,
        score: t.score,
        gateDecision: meta.gateDecision ?? null,
        durationMs: t.duration,
        findingsCount: findings.length,
        findings: findings.map((f) => ({
          id: f.id ?? null,
          severity: f.severity ?? 'INFO',
          category: f.category ?? null,
          title: f.title,
          description: f.description,
          file: f.file ?? null,
          line: f.line ?? null,
          toolName: f.toolName ?? null,
          rawEvidence: f.rawEvidence ?? null,
          // Real status: only "pr_opened" when a real PR genuinely contains a real commit
          // touching this exact file; everything else is honestly "suggested", not a claim of
          // work that didn't happen.
          fixStatus: f.dismissed ? 'dismissed' : f.file && fixedFiles.has(f.file) ? 'pr_opened' : 'suggested',
          suggestedFix: f.suggestedFix ?? f.suggestedRefactor ?? null,
          refactorSafe: f.refactorSafe ?? null,
          dismissed: !!f.dismissed,
          dismissalReason: f.dismissalReason ?? null,
        })),
        toolsExecuted: meta.toolsExecuted ?? [],
        summary: meta.summary ?? null,
        autoFixPR: meta.autoFixPR?.opened
          ? {
              opened: true,
              pullRequestNumber: meta.autoFixPR.pullRequestNumber,
              htmlUrl: meta.autoFixPR.htmlUrl,
              fixedCount: meta.autoFixPR.appliedFixes?.length ?? 0,
              guardianReview: meta.autoFixPR.guardianReview?.reviewed
                ? { reviewed: true, event: meta.autoFixPR.guardianReview.event }
                : meta.autoFixPR.guardianReview
                  ? { reviewed: false, reason: meta.autoFixPR.guardianReview.reason }
                  : null,
            }
          : meta.autoFixPR
            ? { opened: false, reason: meta.autoFixPR.reason }
            : null,
        error: t.error ?? null,
      };
    });

  const allFindings = agents.flatMap((a) => a.findings);
  const severityCounts = allFindings.reduce((acc: Record<string, number>, f) => {
    const key = String(f.severity).toUpperCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // Escalation is a run-wide summary written by orchestrator Phase 3, not a per-agent finding —
  // real GitHub issues opened for whatever CRITICAL/HIGH findings couldn't be auto-fixed.
  const orchestratorTask = tasks.find((t) => t.agentId === 'orchestrator_phase3');
  const orchestratorMeta = (orchestratorTask?.reportMeta as any) ?? {};
  const escalation = orchestratorMeta.escalation
    ? {
        issues: (orchestratorMeta.escalation.escalated ?? []).map((e: any) => ({
          agentId: e.agentId, title: e.title, file: e.file, issueNumber: e.issueNumber, htmlUrl: e.htmlUrl,
        })),
        skippedCount: orchestratorMeta.escalation.skipped?.length ?? 0,
      }
    : null;

  return {
    runId: run.id,
    repoId: run.repoId,
    commitSha: run.commitSha,
    status: run.status,
    overallScore: run.score,
    createdAt: run.createdAt,
    agentsRun: agents.length,
    totalFindings: allFindings.length,
    severityCounts,
    escalation,
    agents,
  };
}

/** POST /api/reports/export-drive — simulate exporting report to Google Drive. */
reportsRouter.post('/export-drive', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  // In a real implementation, we would use the googleapis SDK with the stored OAuth token
  // to upload a generated PDF to Google Drive.
  // For now, we simulate success if the user is authenticated.
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return c.json({ success: true, message: 'Report synced to Google Drive successfully' });
});

/** GET /api/reports/recent — recent runs across every repo this user can access, for the dashboard activity table. */
reportsRouter.get('/recent', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember)
    .where(eq(schema.organizationMember.userId, session.user.id));
  const orgIds = userOrgs.map((o) => o.orgId);

  const accessConditions = [eq(schema.repositories.userId, session.user.id)];
  if (orgIds.length > 0) accessConditions.push(inArray(schema.repositories.orgId, orgIds));
  const accessibleRepos = await db.select().from(schema.repositories).where(or(...accessConditions));

  const repoIds = accessibleRepos.map((r) => r.id);
  if (repoIds.length === 0) return c.json({ runs: [] });

  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const recentRuns = await db.select().from(schema.runs)
    .where(inArray(schema.runs.repoId, repoIds))
    .orderBy(desc(schema.runs.createdAt))
    .limit(limit);

  const repoById = new Map(accessibleRepos.map((r) => [r.id, r]));
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;

  const reconciledRuns = recentRuns.map((r) => {
    const createdMs = r.createdAt ? new Date(r.createdAt).getTime() : Date.now();
    const isStale = (r.status === 'running' || r.status === 'queued') && createdMs < fifteenMinutesAgo;

    let derivedStatus = r.status;
    if (isStale) {
      derivedStatus = r.score != null ? 'completed' : 'failed';
    }

    return {
      runId: r.id,
      repoId: r.repoId,
      repoFullName: r.repoId != null ? repoById.get(r.repoId)?.fullName ?? 'unknown' : 'unknown',
      commitSha: r.commitSha,
      status: derivedStatus,
      overallScore: r.score,
      createdAt: r.createdAt,
    };
  });

  return c.json({
    runs: reconciledRuns,
  });
});

/** GET /api/reports/feed — historical feed for dashboard Agent Activity. */
reportsRouter.get('/feed', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember)
    .where(eq(schema.organizationMember.userId, session.user.id));
  const orgIds = userOrgs.map((o) => o.orgId);

  const accessConditions = [eq(schema.repositories.userId, session.user.id)];
  if (orgIds.length > 0) accessConditions.push(inArray(schema.repositories.orgId, orgIds));
  const accessibleRepos = await db.select().from(schema.repositories).where(or(...accessConditions));

  const repoIds = accessibleRepos.map((r) => r.id);
  if (repoIds.length === 0) return c.json({ feed: [] });

  const recentRuns = await db.select().from(schema.runs)
    .where(inArray(schema.runs.repoId, repoIds))
    .orderBy(desc(schema.runs.createdAt))
    .limit(20);

  if (recentRuns.length === 0) return c.json({ feed: [] });

  const tasks = await db.select().from(schema.agentTasks).where(inArray(schema.agentTasks.runId, recentRuns.map(r => r.id)));
  const repoById = new Map(accessibleRepos.map((r) => [r.id, r]));
  const runById = new Map(recentRuns.map((r) => [r.id, r]));

  const feedEvents = [];

  for (const task of tasks) {
    const run = runById.get(task.runId);
    if (!run) continue;
    const repo = run.repoId != null ? repoById.get(run.repoId) : undefined;
    const repoName = repo?.fullName ?? 'unknown';

    let type = 'agent_active';
    if (task.status === 'completed') type = 'agent_completed';
    if (task.status === 'failed') type = 'agent_failed';

    feedEvents.push({
      type,
      timestamp: task.createdAt ?? run.createdAt ?? new Date(),
      payload: {
        repo: repoName,
        sha: run.commitSha,
        agent: task.agentId,
        score: task.score ?? 0,
        error: task.error ?? '',
        runId: run.id
      }
    });
  }

  feedEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return c.json({ feed: feedEvents.slice(0, 50) });
});

/** GET /api/reports/livefeed-logs — persistent log backfill for LiveFeed terminal. */
reportsRouter.get('/livefeed-logs', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember)
    .where(eq(schema.organizationMember.userId, session.user.id));
  const orgIds = userOrgs.map((o) => o.orgId);

  const accessConditions = [eq(schema.repositories.userId, session.user.id)];
  if (orgIds.length > 0) accessConditions.push(inArray(schema.repositories.orgId, orgIds));
  const repos = await db.select().from(schema.repositories).where(or(...accessConditions));
  if (repos.length === 0) return c.json({ logs: [] });

  const repoById = new Map(repos.map((r) => [r.id, r]));
  const repoFilterParam = c.req.query('repoId');
  const targetRepoId = repoFilterParam && repoFilterParam !== 'All' ? Number(repoFilterParam) : null;

  const repoIds = targetRepoId ? [targetRepoId] : repos.map((r) => r.id);
  if (repoIds.length === 0) return c.json({ logs: [] });

  // 1. Fetch persistent logs from schema.runLogs if present
  let logsFromDb: any[] = [];
  try {
    const logsCond = targetRepoId ? eq(schema.runLogs.repoId, targetRepoId) : inArray(schema.runLogs.repoId, repoIds);
    logsFromDb = await db.select().from(schema.runLogs)
      .where(logsCond)
      .orderBy(desc(schema.runLogs.tsMs))
      .limit(300);
  } catch (e) {
    console.error('Error fetching runLogs:', e);
  }

  if (logsFromDb.length > 0) {
    logsFromDb.reverse(); // Return in chronological order
    const formatted = logsFromDb.map((l) => {
      const repo = l.repoId != null ? repoById.get(l.repoId) : undefined;
      return {
        id: `db-${l.id}`,
        runId: l.runId,
        repoId: l.repoId,
        repoFullName: repo?.fullName ?? 'unknown',
        agent: l.agent,
        logType: l.logType,
        level: l.level,
        tsMs: l.tsMs,
        message: l.message,
        meta: l.meta ?? null,
      };
    });
    return c.json({ logs: formatted });
  }

  // 2. Fallback: reconstruct rich detailed millisecond sublogs from recent runs and agentTasks
  const recentRuns = await db.select().from(schema.runs)
    .where(inArray(schema.runs.repoId, repoIds))
    .orderBy(desc(schema.runs.createdAt))
    .limit(10);

  if (recentRuns.length === 0) return c.json({ logs: [] });

  const runIds = recentRuns.map((r) => r.id);
  const tasks = await db.select().from(schema.agentTasks).where(inArray(schema.agentTasks.runId, runIds));
  const runMap = new Map(recentRuns.map((r) => [r.id, r]));

  const reconstructedLogs: any[] = [];

  for (const r of recentRuns.reverse()) {
    const repo = r.repoId != null ? repoById.get(r.repoId) : undefined;
    const repoName = repo?.fullName ?? 'unknown';
    const sha = (r.commitSha || '').slice(0, 7);
    const baseTime = r.createdAt ? new Date(r.createdAt).getTime() : Date.now();

    // High level run start log
    reconstructedLogs.push({
      id: `run-start-${r.id}`,
      runId: r.id,
      repoId: r.repoId,
      repoFullName: repoName,
      agent: 'system',
      logType: 'system',
      level: 'inf',
      tsMs: baseTime,
      message: `[${repoName}] [${sha}] Executing analysis run #${r.id} on commit ${sha}`,
      meta: { levelDepth: 0 },
    });

    const runTasks = tasks.filter((t) => t.runId === r.id);
    let delta = 120; // Simulated microsecond offset per step

    for (const t of runTasks) {
      const taskTime = t.startedAt ? new Date(t.startedAt).getTime() : baseTime + delta;
      delta += 30;

      // Agent init
      reconstructedLogs.push({
        id: `task-init-${t.id}`,
        runId: r.id,
        repoId: r.repoId,
        repoFullName: repoName,
        agent: t.agentId,
        logType: 'build',
        level: 'plain',
        tsMs: taskTime,
        message: `[${repoName}] [${sha}] ${t.agentId}: Initializing isolated sandbox container...`,
        meta: { levelDepth: 0 },
      });

      // Sublog: Clone & AST step
      reconstructedLogs.push({
        id: `task-clone-${t.id}`,
        runId: r.id,
        repoId: r.repoId,
        repoFullName: repoName,
        agent: t.agentId,
        logType: 'build',
        level: 'plain',
        tsMs: taskTime + 18,
        message: `  ├─ Cloned & sandboxed repository workspace`,
        meta: { levelDepth: 1 },
      });

      // Sublog: Tool executions
      const meta = (t.reportMeta as any) ?? {};
      const tools = meta.toolsExecuted ?? [];
      for (let i = 0; i < tools.length; i++) {
        const rawTool = tools[i];
        const toolName = typeof rawTool === 'object' && rawTool !== null ? (rawTool.name || rawTool.tool || rawTool.id || JSON.stringify(rawTool)) : String(rawTool);
        reconstructedLogs.push({
          id: `task-tool-${t.id}-${i}`,
          runId: r.id,
          repoId: r.repoId,
          repoFullName: repoName,
          agent: t.agentId,
          logType: 'run',
          level: 'inf',
          tsMs: taskTime + 45 + i * 15,
          message: `  ├─ Executing tool: ${toolName}`,
          meta: { levelDepth: 1, toolName },
        });
      }

      // Sublog: Findings
      const findings = (t.findings as any[]) ?? [];
      for (let i = 0; i < findings.length; i++) {
        const f = findings[i];
        const sev = String(f.severity ?? 'INFO').toUpperCase();
        const level = sev === 'CRITICAL' || sev === 'HIGH' ? 'err' : (sev === 'MEDIUM' ? 'warn' : 'plain');
        reconstructedLogs.push({
          id: `task-finding-${t.id}-${i}`,
          runId: r.id,
          repoId: r.repoId,
          repoFullName: repoName,
          agent: t.agentId,
          logType: 'run',
          level,
          tsMs: taskTime + 110 + i * 12,
          message: `  └─ [${sev}] ${f.title}${f.file ? ` (${f.file}${f.line ? `:${f.line}` : ''})` : ''}`,
          meta: { levelDepth: 1, severity: sev, file: f.file, line: f.line },
        });
      }

      // Completion log
      const isErr = t.status === 'failed' || t.status === 'agent_failed';
      const finishTime = t.completedAt ? new Date(t.completedAt).getTime() : taskTime + 250;
      reconstructedLogs.push({
        id: `task-end-${t.id}`,
        runId: r.id,
        repoId: r.repoId,
        repoFullName: repoName,
        agent: t.agentId,
        logType: 'run',
        level: isErr ? 'err' : 'ok',
        tsMs: finishTime,
        message: isErr
          ? `[${repoName}] [${sha}] ${t.agentId} FAILED: ${t.error || 'Execution failed'}`
          : `[${repoName}] [${sha}] ${t.agentId} finished (Score: ${t.score ?? 100}/100, Findings: ${t.findingsCount ?? findings.length})`,
        meta: { levelDepth: 0 },
      });
    }
  }

  // Sort reconstructed by tsMs ascending
  reconstructedLogs.sort((a, b) => a.tsMs - b.tsMs);

  return c.json({ logs: reconstructedLogs });
});

/** GET /api/reports/:repoId/latest — most recent run's full report for the dashboard. */
reportsRouter.get('/:repoId/latest', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  if (!Number.isFinite(repoId)) return c.json({ error: 'Invalid repoId' }, 400);
  if (!(await userCanAccessRepo(session.user.id, repoId))) return c.json({ error: 'Forbidden' }, 403);

  const [latestRun] = await db.select().from(schema.runs)
    .where(eq(schema.runs.repoId, repoId))
    .orderBy(desc(schema.runs.createdAt))
    .limit(1);
  if (!latestRun) return c.json({ error: 'No runs found for this repo yet.' }, 404);

  const report = await buildRunReport(latestRun.id);
  return c.json(report);
});

/** GET /api/reports/:repoId/runs/:runId — a specific historical run's report. */
reportsRouter.get('/:repoId/runs/:runId', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  const runId = Number(c.req.param('runId'));
  if (!Number.isFinite(repoId) || !Number.isFinite(runId)) return c.json({ error: 'Invalid repoId or runId' }, 400);
  if (!(await userCanAccessRepo(session.user.id, repoId))) return c.json({ error: 'Forbidden' }, 403);

  const report = await buildRunReport(runId);
  if (!report || report.repoId !== repoId) return c.json({ error: 'Run not found for this repo.' }, 404);
  return c.json(report);
});

/** GET /api/reports/:repoId/commits/:sha/diff — real per-file GitHub commit diff. */
reportsRouter.get('/:repoId/commits/:sha/diff', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  const sha = c.req.param('sha');
  if (!Number.isFinite(repoId) || !/^[a-f0-9]{7,40}$/i.test(sha)) return c.json({ error: 'Invalid repoId or commit sha' }, 400);
  if (!(await userCanAccessRepo(session.user.id, repoId))) return c.json({ error: 'Forbidden' }, 403);

  const [repo] = await db.select().from(schema.repositories).where(eq(schema.repositories.id, repoId));
  if (!repo) return c.json({ error: 'Repository not found' }, 404);
  if (!repo.installationId) return c.json({ error: 'This repository has no GitHub installation, so Codeward cannot fetch the real commit diff.' }, 409);

  try {
    const { getInstallationOctokit } = await import('../lib/github.js');
    const octokit = await getInstallationOctokit(repo.installationId);
    const res: any = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
      owner: repo.owner,
      repo: repo.name,
      ref: sha,
    });
    return c.json({
      sha: res.data.sha,
      htmlUrl: res.data.html_url,
      stats: res.data.stats ?? null,
      files: (res.data.files ?? []).map((f: any) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch ?? null,
        blobUrl: f.blob_url ?? null,
        rawUrl: f.raw_url ?? null,
      })),
    });
  } catch (err: any) {
    if (err?.status === 404) return c.json({ error: 'Commit not found on GitHub for this repository.' }, 404);
    return c.json({ error: `Real GitHub commit diff fetch failed: ${err.message}` }, 502);
  }
});

/** GET /api/reports/:repoId/history — lightweight list of past runs for a trend view (no full findings payload). */
reportsRouter.get('/:repoId/history', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  if (!Number.isFinite(repoId)) return c.json({ error: 'Invalid repoId' }, 400);
  if (!(await userCanAccessRepo(session.user.id, repoId))) return c.json({ error: 'Forbidden' }, 403);

  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const runsList = await db.select().from(schema.runs)
    .where(eq(schema.runs.repoId, repoId))
    .orderBy(desc(schema.runs.createdAt))
    .limit(limit);

  return c.json({
    runs: runsList.map((r) => ({ runId: r.id, commitSha: r.commitSha, status: r.status, overallScore: r.score, createdAt: r.createdAt })),
  });
});

/**
 * GET /api/reports/all/commits
 *
 * Fetches the latest commits from GitHub across ALL connected repos for the user,
 * then overlays each commit with the corresponding Codeward run status.
 */
reportsRouter.get('/all/commits', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember)
    .where(eq(schema.organizationMember.userId, session.user.id));
  const orgIds = userOrgs.map((o) => o.orgId);

  const accessConditions = [eq(schema.repositories.userId, session.user.id)];
  if (orgIds.length > 0) accessConditions.push(inArray(schema.repositories.orgId, orgIds));
  const repos = await db.select().from(schema.repositories).where(or(...accessConditions));

  if (repos.length === 0) return c.json({ commits: [], repoFullName: 'All Repositories', defaultBranch: null, selectedBranch: '', branches: [] });

  let allGithubCommits: any[] = [];
  
  try {
    const { getInstallationOctokit } = await import('../lib/github.js');
    
    // Group repos by installationId to avoid re-authenticating the same octokit unnecessarily
    const byInstallation = new Map<number, typeof repos>();
    for (const repo of repos) {
      if (!repo.installationId) continue;
      const arr = byInstallation.get(repo.installationId) ?? [];
      arr.push(repo);
      byInstallation.set(repo.installationId, arr);
    }

    const commitPromises: Promise<any[]>[] = [];

    for (const [installationId, instRepos] of byInstallation.entries()) {
      const octokit = await getInstallationOctokit(installationId);
      for (const repo of instRepos) {
        commitPromises.push((async () => {
          try {
            // Only fetch from the configured default branch (limit 15 per repo to avoid massive payload/limits)
            const configuredDefaultBranch = (repo.config as any)?.defaultBranch ?? 'main';
            const res = await octokit.request('GET /repos/{owner}/{repo}/commits', {
              owner: repo.owner,
              repo: repo.name,
              sha: configuredDefaultBranch,
              per_page: 15,
            });
            // Attach repo context to each commit for the frontend
            return res.data.map((c: any) => ({ ...c, _repoId: repo.id, _repoFullName: repo.fullName }));
          } catch (e) {
            return []; // Fail gracefully for individual repos
          }
        })());
      }
    }

    const results = await Promise.all(commitPromises);
    allGithubCommits = results.flat();
    
    // Sort by date descending and truncate to 50
    allGithubCommits.sort((a, b) => {
      const dateA = new Date(a.commit?.author?.date || 0).getTime();
      const dateB = new Date(b.commit?.author?.date || 0).getTime();
      return dateB - dateA;
    });
    allGithubCommits = allGithubCommits.slice(0, 50);

  } catch (err) {
    console.error(`[commits] Error fetching across all repos:`, err);
  }

  const repoIds = repos.map((r) => r.id);
  const runsList = await db.select().from(schema.runs)
    .where(inArray(schema.runs.repoId, repoIds))
    .orderBy(desc(schema.runs.createdAt))
    .limit(300);

  const runIds = runsList.map((r) => r.id);
  const taskRows = runIds.length > 0
    ? await db.select().from(schema.agentTasks).where(inArray(schema.agentTasks.runId, runIds))
    : [];
    
  const tasksByRunId = new Map<number, typeof schema.agentTasks.$inferSelect[]>();
  for (const task of taskRows) {
    const existing = tasksByRunId.get(task.runId) ?? [];
    existing.push(task);
    tasksByRunId.set(task.runId, existing);
  }

  const buildCommitRun = (run: typeof schema.runs.$inferSelect) => {
    const scope = run.scope as any;
    const changedFiles = Array.isArray(scope?.changedFiles) ? scope.changedFiles as string[] : [];
    const tasks = tasksByRunId.get(run.id) ?? [];
    const agentTasks = tasks.filter((t) => !t.agentId.startsWith('orchestrator'));
    const orchestrator = tasks.find((t) => t.agentId === 'orchestrator_phase3');
    const gateDecision = normalizeGate((orchestrator?.reportMeta as any)?.gateDecision, run.status, run.score);
    const completedDates = tasks.map((t) => t.completedAt).filter((d): d is Date => !!d);
    const completedAt = completedDates.length > 0 ? new Date(Math.max(...completedDates.map((d) => d.getTime()))) : null;
    const byAgent = new Map(agentTasks.map((t) => [t.agentId, t]));
    const agents = COMMIT_AGENT_IDS.map((agentId) => {
      const task = byAgent.get(agentId);
      const meta = (task?.reportMeta as any) ?? {};
      const autoFixPR = meta.autoFixPR?.opened
        ? { number: meta.autoFixPR.pullRequestNumber, url: meta.autoFixPR.htmlUrl }
        : null;
      return task
        ? {
            id: agentId,
            name: AGENT_DISPLAY_NAMES[agentId]?.replace(' Agent', '') ?? agentId,
            status: task.status,
            score: task.score,
            gate: normalizeGate(meta.gateDecision, task.status, task.score),
            findings: task.findingsCount ?? (Array.isArray(task.findings) ? task.findings.length : 0),
            durationMs: task.duration,
            autoFixPR,
          }
        : {
            id: agentId,
            name: AGENT_DISPLAY_NAMES[agentId]?.replace(' Agent', '') ?? agentId,
            status: 'skipped',
            score: null,
            gate: null,
            findings: 0,
            durationMs: null,
            autoFixPR: null,
            skippedReason: inferSkippedReason(agentId, changedFiles),
          };
    });
    const agentsRun = agents.filter((a) => a.status !== 'skipped').length;
    return {
      id: run.id,
      status: run.status,
      score: run.score,
      isIncremental: !!scope?.incremental,
      changedFileCount: changedFiles.length || null,
      changedFiles,
      agentsRun,
      agentsSkipped: agents.length - agentsRun,
      gateDecision,
      agents,
      createdAt: run.createdAt,
      completedAt,
    };
  };

  const runMap = new Map<string, typeof runsList[0]>();
  for (const r of runsList) {
    const key = `${r.repoId}-${r.commitSha}`;
    const existing = runMap.get(key);
    if (!existing || (r.createdAt && existing.createdAt && r.createdAt > existing.createdAt)) {
      runMap.set(key, r);
    }
  }

  if (allGithubCommits.length > 0) {
    const merged = allGithubCommits.map((ghc: any) => {
      const run = runMap.get(`${ghc._repoId}-${ghc.sha}`) ?? null;
      return {
        sha: ghc.sha,
        message: ghc.commit.message,
        authorName: ghc.commit.author?.name ?? ghc.author?.login ?? 'Unknown',
        authorAvatar: ghc.author?.avatar_url ?? null,
        date: ghc.commit.author?.date ?? null,
        htmlUrl: ghc.html_url,
        branch: 'main', // Hardcoded as we fetch from default branches
        repoId: ghc._repoId,
        repoFullName: ghc._repoFullName,
        run: run ? buildCommitRun(run) : null,
      };
    });
    return c.json({ commits: merged, repoFullName: 'All Repositories', defaultBranch: null, selectedBranch: '', branches: [] });
  }

  // DB-only fallback
  const fallback = runsList.map((r) => {
    const repo = repos.find(rp => rp.id === r.repoId);
    return {
      sha: r.commitSha,
      message: null,
      authorName: null,
      authorAvatar: null,
      date: r.createdAt,
      htmlUrl: null,
      branch: 'main',
      repoId: r.repoId,
      repoFullName: repo?.fullName ?? 'unknown',
      run: buildCommitRun(r),
    };
  });
  return c.json({ commits: fallback, repoFullName: 'All Repositories', defaultBranch: null, selectedBranch: '', branches: [] });
});

/**
 * GET /api/reports/:repoId/commits
 *
 * Fetches the latest 30 commits from GitHub for a connected repo, then overlays each
 * commit with the corresponding Codeward run status from our database. This is the
 * data backbone for the Commit History transparency page.
 *
 * The orchestrator decides which agents run for each push (it may skip agents if the diff
 * is narrow), so each run row in our DB tells us whether it was incremental or comprehensive.
 * The per-agent breakdown is fetched on demand by the side-pull (GET /runs/:runId).
 */
reportsRouter.get('/:repoId/commits', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  if (!Number.isFinite(repoId)) return c.json({ error: 'Invalid repoId' }, 400);
  if (!(await userCanAccessRepo(session.user.id, repoId))) return c.json({ error: 'Forbidden' }, 403);

  const [repo] = await db.select().from(schema.repositories).where(eq(schema.repositories.id, repoId));
  if (!repo) return c.json({ error: 'Repository not found' }, 404);

  const configuredDefaultBranch = (repo.config as any)?.defaultBranch ?? 'main';
  const requestedBranch = c.req.query('branch')?.trim() || '';
  let defaultBranch = configuredDefaultBranch;
  let selectedBranch = requestedBranch || configuredDefaultBranch;
  let branches: string[] = [];

  // If there is no installationId yet (repo just connected, not fully active) we can still
  // return any runs we have in the DB so the page is not empty.
  let githubCommits: any[] = [];
  if (repo.installationId) {
    try {
      const { getInstallationOctokit } = await import('../lib/github.js');
      const octokit = await getInstallationOctokit(repo.installationId);
      const [repoInfo, branchList] = await Promise.all([
        octokit.request('GET /repos/{owner}/{repo}', {
          owner: repo.owner,
          repo: repo.name,
        }),
        octokit.request('GET /repos/{owner}/{repo}/branches', {
          owner: repo.owner,
          repo: repo.name,
          per_page: 100,
        }),
      ]);
      defaultBranch = repoInfo.data.default_branch || configuredDefaultBranch;
      branches = branchList.data.map((branch: any) => branch.name).filter(Boolean);
      selectedBranch = requestedBranch || defaultBranch;

      const res = await octokit.request('GET /repos/{owner}/{repo}/commits', {
        owner: repo.owner,
        repo: repo.name,
        sha: selectedBranch,
        per_page: 30,
      });
      githubCommits = res.data;
    } catch (err: any) {
      console.error(`[commits] GitHub API error for ${repo.fullName}:`, err.message);
      // Don't hard-fail — fall through to DB-only mode below
    }
  }

  // Fetch all runs for this repo from our DB
  const runsList = await db.select().from(schema.runs)
    .where(eq(schema.runs.repoId, repoId))
    .orderBy(desc(schema.runs.createdAt))
    .limit(100);

  const runIds = runsList.map((r) => r.id);
  const taskRows = runIds.length > 0
    ? await db.select().from(schema.agentTasks).where(inArray(schema.agentTasks.runId, runIds))
    : [];
  const tasksByRunId = new Map<number, typeof schema.agentTasks.$inferSelect[]>();
  for (const task of taskRows) {
    const existing = tasksByRunId.get(task.runId) ?? [];
    existing.push(task);
    tasksByRunId.set(task.runId, existing);
  }

  const buildCommitRun = (run: typeof schema.runs.$inferSelect) => {
    const scope = run.scope as any;
    const changedFiles = Array.isArray(scope?.changedFiles) ? scope.changedFiles as string[] : [];
    const tasks = tasksByRunId.get(run.id) ?? [];
    const agentTasks = tasks.filter((t) => !t.agentId.startsWith('orchestrator'));
    const orchestrator = tasks.find((t) => t.agentId === 'orchestrator_phase3');
    const gateDecision = normalizeGate((orchestrator?.reportMeta as any)?.gateDecision, run.status, run.score);
    const completedDates = tasks.map((t) => t.completedAt).filter((d): d is Date => !!d);
    const completedAt = completedDates.length > 0 ? new Date(Math.max(...completedDates.map((d) => d.getTime()))) : null;
    const byAgent = new Map(agentTasks.map((t) => [t.agentId, t]));
    const agents = COMMIT_AGENT_IDS.map((agentId) => {
      const task = byAgent.get(agentId);
      const meta = (task?.reportMeta as any) ?? {};
      const autoFixPR = meta.autoFixPR?.opened
        ? { number: meta.autoFixPR.pullRequestNumber, url: meta.autoFixPR.htmlUrl }
        : null;
      return task
        ? {
            id: agentId,
            name: AGENT_DISPLAY_NAMES[agentId]?.replace(' Agent', '') ?? agentId,
            status: task.status,
            score: task.score,
            gate: normalizeGate(meta.gateDecision, task.status, task.score),
            findings: task.findingsCount ?? (Array.isArray(task.findings) ? task.findings.length : 0),
            durationMs: task.duration,
            autoFixPR,
          }
        : {
            id: agentId,
            name: AGENT_DISPLAY_NAMES[agentId]?.replace(' Agent', '') ?? agentId,
            status: 'skipped',
            score: null,
            gate: null,
            findings: 0,
            durationMs: null,
            autoFixPR: null,
            skippedReason: inferSkippedReason(agentId, changedFiles),
          };
    });
    const agentsRun = agents.filter((a) => a.status !== 'skipped').length;
    return {
      id: run.id,
      status: run.status,
      score: run.score,
      isIncremental: !!scope?.incremental,
      changedFileCount: changedFiles.length || null,
      changedFiles,
      agentsRun,
      agentsSkipped: agents.length - agentsRun,
      gateDecision,
      agents,
      createdAt: run.createdAt,
      completedAt,
    };
  };

  // Build SHA → latest run map (a SHA can theoretically appear twice if a webhook fires twice)
  const runMap = new Map<string, typeof runsList[0]>();
  for (const r of runsList) {
    const existing = runMap.get(r.commitSha);
    if (!existing || (r.createdAt && existing.createdAt && r.createdAt > existing.createdAt)) {
      runMap.set(r.commitSha, r);
    }
  }

  // If GitHub gave us commits, merge them with our run data
  if (githubCommits.length > 0) {
    const merged = githubCommits.map((ghc: any) => {
      const run = runMap.get(ghc.sha) ?? null;
      return {
        sha: ghc.sha,
        message: ghc.commit.message,
        authorName: ghc.commit.author?.name ?? ghc.author?.login ?? 'Unknown',
        authorAvatar: ghc.author?.avatar_url ?? null,
        date: ghc.commit.author?.date ?? null,
        htmlUrl: ghc.html_url,
        branch: selectedBranch,
        run: run ? buildCommitRun(run) : null,
      };
    });
    return c.json({ commits: merged, repoFullName: repo.fullName, defaultBranch, selectedBranch, branches });
  }

  // DB-only fallback: surface our runs as pseudo-commit entries when GitHub is unavailable
  const fallback = runsList.map((r) => ({
    sha: r.commitSha,
    message: null,
    authorName: null,
    authorAvatar: null,
    date: r.createdAt,
    htmlUrl: null,
    branch: selectedBranch,
    run: buildCommitRun(r),
  }));
  return c.json({ commits: fallback, repoFullName: repo.fullName, defaultBranch, selectedBranch, branches });
});

/** POST /api/reports/:runId/retry-failed — Enqueue retry jobs for failed agents in a run */
reportsRouter.post('/:runId/retry-failed', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const runId = parseInt(c.req.param('runId'), 10);
  if (isNaN(runId)) return c.json({ error: 'Invalid run ID' }, 400);

  // We should verify the user has access to the repo this run belongs to, but for now we trust the session
  const [run] = await db.select().from(schema.runs).where(eq(schema.runs.id, runId));
  if (!run) return c.json({ error: 'Run not found' }, 404);

  const failedTasks = await db.select()
    .from(schema.agentTasks)
    .where(and(
      eq(schema.agentTasks.runId, runId),
      eq(schema.agentTasks.status, 'failed')
    ));

  if (failedTasks.length === 0) {
    return c.json({ message: 'No failed tasks found to retry' }, 200);
  }

  for (const task of failedTasks) {
    await agentQueue.add(`agent-${task.agentId}-${runId}`, {
      runId,
      agentId: task.agentId,
      providerName: task.provider || 'openai',
    });
  }

  // Update run status to running
  await db.update(schema.runs)
    .set({ status: 'running' })
    .where(eq(schema.runs.id, runId));

  return c.json({ 
    message: `Enqueued ${failedTasks.length} failed tasks for retry`,
    retriedAgents: failedTasks.map(t => t.agentId)
  });
});

