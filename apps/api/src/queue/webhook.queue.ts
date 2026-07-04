import { Queue, Worker, Job } from 'bullmq';
import dotenv from 'dotenv';
import { db } from '../db/index.js';
import { repositories, runs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createRedisConnection } from '../lib/redis.js';

dotenv.config();

const connection = createRedisConnection();

export const pushQueue = new Queue('webhook-jobs', { connection: connection as any });

interface PushJobData {
  runId: number;
  commitSHA: string;
  beforeSHA?: string;
  repoFullName: string;
}

/**
 * The real Layer-2 push pipeline: for every push to a connected, audited repo, compute the
 * REAL changed-file list (GitHub compare API — no sandbox needed for this), stamp it onto the
 * run as its scope, and dispatch the orchestrator. Every agent job for the run reads that
 * scope from the run row and analyzes only what changed, instead of rescanning the whole repo
 * on every commit. First-connect audits have scope=null and stay comprehensive.
 */
export const pushWorker = new Worker<PushJobData>('webhook-jobs', async (job: Job<PushJobData>) => {
  const { repoFullName, commitSHA, beforeSHA, runId } = job.data;

  const [repo] = await db.select().from(repositories).where(eq(repositories.fullName, repoFullName));

  if (!repo || repo.status !== 'active') {
    console.log(`[PushWorker] Repo ${repoFullName} is not active (status: ${repo?.status}). Re-queuing push ${commitSHA}.`);
    // Still auditing — retry after the initial audit has had time to finish.
    await pushQueue.add('process-push', job.data, { delay: 60_000 });
    return { deferred: true };
  }

  console.log(`[PushWorker] Processing push ${commitSHA} for ${repoFullName} (run #${runId})`);

  // Real diff scope via GitHub's compare API. A push with no usable beforeSHA (new branch,
  // force-push from zeros) falls back honestly to a comprehensive run rather than guessing.
  let scope: { incremental: boolean; beforeSha: string; changedFiles: string[] } | null = null;
  const isRealBefore = beforeSHA && !/^0+$/.test(beforeSHA);
  if (isRealBefore && repo.installationId) {
    try {
      const { getInstallationOctokit } = await import('../lib/github.js');
      const octokit = await getInstallationOctokit(repo.installationId);
      const cmp: any = await octokit.request('GET /repos/{owner}/{repo}/compare/{basehead}', {
        owner: repo.owner, repo: repo.name, basehead: `${beforeSHA}...${commitSHA}`,
      });
      const changedFiles = (cmp.data.files ?? []).map((f: any) => f.filename);
      if (changedFiles.length > 0 && changedFiles.length <= 300) {
        scope = { incremental: true, beforeSha: beforeSHA!, changedFiles };
        console.log(`[PushWorker] Real diff computed: ${changedFiles.length} changed file(s) — run will be incremental.`);
      } else {
        console.log(`[PushWorker] Diff has ${changedFiles.length} files (0 or too many to scope usefully) — falling back to comprehensive.`);
      }
    } catch (e) {
      console.error(`[PushWorker] Compare API failed (${(e as Error).message}) — falling back to a comprehensive run rather than guessing the diff.`);
    }
  } else {
    console.log(`[PushWorker] No usable beforeSHA (${beforeSHA}) or installation — comprehensive run.`);
  }

  await db.update(runs).set({ scope }).where(eq(runs.id, runId));

  const { agentQueue } = await import('../agents/queue/agent.queue.js');
  await agentQueue.add('orchestrator-phase1', {
    agentId: 'orchestrator_phase1',
    commitSHA,
    repoFullName,
    runId,
  }, { jobId: `push-phase1-${runId}` });

  console.log(`[PushWorker] Dispatched orchestrator_phase1 for run #${runId} (${scope ? 'incremental' : 'comprehensive'}).`);
  return { dispatched: true, incremental: !!scope };
}, {
  connection: connection as any,
  concurrency: 10
});
