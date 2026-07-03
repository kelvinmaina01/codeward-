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
          // Honest status label: nothing auto-applies fixes yet, so every non-dismissed finding
          // is "Suggested" — real data, not a claim of work that hasn't been built.
          fixStatus: f.dismissed ? 'dismissed' : 'suggested',
          suggestedFix: f.suggestedFix ?? f.suggestedRefactor ?? null,
          refactorSafe: f.refactorSafe ?? null,
          dismissed: !!f.dismissed,
          dismissalReason: f.dismissalReason ?? null,
        })),
        toolsExecuted: meta.toolsExecuted ?? [],
        summary: meta.summary ?? null,
        error: t.error ?? null,
      };
    });

  const allFindings = agents.flatMap((a) => a.findings);
  const severityCounts = allFindings.reduce((acc: Record<string, number>, f) => {
    const key = String(f.severity).toUpperCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

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
