import { db } from '../db/index.js';
import { runs } from '../db/schema.js';

/**
 * The single real entry point for "start a comprehensive scan on this repo" — used by both the
 * Connect-repo flow and a re-installation webhook. Replaces two previously broken paths found
 * during a full user-journey audit:
 *   - routes/repos.ts's /connect used to enqueue a job named 'baseline-audit' with a payload
 *     shape (`{owner, repo, installationId, ...}`) that has no `agentId` field — the real
 *     worker's first line is `agentDefinitions[job.data.agentId]`, so every such job threw
 *     `Unknown agent: "undefined"` the instant it was picked up.
 *   - routes/webhooks.ts's installation handler enqueued to a completely different, disconnected
 *     legacy queue (queue/audit.queue.ts) whose worker checked `job.data.type`, a field the
 *     webhook never set — a permanent no-op — backed by 100% mock logic anyway (hardcoded
 *     baselineScore, a literal dummy Stripe key, an unparsed trufflehog call). Neither path
 *     ever dispatched the real, proven orchestrator/9-agent pipeline. Net effect: no repo
 *     connected through the real UI ever got a real first scan, and since nothing ever flipped
 *     repositories.status to 'active', pushWorker's incremental scans never started either.
 *
 * This function dispatches the SAME real orchestrator_phase1 job pushWorker already uses
 * correctly for incremental scans, with commitSha='baseline' so every agent's runScope stays
 * comprehensive (only incremental pushes carry a real diff scope).
 */
export async function triggerComprehensiveAudit(repoId: number, repoFullName: string): Promise<{ runId: number }> {
  const [run] = await db.insert(runs).values({ repoId, commitSha: 'baseline', status: 'queued' }).returning();

  try {
    const { isRedisQuotaExceeded } = await import('../lib/redis.js');
    if (!isRedisQuotaExceeded()) {
      const { agentQueue } = await import('./queue/agent.queue.js');
      await Promise.race([
        agentQueue.add('orchestrator-phase1', {
          agentId: 'orchestrator_phase1',
          commitSHA: 'baseline',
          repoFullName,
          runId: run.id,
        }, { jobId: `audit-${repoId}-${run.id}` }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Queue timeout (Redis unavailable)')), 2500))
      ]);
      console.log(`[AuditTrigger] Real comprehensive audit dispatched for ${repoFullName} (repoId=${repoId}, run #${run.id}).`);
    } else {
      console.warn(`[AuditTrigger] Redis quota exceeded — baseline run #${run.id} recorded in Postgres, queue dispatch deferred.`);
    }
  } catch (queueErr: any) {
    console.warn(`[AuditTrigger] Could not enqueue orchestrator job (non-fatal):`, queueErr?.message);
  }

  return { runId: run.id };
}
