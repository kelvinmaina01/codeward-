import { tool } from 'ai';
import { z } from 'zod';
import { db } from '../../../db/index.js';
import { runs, agentTasks, repositories, organizationMember } from '../../../db/schema.js';
import { eq, and, desc, gte, inArray } from 'drizzle-orm';

/**
 * Gordon's Phase-0 toolset: REAL, DB-backed, and auth-scoped to the signed-in user.
 *
 * Every tool that takes a repoId first proves the user can see that repo (owns it, or is a
 * member of its org) via assertRepoAccess — a chat agent must never read another tenant's runs
 * or findings just because the model was handed an arbitrary id. These are all read-only;
 * action tools (spawn/fix/merge) arrive in Phase 1 behind an explicit confirmation gate.
 */

async function accessibleRepoIds(userId: string): Promise<number[]> {
  const owned = await db.select({ id: repositories.id }).from(repositories).where(eq(repositories.userId, userId));
  const memberships = await db.select({ orgId: organizationMember.orgId }).from(organizationMember).where(eq(organizationMember.userId, userId));
  const orgIds = memberships.map((m) => m.orgId);
  let orgRepos: { id: number }[] = [];
  if (orgIds.length > 0) {
    orgRepos = await db.select({ id: repositories.id }).from(repositories).where(inArray(repositories.orgId, orgIds));
  }
  return [...new Set([...owned.map((r) => r.id), ...orgRepos.map((r) => r.id)])];
}

async function assertRepoAccess(userId: string, repoId: number): Promise<boolean> {
  const ids = await accessibleRepoIds(userId);
  return ids.includes(repoId);
}

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };

export function createGordonTools(userId: string) {
  return {
    list_repositories: tool({
      description: "List the repositories this user can see, each with its latest run's score, status and date. Call this first when the user hasn't named a specific repo, so you can resolve which repo they mean and use the numeric repoId in later tools.",
      inputSchema: z.object({}),
      execute: async () => {
        const ids = await accessibleRepoIds(userId);
        if (ids.length === 0) return { repositories: [], note: 'This user has no connected repositories yet.' };
        const repos = await db.select().from(repositories).where(inArray(repositories.id, ids));
        const out = [];
        for (const r of repos) {
          const [latest] = await db.select().from(runs).where(eq(runs.repoId, r.id)).orderBy(desc(runs.createdAt)).limit(1);
          out.push({
            repoId: r.id, fullName: r.fullName, language: r.language, isPrivate: r.isPrivate,
            paused: r.paused, autoFixEnabled: r.autoFixEnabled,
            latestScore: latest?.score ?? null, latestRunStatus: latest?.status ?? null, latestRunAt: latest?.createdAt ?? null,
          });
        }
        return { repositories: out };
      },
    }),

    query_run_history: tool({
      description: 'Fetch recent real agent runs for a repo, including each agent\'s score, status and findings count. Use this to answer questions about repo health, recent scans, or what the agents found.',
      inputSchema: z.object({
        repoId: z.number().describe('Numeric repository id from list_repositories'),
        limit: z.number().optional().default(5),
        agentId: z.string().optional().describe('Filter to one agent, e.g. "security", "bloat"'),
        sinceIso: z.string().optional().describe('ISO date; only runs at or after this time'),
      }),
      execute: async ({ repoId, limit, agentId, sinceIso }) => {
        if (!(await assertRepoAccess(userId, repoId))) return { error: 'You do not have access to that repository.' };
        const conditions = [eq(runs.repoId, repoId)];
        if (sinceIso) conditions.push(gte(runs.createdAt, new Date(sinceIso)));
        const runRows = await db.select().from(runs).where(and(...conditions)).orderBy(desc(runs.createdAt)).limit(limit ?? 5);
        const result = [];
        for (const run of runRows) {
          const taskConds = [eq(agentTasks.runId, run.id)];
          if (agentId) taskConds.push(eq(agentTasks.agentId, agentId));
          const tasks = await db.select().from(agentTasks).where(and(...taskConds));
          result.push({
            runId: run.id, commitSha: run.commitSha, status: run.status, overallScore: run.score, executedAt: run.createdAt,
            agents: tasks.map((t) => ({ agentId: t.agentId, status: t.status, score: t.score, findingsCount: t.findingsCount ?? (Array.isArray(t.findings) ? (t.findings as unknown[]).length : 0) })),
          });
        }
        return { runs: result };
      },
    }),

    get_finding_details: tool({
      description: 'Return the exact stored record for one finding so you can explain it accurately. Never invent an explanation — read the real finding and explain WHY it matters.',
      inputSchema: z.object({ runId: z.number(), agentId: z.string(), findingId: z.string() }),
      execute: async ({ runId, agentId, findingId }) => {
        const [task] = await db.select().from(agentTasks).where(and(eq(agentTasks.runId, runId), eq(agentTasks.agentId, agentId)));
        if (!task) return { error: `No ${agentId} task found for run ${runId}.` };
        const run = (await db.select({ repoId: runs.repoId }).from(runs).where(eq(runs.id, runId)))[0];
        if (!run?.repoId || !(await assertRepoAccess(userId, run.repoId))) return { error: 'You do not have access to that run.' };
        const finding = (task.findings as any[] | null)?.find((f) => String(f.id) === String(findingId));
        if (!finding) return { error: `No finding ${findingId} in run ${runId} / ${agentId}.` };
        return { finding };
      },
    }),

    search_findings: tool({
      description: "Full-text search across a repo's real findings (all runs) for a term like a filename, category, or keyword.",
      inputSchema: z.object({ repoId: z.number(), query: z.string(), limit: z.number().optional().default(10) }),
      execute: async ({ repoId, query, limit }) => {
        if (!(await assertRepoAccess(userId, repoId))) return { error: 'You do not have access to that repository.' };
        const runRows = await db.select({ id: runs.id }).from(runs).where(eq(runs.repoId, repoId));
        if (runRows.length === 0) return { findings: [] };
        const tasks = await db.select().from(agentTasks).where(inArray(agentTasks.runId, runRows.map((r) => r.id)));
        const q = query.toLowerCase();
        const matches = tasks.flatMap((t) => ((t.findings as any[] | null) ?? [])
          .filter((f) => JSON.stringify(f).toLowerCase().includes(q))
          .map((f) => ({ ...f, agentId: t.agentId, runId: t.runId })));
        return { findings: matches.slice(0, limit ?? 10), totalMatches: matches.length };
      },
    }),

    get_fix_priority_list: tool({
      description: "Build a prioritized fix list from the latest real run's findings, sorted by severity. Use when the user asks what to fix first.",
      inputSchema: z.object({ repoId: z.number() }),
      execute: async ({ repoId }) => {
        if (!(await assertRepoAccess(userId, repoId))) return { error: 'You do not have access to that repository.' };
        const [latest] = await db.select().from(runs).where(eq(runs.repoId, repoId)).orderBy(desc(runs.createdAt)).limit(1);
        if (!latest) return { priorityList: [], note: 'No runs for this repo yet.' };
        const tasks = await db.select().from(agentTasks).where(eq(agentTasks.runId, latest.id));
        const all = tasks.flatMap((t) => ((t.findings as any[] | null) ?? []).map((f) => ({ ...f, agentId: t.agentId })));
        all.sort((a, b) => (SEVERITY_RANK[String(a.severity).toUpperCase()] ?? 9) - (SEVERITY_RANK[String(b.severity).toUpperCase()] ?? 9));
        return { runId: latest.id, totalFindings: all.length, priorityList: all.map((f, i) => ({ rank: i + 1, ...f })) };
      },
    }),

    get_health_trend: tool({
      description: 'Compute a real score trend for a repo over the last N days from run history.',
      inputSchema: z.object({ repoId: z.number(), days: z.number().optional().default(30) }),
      execute: async ({ repoId, days }) => {
        if (!(await assertRepoAccess(userId, repoId))) return { error: 'You do not have access to that repository.' };
        const since = new Date(Date.now() - (days ?? 30) * 86400000);
        const rows = await db.select().from(runs).where(and(eq(runs.repoId, repoId), gte(runs.createdAt, since))).orderBy(desc(runs.createdAt));
        if (rows.length === 0) return { trend: 'unknown', note: 'No runs in this timeframe.' };
        const current = rows[0].score, oldest = rows[rows.length - 1].score;
        const trend = current == null || oldest == null ? 'unknown' : current > oldest ? 'improving' : current < oldest ? 'declining' : 'stable';
        return { currentScore: current, scoreAtStart: oldest, trend, dataPoints: rows.map((r) => ({ date: r.createdAt, score: r.score })) };
      },
    }),

    compare_repos: tool({
      description: 'Compare latest real run scores across several of the user\'s repos, ranked best to worst.',
      inputSchema: z.object({ repoIds: z.array(z.number()) }),
      execute: async ({ repoIds }) => {
        const comparison = [];
        for (const repoId of repoIds) {
          if (!(await assertRepoAccess(userId, repoId))) { comparison.push({ repoId, error: 'no access' }); continue; }
          const [repo] = await db.select().from(repositories).where(eq(repositories.id, repoId));
          const [latest] = await db.select().from(runs).where(eq(runs.repoId, repoId)).orderBy(desc(runs.createdAt)).limit(1);
          comparison.push({ repoId, repoName: repo?.fullName ?? 'unknown', latestScore: latest?.score ?? null, latestRunAt: latest?.createdAt ?? null });
        }
        comparison.sort((a, b) => ((b as any).latestScore ?? -1) - ((a as any).latestScore ?? -1));
        return { comparison: comparison.map((c, i) => ({ ranking: i + 1, ...c })) };
      },
    }),
  };
}
