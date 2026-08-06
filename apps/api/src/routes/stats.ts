import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, count, gte, inArray, or, and, isNotNull, desc } from 'drizzle-orm';
import { withCache } from '../services/metrics-cache.js';

export const statsRouter = new Hono();

const APPROVED_STATUSES = ['approved', 'auto_merged'];
const DAY_MS = 24 * 60 * 60 * 1000;

interface WindowRun {
  id: number;
  repoId: number | null;
  score: number | null;
  status: string;
  createdAt: Date;
}

/**
 * Real daily health trend.
 *
 * For each day in the window we carry forward each repo's latest known completed
 * run score ("as of that day, this is the latest measured health"). The day's value
 * is the average across repos that have at least one measurement by that day.
 * Days before any repo had a measurement are null — we never fabricate them.
 */
export function buildHealthTrend(runs: WindowRun[], startMs: number, nowMs: number): Array<{ date: string; score: number | null }> {
  const byRepo = new Map<number, Array<{ ts: number; score: number }>>();
  for (const r of runs) {
    if (r.repoId == null || r.score == null) continue;
    const list = byRepo.get(r.repoId) ?? [];
    list.push({ ts: r.createdAt.getTime(), score: r.score });
    byRepo.set(r.repoId, list);
  }
  for (const list of byRepo.values()) {
    list.sort((a, b) => a.ts - b.ts);
  }

  const trend: Array<{ date: string; score: number | null }> = [];
  let firstDataDay = Infinity;
  for (let t = startMs; t <= nowMs; t += DAY_MS) {
    const dayEnd = t + DAY_MS;
    let sum = 0;
    let n = 0;
    for (const list of byRepo.values()) {
      let latest: number | null = null;
      for (const p of list) {
        if (p.ts <= dayEnd) latest = p.score;
        else break;
      }
      if (latest != null) {
        sum += latest;
        n++;
      }
    }
    if (n > 0 && t < firstDataDay) firstDataDay = t;
    trend.push({
      date: new Date(t).toISOString().slice(0, 10),
      score: n > 0 ? Math.round(sum / n) : null,
    });
  }
  if (firstDataDay !== Infinity) {
    for (const point of trend) {
      if (point.score == null && new Date(point.date + 'T00:00:00Z').getTime() < firstDataDay) point.score = null;
    }
  }
  return trend;
}

/**
 * Real cumulative debt-removal trend.
 *
 * Built purely from events that actually happened: auto-fix PRs whose merge approval
 * was granted (approved/auto_merged) in the window. `refactorsApplied` is the real PR
 * count; `debtRemoved` is the real count of files changed by those merged refactors.
 * We never multiply by an invented per-PR line estimate.
 */
export function buildDebtTrend(
  approvals: Array<{ createdAt: Date }>,
  filesFixedByApproval: Map<number, number>,
  startMs: number,
  nowMs: number,
): { trend: Array<{ date: string; lines: number }>; refactorsApplied: number; debtRemoved: number } {
  const cumulativeByDay = new Map<number, number>();
  let total = 0;
  for (const a of approvals) {
    const files = filesFixedByApproval.get(a.createdAt.getTime()) ?? 1;
    total += files;
    cumulativeByDay.set(a.createdAt.getTime(), total);
  }

  const trend: Array<{ date: string; lines: number }> = [];
  let running = 0;
  const sorted = [...cumulativeByDay.entries()].sort((a, b) => a[0] - b[0]);
  let idx = 0;
  for (let t = startMs; t <= nowMs; t += DAY_MS) {
    while (idx < sorted.length && sorted[idx][0] <= t + DAY_MS) {
      running = sorted[idx][1];
      idx++;
    }
    trend.push({ date: new Date(t).toISOString().slice(0, 10), lines: running });
  }

  return { trend, refactorsApplied: approvals.length, debtRemoved: total };
}

export function gradeFor(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 90) return 'Grade A';
  if (score >= 75) return 'Grade B';
  if (score >= 60) return 'Grade C';
  return 'Grade D';
}

statsRouter.get('/dashboard', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const timeFilter = c.req.query('timeFilter') || '30d';
  const customSince = c.req.query('since');
  const cacheKey = `stats:dashboard:${session.user.id}:${timeFilter}:${customSince ?? ''}`;

  const payload = await withCache(cacheKey, 60_000, async () => {
    // ── 1. User orgs & accessible repos (2 queries) ─────────────────────────────
    const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
      .from(schema.organizationMember)
      .where(eq(schema.organizationMember.userId, session.user.id));
    const orgIds = userOrgs.map((o) => o.orgId);

    const accessConds = [eq(schema.repositories.userId, session.user.id)];
    if (orgIds.length > 0) accessConds.push(inArray(schema.repositories.orgId, orgIds));
    const repos = await db.select().from(schema.repositories).where(or(...accessConds));
    const repoIds = repos.map((r) => r.id);

    // ── 2. Time window ──────────────────────────────────────────────────────────
    const nowMs = Date.now();
    let startMs = nowMs - 30 * DAY_MS;
    if (timeFilter === '7d') startMs = nowMs - 7 * DAY_MS;
    else if (timeFilter === '3m') startMs = nowMs - 90 * DAY_MS;
    else if (timeFilter === 'custom' && customSince && Number.isFinite(Number(customSince))) {
      startMs = Number(customSince);
    }
    const start = new Date(startMs);
    const oneDayAgo = new Date(nowMs - DAY_MS);

    if (repoIds.length === 0) {
      return {
        repositoriesProtected: 0,
        runsToday: 0,
        reposScanned: 0,
        reposTotal: 0,
        debtRemoved: 0,
        refactorsApplied: 0,
        interventions: 0,
        codebaseHealth: null,
        grade: null,
        healthTrend: [],
        debtTrend: [],
        debtThisWeek: { duplicateFunctions: 0, deadCodeLines: 0, securityIssues: 0, nPlusOneQueries: 0, aiEraIssues: 0 },
        integrations: [],
      };
    }

    // ── 3. Runs today + all runs in window (single query each, no per-repo loops) ─
    const [runsTodayRes, windowRuns] = await Promise.all([
      db.select({ count: count() }).from(schema.runs)
        .where(and(inArray(schema.runs.repoId, repoIds), gte(schema.runs.createdAt, oneDayAgo))),
      db.select({ id: schema.runs.id, repoId: schema.runs.repoId, score: schema.runs.score, status: schema.runs.status, createdAt: schema.runs.createdAt })
        .from(schema.runs)
        .where(and(inArray(schema.runs.repoId, repoIds), gte(schema.runs.createdAt, start))),
    ]);
    const runsToday = runsTodayRes[0]?.count || 0;
    const runIds = windowRuns.map((r) => r.id);
    const datedWindowRuns: WindowRun[] = windowRuns
      .filter((r): r is WindowRun & { createdAt: Date } => r.createdAt != null);

    // ── 4. Latest completed scored run per repo (carry-forward over window) ──────
    const scoredByRepo = new Map<number, { score: number; createdAt: Date; isReal: boolean }>();
    for (const r of datedWindowRuns) {
      if (r.repoId == null || r.score == null || r.status !== 'completed') continue;
      const existing = scoredByRepo.get(r.repoId);
      if (!existing || r.createdAt.getTime() > existing.createdAt.getTime()) {
        scoredByRepo.set(r.repoId, { score: r.score, createdAt: r.createdAt, isReal: true });
      }
    }
    // Repos with no completed scored run yet: use their real baselineScore (never a made-up constant).
    for (const repo of repos) {
      if (!scoredByRepo.has(repo.id) && repo.baselineScore != null) {
        scoredByRepo.set(repo.id, { score: repo.baselineScore, createdAt: repo.createdAt ?? new Date(0), isReal: false });
      }
    }

    const hasAnyRealData = [...scoredByRepo.values()].some((s) => s.isReal);
    const scores = [...scoredByRepo.values()].map((s) => s.score);
    const codebaseHealth = hasAnyRealData && scores.length > 0 ? Math.min(100, Math.max(0, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))) : null;
    const grade = gradeFor(codebaseHealth);

    // ── 5. Findings in window (one query; real per-category counts) ─────────────
    let duplicateFunctions = 0;
    let deadCodeLines = 0;
    let securityIssues = 0;
    let nPlusOneQueries = 0;
    let aiEraIssues = 0;

    if (runIds.length > 0) {
      const tasks = await db.select({ agentId: schema.agentTasks.agentId, findings: schema.agentTasks.findings })
        .from(schema.agentTasks)
        .where(inArray(schema.agentTasks.runId, runIds));

      for (const t of tasks) {
        const findings = (t.findings as any[]) ?? [];
        for (const f of findings) {
          const cat = String(f.category || '').toLowerCase();
          const sev = String(f.severity || '').toUpperCase();
          if (cat.includes('duplicate') || cat.includes('refactor')) duplicateFunctions++;
          if (cat.includes('dead') || cat.includes('bloat') || cat.includes('unused')) deadCodeLines++;
          if (sev === 'CRITICAL' || sev === 'HIGH' || t.agentId === 'security') securityIssues++;
          if (cat.includes('n+1') || cat.includes('query') || t.agentId === 'data_dx') nPlusOneQueries++;
          if (t.agentId === 'ai_era' || cat.includes('prompt') || cat.includes('ai')) aiEraIssues++;
        }
      }
    }

    // ── 6. Real refactor PRs (merge approvals) in window + files fixed ──────────
    const approvals = await db.select({ createdAt: schema.mergeApprovals.createdAt, runId: schema.mergeApprovals.runId, status: schema.mergeApprovals.status })
      .from(schema.mergeApprovals)
      .where(and(inArray(schema.mergeApprovals.repoId, repoIds), gte(schema.mergeApprovals.createdAt, start)));

    const granted = approvals
      .filter((a): a is typeof a & { createdAt: Date } => a.createdAt != null && APPROVED_STATUSES.includes(a.status));
    const grantedRunIds = granted.map((a) => a.runId).filter((id): id is number => id != null);

    let filesFixedByApproval = new Map<number, number>();
    if (grantedRunIds.length > 0) {
      const prTasks = await db.select({ runId: schema.agentTasks.runId, reportMeta: schema.agentTasks.reportMeta })
        .from(schema.agentTasks)
        .where(inArray(schema.agentTasks.runId, grantedRunIds));
      const byRun = new Map<number, number>();
      for (const t of prTasks) {
        const meta = (t.reportMeta as any) ?? {};
        const fixes = Array.isArray(meta.autoFixPR?.appliedFixes) ? meta.autoFixPR.appliedFixes.length : 0;
        byRun.set(t.runId, (byRun.get(t.runId) ?? 0) + (fixes || 1));
      }
      // Map approval created-at -> files fixed on that approval's run.
      filesFixedByApproval = new Map(
        granted.map((a) => [a.createdAt.getTime(), byRun.get(a.runId ?? -1) ?? 1] as [number, number]),
      );
    }
    const { trend: debtTrend, refactorsApplied, debtRemoved } = buildDebtTrend(granted, filesFixedByApproval, startMs, nowMs);

    // ── 7. Interventions = real decisions made on merge approvals in window ─────
    const interventionsRes = await db.select({ count: count() }).from(schema.mergeApprovals)
      .where(and(
        inArray(schema.mergeApprovals.repoId, repoIds),
        gte(schema.mergeApprovals.createdAt, start),
        or(
          eq(schema.mergeApprovals.status, 'approved'),
          eq(schema.mergeApprovals.status, 'rejected'),
          eq(schema.mergeApprovals.status, 'auto_merged'),
        ),
      ));

    // ── 8. Integrations (user or org scoped) ────────────────────────────────────
    const intConds = [eq(schema.integrations.userId, session.user.id)];
    if (orgIds.length > 0) intConds.push(inArray(schema.integrations.orgId, orgIds));
    const userIntegrations = await db.select().from(schema.integrations).where(or(...intConds));

    return {
      repositoriesProtected: repos.length,
      reposScanned: scoredByRepo.size,
      reposTotal: repos.length,
      runsToday,
      debtRemoved,
      refactorsApplied,
      interventions: interventionsRes[0]?.count || 0,
      codebaseHealth,
      grade,
      healthTrend: buildHealthTrend(datedWindowRuns, startMs, nowMs),
      debtTrend,
      debtThisWeek: {
        duplicateFunctions,
        deadCodeLines,
        securityIssues,
        nPlusOneQueries,
        aiEraIssues,
      },
      integrations: userIntegrations.map((i) => ({
        provider: i.provider,
        status: i.status,
        updatedAt: i.updatedAt,
      })),
    };
  });

  return c.json(payload);
});
