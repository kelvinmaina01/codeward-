import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';

/**
 * Real DB-backed tools for the chat agent, querying the actual `runs`/`agentTasks`/
 * `agentMemory` tables. read_repo_file/read_repo_config assume the caller passed a sandbox
 * with the relevant repo already checked out (same contract every other agent's tools use).
 * trigger_refactor is honestly not implemented — generating and pushing a real multi-file
 * code fix safely needs real diff-generation logic this codebase doesn't have yet; claiming
 * success here would be exactly the kind of fabrication this whole pass has been removing.
 */
export const createChatTools = (sandbox: SandboxHandle) => {
  return {
    query_run_history: {
      description: 'Fetch real recent agent run results for a repo from Postgres.',
      parameters: z.object({
        repoId: z.string(),
        limit: z.number().optional().default(5),
        agentType: z.string().optional(),
        since: z.string().optional()
      }),
      execute: async (args: any) => {
        const { db } = await import('../../../db/index.js');
        const { runs, agentTasks } = await import('../../../db/schema.js');
        const { eq, desc, and, gte } = await import('drizzle-orm');

        const conditions = [eq(runs.repoId, Number(args.repoId))];
        if (args.since) conditions.push(gte(runs.createdAt, new Date(args.since)));

        const runRows = await db.select().from(runs).where(and(...conditions)).orderBy(desc(runs.createdAt)).limit(args.limit);
        const result = [];
        for (const run of runRows) {
          const taskConditions = [eq(agentTasks.runId, run.id)];
          if (args.agentType) taskConditions.push(eq(agentTasks.agentId, args.agentType));
          const tasks = await db.select().from(agentTasks).where(and(...taskConditions));
          result.push({
            runId: run.id, commitSha: run.commitSha, executedAt: run.createdAt, overallScore: run.score, status: run.status,
            agentResults: Object.fromEntries(tasks.map((t: any) => [t.agentId, { score: t.score, status: t.status, findings: t.findings }]))
          });
        }
        return { runs: result };
      }
    },

    spawn_agent: {
      description: 'Spawn a sub-agent on demand in response to a user question. Real BullMQ enqueue.',
      parameters: z.object({
        agentType: z.enum(["security", "bloat", "broken_code", "architecture", "ai_era", "compliance"]),
        repoId: z.string(),
        commitSha: z.string(),
        repoFullName: z.string()
      }),
      execute: async (args: any) => {
        const { agentQueue } = await import('../../queue/agent.queue.js');
        const { db } = await import('../../../db/index.js');
        const { runs } = await import('../../../db/schema.js');
        const [run] = await db.insert(runs).values({ repoId: Number(args.repoId), commitSha: args.commitSha, status: 'queued' }).returning();
        const job = await agentQueue.add(`agent-${args.agentType}`, {
          agentId: args.agentType, commitSHA: args.commitSha, repoFullName: args.repoFullName, runId: run.id
        });
        return { jobId: job.id, runId: run.id };
      }
    },

    await_spawned_agent: {
      description: 'Poll Postgres for a spawned agent job to complete. Real polling, real timeout.',
      parameters: z.object({ runId: z.string(), agentType: z.string(), timeoutSeconds: z.number().optional().default(120) }),
      execute: async (args: { runId: string; agentType: string; timeoutSeconds?: number }) => {
        const { db } = await import('../../../db/index.js');
        const { agentTasks } = await import('../../../db/schema.js');
        const { eq, and } = await import('drizzle-orm');
        const deadline = Date.now() + (args.timeoutSeconds ?? 120) * 1000;
        while (Date.now() < deadline) {
          const [task] = await db.select().from(agentTasks).where(and(eq(agentTasks.runId, Number(args.runId)), eq(agentTasks.agentId, args.agentType)));
          if (task && (task.status === 'completed' || task.status === 'failed')) {
            return { status: task.status, score: task.score, findings: task.findings };
          }
          await new Promise(r => setTimeout(r, 2000));
        }
        return { status: 'timeout', reason: `Agent did not complete within ${args.timeoutSeconds}s.` };
      }
    },

    read_repo_file: {
      description: 'Read a file from the repo currently checked out in this sandbox.',
      parameters: z.object({ filePath: z.string(), startLine: z.number().optional(), endLine: z.number().optional() }),
      execute: async (args: { filePath: string; startLine?: number; endLine?: number }) => {
        const res = await sandbox.exec(`cat "${args.filePath}"`);
        if (res.exitCode !== 0) return { error: `File not found: ${args.filePath}`, stderr: res.stderr };
        let content = res.stdout;
        if (args.startLine != null) {
          const lines = content.split('\n');
          content = lines.slice((args.startLine ?? 1) - 1, args.endLine ?? lines.length).join('\n');
        }
        return { content: content.slice(0, 12000), totalLines: res.stdout.split('\n').length };
      }
    },

    explain_debt_item: {
      description: 'Fetch the real finding record by ID from Postgres so you can explain it — this tool does NOT fabricate an explanation, it returns the actual finding data.',
      parameters: z.object({ runId: z.string(), agentType: z.string(), findingId: z.string() }),
      execute: async (args: { runId: string; agentType: string; findingId: string }) => {
        const { db } = await import('../../../db/index.js');
        const { agentTasks } = await import('../../../db/schema.js');
        const { eq, and } = await import('drizzle-orm');
        const [task] = await db.select().from(agentTasks).where(and(eq(agentTasks.runId, Number(args.runId)), eq(agentTasks.agentId, args.agentType)));
        const finding = (task?.findings as any[] | undefined)?.find((f: any) => f.id === args.findingId);
        if (!finding) return { error: `No finding with id ${args.findingId} found in run ${args.runId} / agent ${args.agentType}.` };
        return { finding };
      }
    },

    compare_repos: {
      description: 'Compare latest real run scores across multiple repos.',
      parameters: z.object({ repoIds: z.array(z.string()) }),
      execute: async (args: { repoIds: string[] }) => {
        const { db } = await import('../../../db/index.js');
        const { runs, repositories } = await import('../../../db/schema.js');
        const { eq, desc } = await import('drizzle-orm');
        const comparison = [];
        for (const repoId of args.repoIds) {
          const [repo] = await db.select().from(repositories).where(eq(repositories.id, Number(repoId)));
          const [latestRun] = await db.select().from(runs).where(eq(runs.repoId, Number(repoId))).orderBy(desc(runs.createdAt)).limit(1);
          comparison.push({ repoId, repoName: repo?.fullName ?? 'unknown', latestScore: latestRun?.score ?? null, latestRunAt: latestRun?.createdAt ?? null });
        }
        comparison.sort((a, b) => (b.latestScore ?? -1) - (a.latestScore ?? -1));
        return { comparison: comparison.map((c, i) => ({ ...c, ranking: i + 1 })) };
      }
    },

    trigger_refactor: {
      description: 'NOT IMPLEMENTED: automated multi-file refactor-and-PR generation requires real diff-generation logic this codebase does not have yet. Do not tell the user a PR was opened.',
      parameters: z.object({ repoId: z.string(), findingId: z.string() }),
      execute: async () => ({ implemented: false, reason: 'Automated refactor generation is not built yet — tell the user to apply the suggestedFix manually, do not claim a PR was created.' })
    },

    get_fix_priority_list: {
      description: 'Build a real prioritized fix list from the latest real run\'s findings, sorted by severity.',
      parameters: z.object({ repoId: z.string(), availableHours: z.number().optional() }),
      execute: async (args: { repoId: string; availableHours?: number }) => {
        const { db } = await import('../../../db/index.js');
        const { runs, agentTasks } = await import('../../../db/schema.js');
        const { eq, desc } = await import('drizzle-orm');
        const [latestRun] = await db.select().from(runs).where(eq(runs.repoId, Number(args.repoId))).orderBy(desc(runs.createdAt)).limit(1);
        if (!latestRun) return { priorityList: [], reason: 'No runs found for this repo yet.' };
        const tasks = await db.select().from(agentTasks).where(eq(agentTasks.runId, latestRun.id));
        const severityRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
        const all = tasks.flatMap((t: any) => (t.findings ?? []).map((f: any) => ({ ...f, agentType: t.agentId })));
        all.sort((a: any, b: any) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9));
        return { priorityList: all.map((f: any, i: number) => ({ rank: i + 1, ...f })), totalFindings: all.length };
      }
    },

    get_health_trend: {
      description: 'Compute a real score trend from Postgres run history for a repo.',
      parameters: z.object({ repoId: z.string(), timeframeDays: z.number().optional().default(30) }),
      execute: async (args: { repoId: string; timeframeDays?: number }) => {
        const { db } = await import('../../../db/index.js');
        const { runs } = await import('../../../db/schema.js');
        const { eq, desc, gte, and } = await import('drizzle-orm');
        const since = new Date(Date.now() - (args.timeframeDays ?? 30) * 86400000);
        const rows = await db.select().from(runs).where(and(eq(runs.repoId, Number(args.repoId)), gte(runs.createdAt, since))).orderBy(desc(runs.createdAt));
        if (rows.length === 0) return { trend: 'unknown', reason: 'No runs in this timeframe.' };
        const current = rows[0].score;
        const oldest = rows[rows.length - 1].score;
        const trend = current == null || oldest == null ? 'unknown' : current > oldest ? 'improving' : current < oldest ? 'declining' : 'stable';
        return { currentScore: current, scoreAtStartOfTimeframe: oldest, trend, dataPoints: rows.map((r: any) => ({ date: r.createdAt, score: r.score })) };
      }
    },

    search_findings: {
      description: 'Search real findings across a repo\'s run history for a text match.',
      parameters: z.object({ repoId: z.string(), query: z.string(), limit: z.number().optional().default(10) }),
      execute: async (args: { repoId: string; query: string; limit?: number }) => {
        const { db } = await import('../../../db/index.js');
        const { runs, agentTasks } = await import('../../../db/schema.js');
        const { eq, inArray } = await import('drizzle-orm');
        const runRows = await db.select({ id: runs.id }).from(runs).where(eq(runs.repoId, Number(args.repoId)));
        if (runRows.length === 0) return { findings: [] };
        const tasks = await db.select().from(agentTasks).where(inArray(agentTasks.runId, runRows.map((r: any) => r.id)));
        const q = args.query.toLowerCase();
        const matches = tasks.flatMap((t: any) => (t.findings ?? [])
          .filter((f: any) => JSON.stringify(f).toLowerCase().includes(q))
          .map((f: any) => ({ ...f, agentType: t.agentId, runId: t.runId })));
        return { findings: matches.slice(0, args.limit ?? 10) };
      }
    },

    read_repo_config: {
      description: 'Read the repo\'s real .codeward.json config from the checked-out sandbox.',
      parameters: z.object({}),
      execute: async () => {
        const res = await sandbox.exec('cat .codeward.json 2>/dev/null');
        if (res.exitCode !== 0 || !res.stdout.trim()) return { config: null, reason: 'No .codeward.json found — using defaults.' };
        try { return { config: JSON.parse(res.stdout) }; } catch { return { config: null, reason: 'Invalid JSON in .codeward.json.' }; }
      }
    },

    dismiss_finding: {
      description: 'Mark a finding as dismissed. Real write to the agent_memory table.',
      parameters: z.object({ repoId: z.string(), findingId: z.string(), reason: z.string(), dismissedBy: z.string() }),
      execute: async (args: { repoId: string; findingId: string; reason: string; dismissedBy: string }) => {
        const { db } = await import('../../../db/index.js');
        const { agentMemory } = await import('../../../db/schema.js');
        const { randomUUID } = await import('crypto');
        await db.insert(agentMemory).values({
          id: randomUUID(), repoId: args.repoId, agentType: 'chat', memoryType: 'exception',
          summary: `Finding ${args.findingId} dismissed by ${args.dismissedBy}: ${args.reason}`, confidence: 1
        });
        return { dismissed: true };
      }
    }
  };
};
