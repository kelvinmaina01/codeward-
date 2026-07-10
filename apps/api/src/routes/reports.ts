import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, or, inArray, desc } from 'drizzle-orm';

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
  return c.json({
    runs: recentRuns.map((r) => ({
      runId: r.id,
      repoId: r.repoId,
      repoFullName: r.repoId != null ? repoById.get(r.repoId)?.fullName ?? 'unknown' : 'unknown',
      commitSha: r.commitSha,
      status: r.status,
      overallScore: r.score,
      createdAt: r.createdAt,
    })),
  });
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

  // If there is no installationId yet (repo just connected, not fully active) we can still
  // return any runs we have in the DB so the page is not empty.
  let githubCommits: any[] = [];
  if (repo.installationId) {
    try {
      const { getInstallationOctokit } = await import('../lib/github.js');
      const octokit = await getInstallationOctokit(repo.installationId);
      const res = await octokit.request('GET /repos/{owner}/{repo}/commits', {
        owner: repo.owner,
        repo: repo.name,
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
        run: run
          ? {
              id: run.id,
              status: run.status,
              score: run.score,
              // scope tells the UI whether this was incremental (only changed files) or comprehensive
              isIncremental: !!(run.scope as any)?.incremental,
              changedFileCount: (run.scope as any)?.changedFiles?.length ?? null,
              createdAt: run.createdAt,
            }
          : null,
      };
    });
    return c.json({ commits: merged, repoFullName: repo.fullName });
  }

  // DB-only fallback: surface our runs as pseudo-commit entries when GitHub is unavailable
  const fallback = runsList.map((r) => ({
    sha: r.commitSha,
    message: null,
    authorName: null,
    authorAvatar: null,
    date: r.createdAt,
    htmlUrl: null,
    run: {
      id: r.id,
      status: r.status,
      score: r.score,
      isIncremental: !!(r.scope as any)?.incremental,
      changedFileCount: (r.scope as any)?.changedFiles?.length ?? null,
      createdAt: r.createdAt,
    },
  }));
  return c.json({ commits: fallback, repoFullName: repo.fullName });
});
