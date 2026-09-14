import { db } from '../../db/index.js';
import { agentTasks, runs, repositories, user } from '../../db/schema.js';
import { eq, and, lt, desc, notLike } from 'drizzle-orm';
import { triggerComprehensiveAudit } from '../audit-trigger.js';
import { NotificationService } from '../../notifications/NotificationService.js';

export interface SweeperResult {
  zombieTasksRecovered: number;
  stalledQueuesAdvanced: number;
  staleRunsReEnqueued: number;
  details: string[];
}

/**
 * Advances the sequential repo queue for a specific user or globally.
 * If the active repository has finished (active/failed_audit), finds the next
 * repo in 'queued' status, promotes it to 'pending_audit', and triggers its audit.
 */
export async function advanceSequentialQueue(userId?: string): Promise<{ advanced: boolean; repoName?: string }> {
  try {
    const userCondition = userId ? eq(repositories.userId, userId) : undefined;

    // Check if there is already an active repo in 'pending_audit'
    const activeConditions = [eq(repositories.status, 'pending_audit')];
    if (userCondition) activeConditions.push(userCondition);

    const [currentPending] = await db.select()
      .from(repositories)
      .where(and(...activeConditions))
      .limit(1);

    if (currentPending) {
      // An audit is legitimately currently pending/running
      return { advanced: false, repoName: currentPending.fullName };
    }

    // Find the oldest 'queued' repo
    const queuedConditions = [eq(repositories.status, 'queued')];
    if (userCondition) queuedConditions.push(userCondition);

    const [nextQueued] = await db.select()
      .from(repositories)
      .where(and(...queuedConditions))
      .orderBy(repositories.createdAt)
      .limit(1);

    if (!nextQueued) {
      return { advanced: false };
    }

    console.log(`[Sweeper] Advancing sequential queue: Promoting #${nextQueued.id} (${nextQueued.fullName}) to pending_audit.`);

    await db.update(repositories)
      .set({ status: 'pending_audit', auditTriggeredAt: new Date() })
      .where(eq(repositories.id, nextQueued.id));

    await triggerComprehensiveAudit(nextQueued.id, nextQueued.fullName);

    // Notify user that their queued repo has now started
    try {
      const [repoOwner] = await db.select().from(user).where(eq(user.id, nextQueued.userId));
      if (repoOwner?.email) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const streamUrl = `${frontendUrl}/dashboard/livefeed?view=stream`;

        const remaining = await db.select().from(repositories)
          .where(and(eq(repositories.userId, nextQueued.userId), eq(repositories.status, 'queued')));

        await NotificationService.sendQueuedRepoStarted({
          to: repoOwner.email,
          userName: repoOwner.name || 'Engineer',
          previousRepo: 'Previous scan',
          activeRepo: nextQueued.fullName,
          remainingQueuedRepos: remaining.map(r => r.fullName),
          streamUrl,
        });
      }
    } catch (emailErr) {
      console.warn(`[Sweeper] Could not send queued repo notification (non-fatal):`, emailErr);
    }

    return { advanced: true, repoName: nextQueued.fullName };
  } catch (err: any) {
    console.error(`[Sweeper] Failed to advance sequential queue:`, err.message);
    return { advanced: false };
  }
}

/**
 * Main background recovery sweeper.
 * Safe, idempotent, zero compute waste:
 * 1. Rescues zombie tasks (tasks stuck in 'running' with no updates for > 25 mins)
 * 2. Advances stalled sequential queues when previous repo finished or stalled
 * 3. Restarts queued baseline runs that were dropped during server restarts
 */
export async function runAuditRecoverySweeper(): Promise<SweeperResult> {
  const details: string[] = [];
  let zombieTasksRecovered = 0;
  let stalledQueuesAdvanced = 0;
  let staleRunsReEnqueued = 0;

  console.log(`[Sweeper] Running Audit Recovery Sweeper...`);

  // 1. Recover zombie in-flight tasks (server restarted or worker dropped mid-flight > 25 mins ago)
  const staleThreshold = new Date(Date.now() - 25 * 60 * 1000);
  const zombieTasks = await db.select()
    .from(agentTasks)
    .where(and(
      eq(agentTasks.status, 'running'),
      lt(agentTasks.startedAt, staleThreshold)
    ))
    .limit(10);

  if (zombieTasks.length > 0) {
    const { agentQueue } = await import('./agent.queue.js');
    for (const task of zombieTasks) {
      try {
        const [runRow] = await db.select().from(runs).where(eq(runs.id, task.runId));
        if (!runRow) continue;

        const [repo] = runRow.repoId
          ? await db.select().from(repositories).where(eq(repositories.id, runRow.repoId))
          : [null];
        const repoFullName = repo?.fullName ?? 'unknown';

        console.log(`[Sweeper] Recovering zombie task #${task.id} (${task.agentId}) on run #${task.runId}...`);

        // Mark as queued and re-add to BullMQ with checkpointState
        await db.update(agentTasks)
          .set({ status: 'queued', startedAt: new Date() })
          .where(eq(agentTasks.id, task.id));

        await agentQueue.add(`recover-${task.agentId}-${task.runId}`, {
          runId: task.runId,
          agentId: task.agentId,
          provider: task.provider || 'openai',
          commitSHA: runRow.commitSha,
          repoFullName,
          model: task.model || undefined,
        }, {
          jobId: `recover-task-${task.id}-${Date.now()}`,
        });

        zombieTasksRecovered++;
        details.push(`Recovered zombie task #${task.id} (${task.agentId}) for ${repoFullName}`);
      } catch (recoverErr: any) {
        console.error(`[Sweeper] Failed to recover task #${task.id}:`, recoverErr.message);
      }
    }
  }

  // 2. Recover abandoned 'queued' baseline runs where orchestrator never started
  const staleRunThreshold = new Date(Date.now() - 20 * 60 * 1000);
  const staleQueuedRuns = await db.select()
    .from(runs)
    .where(and(
      eq(runs.status, 'queued'),
      lt(runs.createdAt, staleRunThreshold)
    ))
    .limit(5);

  for (const run of staleQueuedRuns) {
    try {
      if (!run.repoId) continue;
      const [repo] = await db.select().from(repositories).where(eq(repositories.id, run.repoId));
      if (!repo || repo.paused) continue;

      // Check if any agent tasks exist for this run
      const existingTasks = await db.select().from(agentTasks).where(eq(agentTasks.runId, run.id));
      if (existingTasks.length === 0) {
        // Run was created but Phase 1 was dropped (e.g. server restart)
        console.log(`[Sweeper] Re-enqueueing dropped baseline run #${run.id} for ${repo.fullName}...`);
        const { agentQueue } = await import('./agent.queue.js');
        await agentQueue.add('orchestrator-phase1', {
          agentId: 'orchestrator_phase1',
          commitSHA: run.commitSha,
          repoFullName: repo.fullName,
          runId: run.id,
        }, {
          jobId: `sweeper-run-${run.id}-${Date.now()}`,
        });
        staleRunsReEnqueued++;
        details.push(`Re-enqueued dropped run #${run.id} for ${repo.fullName}`);
      }
    } catch (runErr: any) {
      console.error(`[Sweeper] Failed to recover run #${run.id}:`, runErr.message);
    }
  }

  // 3. Advance stalled sequential queues
  // Find distinct user IDs who have queued repositories
  const queuedRepos = await db.select({ userId: repositories.userId })
    .from(repositories)
    .where(eq(repositories.status, 'queued'));

  const userIds = [...new Set(queuedRepos.map(r => r.userId))];
  for (const uid of userIds) {
    const outcome = await advanceSequentialQueue(uid);
    if (outcome.advanced) {
      stalledQueuesAdvanced++;
      details.push(`Advanced sequential queue for user ${uid} to ${outcome.repoName}`);
    }
  }

  console.log(`[Sweeper] Sweeper complete: ${zombieTasksRecovered} zombie tasks, ${stalledQueuesAdvanced} queues advanced, ${staleRunsReEnqueued} runs re-enqueued.`);

  return {
    zombieTasksRecovered,
    stalledQueuesAdvanced,
    staleRunsReEnqueued,
    details,
  };
}
