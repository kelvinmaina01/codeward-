import { tool } from 'ai';
import { z } from 'zod';
import { db } from '../../../db/index.js';
import { runs, agentTasks, repositories, organizationMember, mergeApprovals, agentMemory, gordonEvents } from '../../../db/schema.js';
import { eq, and, desc, gte, inArray } from 'drizzle-orm';

/**
 * Fire-and-forget telemetry for one tool call. Never awaited by the caller and never throws
 * into it — a logging failure must not break the chat. repoId is pulled from the input when
 * present (every repo-scoped tool names it `repoId`) purely for cheap per-repo analytics;
 * output is capped so a huge file read doesn't bloat the table.
 */
function logGordonEvent(params: {
  userId: string; sessionId: string | undefined; toolName: string; input: unknown;
  output: unknown; success: boolean; errorText?: string; requiredApproval: boolean; durationMs: number;
}) {
  const repoId = typeof (params.input as any)?.repoId === 'number' ? (params.input as any).repoId : null;
  const outputStr = JSON.stringify(params.output ?? null);
  db.insert(gordonEvents).values({
    userId: params.userId, sessionId: params.sessionId ?? null, toolName: params.toolName, repoId,
    input: params.input as object, outputSummary: { preview: outputStr.slice(0, 2000), truncated: outputStr.length > 2000 },
    success: params.success, errorText: params.errorText ?? null,
    requiredApproval: params.requiredApproval, durationMs: params.durationMs,
  }).catch((e) => console.error('[Gordon telemetry] insert failed (non-fatal):', (e as Error).message));
}

/** Wraps every tool's execute() with timing + outcome logging, preserving schema/approval flags. */
function withTelemetry<T extends Record<string, any>>(tools: T, userId: string, sessionId: string | undefined): T {
  const wrapped: Record<string, any> = {};
  for (const [name, def] of Object.entries(tools)) {
    const originalExecute = def.execute;
    wrapped[name] = {
      ...def,
      execute: async (input: unknown, options: unknown) => {
        const t0 = Date.now();
        try {
          const output = await originalExecute(input, options);
          logGordonEvent({ userId, sessionId, toolName: name, input, output, success: true, requiredApproval: !!def.needsApproval, durationMs: Date.now() - t0 });
          return output;
        } catch (e) {
          logGordonEvent({ userId, sessionId, toolName: name, input, output: null, success: false, errorText: (e as Error).message, requiredApproval: !!def.needsApproval, durationMs: Date.now() - t0 });
          throw e;
        }
      },
    };
  }
  return wrapped as T;
}

/**
 * Gordon's Phase-0 toolset: REAL, DB-backed, and auth-scoped to the signed-in user.
 *
 * Every tool that takes a repoId first proves the user can see that repo (owns it, or is a
 * member of its org) via assertRepoAccess — a chat agent must never read another tenant's runs
 * or findings just because the model was handed an arbitrary id. These are all read-only;
 * action tools (spawn/fix/merge) arrive in Phase 1 behind an explicit confirmation gate.
 */

export async function accessibleRepoIds(userId: string): Promise<number[]> {
  const owned = await db.select({ id: repositories.id }).from(repositories).where(eq(repositories.userId, userId));
  const memberships = await db.select({ orgId: organizationMember.orgId }).from(organizationMember).where(eq(organizationMember.userId, userId));
  const orgIds = memberships.map((m) => m.orgId);
  let orgRepos: { id: number }[] = [];
  if (orgIds.length > 0) {
    orgRepos = await db.select({ id: repositories.id }).from(repositories).where(inArray(repositories.orgId, orgIds));
  }
  return [...new Set([...owned.map((r) => r.id), ...orgRepos.map((r) => r.id)])];
}

export async function assertRepoAccess(userId: string, repoId: number): Promise<boolean> {
  const ids = await accessibleRepoIds(userId);
  return ids.includes(repoId);
}

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };

export function createGordonTools(userId: string, sessionId?: string) {
  const tools = {
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

    /* ------------------------- read tools: live + code + memory ------------------------- */

    get_run_status: tool({
      description: 'Get the live status of a specific run and its agents (queued/running/completed/failed) — use to report progress after spawning an agent, or when the user asks how a scan is going.',
      inputSchema: z.object({ runId: z.number() }),
      execute: async ({ runId }) => {
        const [run] = await db.select().from(runs).where(eq(runs.id, runId));
        if (!run) return { error: `No run #${runId}.` };
        if (!run.repoId || !(await assertRepoAccess(userId, run.repoId))) return { error: 'You do not have access to that run.' };
        const tasks = await db.select().from(agentTasks).where(eq(agentTasks.runId, runId));
        return {
          runId, status: run.status, overallScore: run.score, commitSha: run.commitSha,
          agents: tasks.map((t) => ({ agentId: t.agentId, status: t.status, score: t.score, findingsCount: t.findingsCount, durationMs: t.duration })),
        };
      },
    }),

    read_repo_file: tool({
      description: "Read a file's real contents from a repo via the GitHub API (default branch unless a ref is given). Use to show or reason about actual source code.",
      inputSchema: z.object({ repoId: z.number(), filePath: z.string(), ref: z.string().optional() }),
      execute: async ({ repoId, filePath, ref }) => {
        if (!(await assertRepoAccess(userId, repoId))) return { error: 'You do not have access to that repository.' };
        const { resolveOctokit } = await import('../guardian/guardian.tools.js');
        const ctx = await resolveOctokit(String(repoId));
        if ('error' in ctx) return { error: ctx.error };
        try {
          const res: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: ctx.owner, repo: ctx.repo, path: filePath, ...(ref ? { ref } : {}),
          });
          if (Array.isArray(res.data)) return { error: `${filePath} is a directory — use list_repo_dir.` };
          const content = Buffer.from(res.data.content ?? '', 'base64').toString('utf8');
          return { filePath, size: res.data.size, content: content.slice(0, 12000), truncated: content.length > 12000 };
        } catch (e: any) {
          return { error: `Could not read ${filePath}: ${e.status ?? ''} ${e.message}` };
        }
      },
    }),

    list_repo_dir: tool({
      description: 'List the files/folders at a path in a repo via the GitHub API. Use to explore structure before reading files.',
      inputSchema: z.object({ repoId: z.number(), path: z.string().optional().default('') }),
      execute: async ({ repoId, path }) => {
        if (!(await assertRepoAccess(userId, repoId))) return { error: 'You do not have access to that repository.' };
        const { resolveOctokit } = await import('../guardian/guardian.tools.js');
        const ctx = await resolveOctokit(String(repoId));
        if ('error' in ctx) return { error: ctx.error };
        try {
          const res: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', { owner: ctx.owner, repo: ctx.repo, path: path ?? '' });
          const items = Array.isArray(res.data) ? res.data : [res.data];
          return { path: path ?? '', entries: items.map((i: any) => ({ name: i.name, type: i.type, size: i.size })) };
        } catch (e: any) {
          return { error: `Could not list ${path}: ${e.status ?? ''} ${e.message}` };
        }
      },
    }),

    read_agent_memory: tool({
      description: "Read the agents' shared cross-run memory (patterns, exceptions, prior dismissals) for a repo. Use to see what the agents have already learned before answering.",
      inputSchema: z.object({ repoId: z.number(), agentType: z.string().optional() }),
      execute: async ({ repoId, agentType }) => {
        if (!(await assertRepoAccess(userId, repoId))) return { error: 'You do not have access to that repository.' };
        const conds = [eq(agentMemory.repoId, String(repoId))];
        if (agentType) conds.push(eq(agentMemory.agentType, agentType));
        const rows = await db.select().from(agentMemory).where(and(...conds)).orderBy(desc(agentMemory.createdAt)).limit(50);
        return { memories: rows.map((m) => ({ agentType: m.agentType, memoryType: m.memoryType, filePath: m.filePath, summary: m.summary, confidence: m.confidence, useCount: m.useCount })) };
      },
    }),

    list_pending_approvals: tool({
      description: 'List Codeward auto-fix PRs awaiting a merge decision (pending merge approvals), optionally for one repo. Use before approving/rejecting so you have the real approvalId.',
      inputSchema: z.object({ repoId: z.number().optional() }),
      execute: async ({ repoId }) => {
        const ids = repoId ? [repoId] : await accessibleRepoIds(userId);
        if (repoId && !(await assertRepoAccess(userId, repoId))) return { error: 'You do not have access to that repository.' };
        if (ids.length === 0) return { pending: [] };
        const rows = await db.select().from(mergeApprovals)
          .where(and(inArray(mergeApprovals.repoId, ids), eq(mergeApprovals.status, 'pending')))
          .orderBy(desc(mergeApprovals.createdAt)).limit(50);
        return { pending: rows.map((r) => ({ approvalId: r.id, repoId: r.repoId, prNumber: r.pullRequestNumber, prTitle: r.prTitle, prUrl: r.prUrl, guardianVerdict: r.guardianVerdict, maxSeverity: r.maxSeverity, mode: r.mode })) };
      },
    }),

    /* ------------------------------- ACTION tools (gated) ------------------------------- */
    // These carry needsApproval:true — the AI SDK emits an approval request and the client must
    // Accept before execute() ever runs. That is the human-in-the-loop gate, enforced in code,
    // not just asked for in the prompt. Every execute() below does REAL work.

    spawn_agent: tool({
      description: 'Run one of the analysis agents on a repo NOW (real sandbox job). Requires user approval. Use when the user asks to scan/analyze/check a repo. agentType is one of the analysis agents.',
      inputSchema: z.object({
        agentType: z.enum(['security', 'bloat', 'broken_code', 'architecture', 'ai_era', 'compliance']),
        repoId: z.number(),
      }),
      needsApproval: true,
      execute: async ({ agentType, repoId }) => {
        if (!(await assertRepoAccess(userId, repoId))) return { error: 'You do not have access to that repository.' };
        const { resolveOctokit } = await import('../guardian/guardian.tools.js');
        const ctx = await resolveOctokit(String(repoId));
        if ('error' in ctx) return { error: `Cannot reach GitHub for this repo: ${ctx.error}` };
        let sha: string;
        try {
          const info: any = await ctx.octokit.request('GET /repos/{owner}/{repo}', { owner: ctx.owner, repo: ctx.repo });
          const ref: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', { owner: ctx.owner, repo: ctx.repo, ref: `heads/${info.data.default_branch}` });
          sha = ref.data.object.sha;
        } catch (e: any) {
          return { error: `Could not resolve the default-branch head: ${e.message}` };
        }
        const fullName = `${ctx.owner}/${ctx.repo}`;
        const [run] = await db.insert(runs).values({ repoId, commitSha: sha, status: 'queued' }).returning();
        const { agentQueue } = await import('../../queue/agent.queue.js');
        const job = await agentQueue.add(`agent-${agentType}`, { agentId: agentType, commitSHA: sha, repoFullName: fullName, runId: run.id });
        return { spawned: true, runId: run.id, jobId: job.id, agentType, repo: fullName, commitSha: sha.slice(0, 7), note: 'Running in a real sandbox — call get_run_status to follow progress.' };
      },
    }),

    approve_and_merge: tool({
      description: 'Approve a pending Codeward auto-fix PR and merge it for real. Requires user approval. Get the approvalId from list_pending_approvals first.',
      inputSchema: z.object({ approvalId: z.number() }),
      needsApproval: true,
      execute: async ({ approvalId }) => {
        const [row] = await db.select().from(mergeApprovals).where(eq(mergeApprovals.id, approvalId));
        if (!row) return { error: `No approval #${approvalId}.` };
        if (!(await assertRepoAccess(userId, row.repoId))) return { error: 'You do not have access to that approval.' };
        const { executeMerge } = await import('../../merge/merge.service.js');
        const outcome = await executeMerge(approvalId, userId);
        return outcome.merged ? { merged: true, sha: outcome.sha, prNumber: row.pullRequestNumber } : { merged: false, reason: outcome.reason };
      },
    }),

    reject_fix: tool({
      description: 'Reject a pending Codeward auto-fix PR — closes the PR with an explanatory comment. Requires user approval. Get the approvalId from list_pending_approvals.',
      inputSchema: z.object({ approvalId: z.number(), note: z.string().optional() }),
      needsApproval: true,
      execute: async ({ approvalId, note }) => {
        const [row] = await db.select().from(mergeApprovals).where(eq(mergeApprovals.id, approvalId));
        if (!row) return { error: `No approval #${approvalId}.` };
        if (!(await assertRepoAccess(userId, row.repoId))) return { error: 'You do not have access to that approval.' };
        const { rejectApproval } = await import('../../merge/merge.service.js');
        const outcome = await rejectApproval(approvalId, userId, note);
        return outcome.rejected ? { rejected: true, prNumber: row.pullRequestNumber } : { rejected: false, reason: outcome.reason };
      },
    }),
  };
  return withTelemetry(tools, userId, sessionId);
}
