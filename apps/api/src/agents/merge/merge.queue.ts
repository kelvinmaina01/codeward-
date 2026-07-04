import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection } from '../../lib/redis.js';
import { db } from '../../db/index.js';
import { mergeApprovals, repositories } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { executeMerge, readMergeSettings, isAutoMergeEligible } from './merge.service.js';

const connection = createRedisConnection();

interface MergeJobData {
  approvalId: number;
}

/**
 * Delayed auto-merge queue: one job per 'auto'-mode approval, scheduled with BullMQ's real
 * {delay} option to fire exactly at the approval's deadline. The worker re-checks every gate
 * at fire time (row still pending, repo still in auto mode, severity still eligible) — the
 * schedule is a trigger, never an authorization by itself.
 */
export const mergeQueue = new Queue<MergeJobData>('merge-jobs', { connection: connection as any });

export const mergeWorker = new Worker<MergeJobData>('merge-jobs', async (job: Job<MergeJobData>) => {
  const { approvalId } = job.data;
  console.log(`[MergeWorker] Deadline reached for approval #${approvalId} — attempting timeout auto-merge.`);
  const outcome = await executeMerge(approvalId, 'timeout');
  if (outcome.merged) {
    console.log(`[MergeWorker] Approval #${approvalId} auto-merged for real: ${outcome.sha}`);
  } else {
    console.log(`[MergeWorker] Approval #${approvalId} did NOT auto-merge: ${outcome.reason}`);
  }
  return outcome;
}, { connection: connection as any, concurrency: 2 });

export interface CreateApprovalParams {
  repoId: number;
  runId: number;
  agentId: string;
  pullRequestNumber: number;
  prUrl: string;
  prTitle: string;
  guardianVerdict: string | null; // APPROVE | REQUEST_CHANGES | COMMENT | null
  maxSeverity: string | null;     // highest severity among the findings this PR fixes
}

/**
 * Creates the real merge_approvals row for a just-reviewed auto-fix PR and, when the repo has
 * opted into auto mode AND the PR is gate-eligible, schedules the real delayed merge job.
 * Every PR gets a row (so the dashboard always shows it); only eligible auto-mode ones get a
 * deadline.
 */
export async function createApprovalAndMaybeSchedule(params: CreateApprovalParams) {
  const [repo] = await db.select().from(repositories).where(eq(repositories.id, params.repoId));
  const settings = readMergeSettings(repo?.config);
  const autoEligible = settings.mode === 'auto' && isAutoMergeEligible(params.maxSeverity, params.guardianVerdict);
  const deadlineAt = autoEligible ? new Date(Date.now() + settings.timeoutMinutes * 60_000) : null;

  const [row] = await db.insert(mergeApprovals).values({
    repoId: params.repoId,
    runId: params.runId,
    agentId: params.agentId,
    pullRequestNumber: params.pullRequestNumber,
    prUrl: params.prUrl,
    prTitle: params.prTitle,
    guardianVerdict: params.guardianVerdict,
    maxSeverity: params.maxSeverity,
    mode: autoEligible ? 'auto' : 'manual',
    deadlineAt,
    status: 'pending',
  }).returning();

  if (autoEligible && deadlineAt) {
    await mergeQueue.add('timeout-merge', { approvalId: row.id }, {
      delay: settings.timeoutMinutes * 60_000,
      jobId: `merge-approval-${row.id}`, // idempotent — the same approval never gets two timers
    });
    console.log(`[MergeQueue] Approval #${row.id} scheduled for real auto-merge at ${deadlineAt.toISOString()} (${settings.timeoutMinutes}min).`);
  } else {
    console.log(`[MergeQueue] Approval #${row.id} created as manual (mode=${settings.mode}, verdict=${params.guardianVerdict}, severity=${params.maxSeverity}).`);
  }

  return row;
}
