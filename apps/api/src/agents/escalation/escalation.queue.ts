import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis.js';
import { escalateUnresolvedFindings, type EscalationResult } from './escalation.service.js';
import { LocalExecSandbox } from '../../sandbox/local-exec.js';
import { FlySandbox } from '../../sandbox/fly-machine.js';

const connection = createRedisConnection();

export interface EscalationJobData {
  runId: number;
  repoId: number;
  repoFullName: string;
}

function createSandbox(): LocalExecSandbox | FlySandbox {
  if (process.env.NODE_ENV === 'production' && process.env.SANDBOX_PROVIDER !== 'fly') {
    throw new Error('FATAL: Local execution forbidden in production');
  }
  if (process.env.SANDBOX_PROVIDER === 'fly') {
    const image = process.env.FLY_SANDBOX_IMAGE || 'registry.fly.io/codeward-sandboxes-v2:deployment-01KV13ANZ9AJNNPAXN4A75G44Y';
    return new FlySandbox({ image });
  }
  return new LocalExecSandbox();
}

/**
 * Dedicated queue for escalating unresolved findings to GitHub Issues and alerting owners.
 * Decoupled from the agent execution queue to avoid holding agent worker slots during GitHub API
 * round-trips and to enforce GitHub secondary rate-limits (default 20 issues / min).
 */
export const escalationQueue = new Queue<EscalationJobData, any, string>('escalation-jobs', {
  connection: connection as any,
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

        // Send escalation notification email to owner if new issues were created
        if (outcome.escalated.length > 0) {
          try {
            const { db } = await import('../../db/index.js');
            const { repositories, user } = await import('../../db/schema.js');
            const { eq } = await import('drizzle-orm');
            const [repo] = await db.select().from(repositories).where(eq(repositories.id, repoId));
            const [owner] = repo ? await db.select().from(user).where(eq(user.id, repo.userId)) : [];

            if (owner?.email) {
              const { NotificationService } = await import('../../notifications/NotificationService.js');
              const first = outcome.escalated[0];
              await NotificationService.sendEscalation(
                owner.email,
                repoFullName,
                first.issueNumber,
                first.title,
                `${outcome.escalated.length} unresolved finding(s) across ${new Set(outcome.escalated.map((e) => e.agentId)).size} agent(s)`,
                String(runId)
              );
              const redactedEmail = owner.email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(Math.max(b.length, 3)));
              console.log(`[EscalationWorker] Real escalation alert email sent to ${redactedEmail}`);
            }
          } catch (emailErr) {
            console.error(`[EscalationWorker] Failed to send escalation email:`, (emailErr as Error).message);
          }
        }

        return outcome;
      } finally {
        await sandbox.destroy();
      }
    },
    {
      connection: connection as any,
      concurrency,
      limiter: {
        max: maxIssuesPerMin,
        duration: 60_000,
      },
      settings: {
        backoffStrategies: {
          custom(attemptsMade: number) {
            const base = 5000 * Math.pow(2, attemptsMade - 1);
            const jitter = Math.random() * base * 0.3; // up to 30% jitter
            return Math.round(base + jitter);
          },
        },
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
