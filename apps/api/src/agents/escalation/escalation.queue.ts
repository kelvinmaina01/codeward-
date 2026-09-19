import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection, BULLMQ_PREFIX } from '../../lib/redis.js';
import { customBackoffStrategy } from '../../lib/queue-backoff.js';
import { escalateUnresolvedFindings, type EscalationResult } from './escalation.service.js';
import { ResilientSandbox } from '../../sandbox/resilient-sandbox.js';
import type { SandboxHandle } from '../../sandbox/local-exec.js';

const connection = createRedisConnection();

export interface EscalationJobData {
  runId: number;
  repoId: number;
  repoFullName: string;
}

function createSandbox(): SandboxHandle {
  return new ResilientSandbox();
}

/**
 * Dedicated queue for escalating unresolved findings to GitHub Issues and alerting owners.
 * Decoupled from the agent execution queue to avoid holding agent worker slots during GitHub API
 * round-trips and to enforce GitHub secondary rate-limits (default 20 issues / min).
 */
export const escalationQueue = new Queue<EscalationJobData, any, string>('escalation-jobs', {
  connection: connection as any,
  prefix: BULLMQ_PREFIX,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'custom',
    },
    removeOnComplete: { count: 500, age: 24 * 3600 },
    removeOnFail: { count: 2000, age: 7 * 24 * 3600 },
  },
});

let _escalationWorker: Worker<EscalationJobData> | null = null;

export function startEscalationWorker(customOpts?: any): Worker<EscalationJobData> {
  if (_escalationWorker) return _escalationWorker;

  const concurrency = parseInt(process.env.ESCALATION_CONCURRENCY || '3', 10);
  const maxIssuesPerMin = parseInt(process.env.GITHUB_ISSUE_RATE_MAX || '20', 10);

  _escalationWorker = new Worker<EscalationJobData>(
    'escalation-jobs',
    async (job: Job<EscalationJobData>) => {
      const { runId, repoId, repoFullName } = job.data;
      console.log(`[EscalationWorker] Starting escalation check for ${repoFullName} (run #${runId})`);

      const sandbox = createSandbox();
      try {
        const outcome: EscalationResult = await escalateUnresolvedFindings({
          sandbox,
          repoId: String(repoId),
          runId,
        });

        console.log(`[EscalationWorker] run #${runId}: ${outcome.escalated.length} real issue(s) created, ${outcome.skipped.length} skipped, ${outcome.resolved?.length ?? 0} resolved.`);

        // "One PR, one email": no standalone escalation email. Instead, PERSIST the escalated
        // issues onto the orchestrator_phase3 row's reportMeta.escalation, so the single
        // "PR Analysis Complete" digest can render them as a section (and the dashboard can read
        // them too). The digest for a BLOCK run is enqueued with a short delay precisely so this
        // write lands first. Best-effort: a failure here must never fail the escalation job.
        if (outcome.escalated.length > 0) {
          try {
            const { db } = await import('../../db/index.js');
            const { agentTasks } = await import('../../db/schema.js');
            const { eq, and } = await import('drizzle-orm');
            const [orch] = await db.select().from(agentTasks)
              .where(and(eq(agentTasks.runId, runId), eq(agentTasks.agentId, 'orchestrator_phase3')));
            if (orch) {
              const meta = (orch.reportMeta as any) ?? {};
              await db.update(agentTasks).set({
                reportMeta: {
                  ...meta,
                  escalation: {
                    ...(meta.escalation ?? {}),
                    escalated: outcome.escalated,
                    skipped: outcome.skipped?.length ?? 0,
                  },
                },
              }).where(eq(agentTasks.id, orch.id));
              console.log(`[EscalationWorker] Persisted ${outcome.escalated.length} escalated issue(s) to run #${runId} digest payload.`);
            }
          } catch (persistErr) {
            console.error(`[EscalationWorker] Failed to persist escalation results for the digest:`, (persistErr as Error).message);
          }
        }

        return outcome;
      } finally {
        await sandbox.destroy();
      }
    },
    {
      connection: connection as any,
      prefix: BULLMQ_PREFIX,
      concurrency,
      limiter: {
        max: maxIssuesPerMin,
        duration: 60_000,
      },
      settings: {
        backoffStrategy: customBackoffStrategy,
      },
      ...customOpts,
    }
  );

  _escalationWorker.on('completed', (job) => {
    console.log(`[EscalationQueue] Job ${job.id} completed for run #${job.data.runId}`);
  });

  _escalationWorker.on('failed', (job, err) => {
    console.error(`[EscalationQueue] Job ${job?.id} failed (run #${job?.data?.runId}):`, err.message);
  });

  return _escalationWorker;
}

/**
 * Lazy proxy export for escalationWorker so importing the queue for producers does not
 * immediately bind worker listeners in the API server process.
 */
export const escalationWorker = new Proxy({} as Worker<EscalationJobData>, {
  get(target, prop, receiver) {
    const worker = startEscalationWorker();
    const val = Reflect.get(worker, prop, receiver);
    return typeof val === 'function' ? val.bind(worker) : val;
  },
});
