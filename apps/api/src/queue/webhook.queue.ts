import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import { db } from '../db/index.js';
import { repositories } from '../db/schema.js';
import { eq } from 'drizzle-orm';

dotenv.config();

const connection = new Redis(process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const pushQueue = new Queue('webhook-jobs', { connection: connection as any });

export const pushWorker = new Worker('webhook-jobs', async (job: Job) => {
  const { repoFullName, commitSHA, runId } = job.data;
  
  // Check if repo is ready for push processing
  const repoArr = await db.select().from(repositories).where(eq(repositories.fullName, repoFullName));
  const repo = repoArr[0];

  if (!repo || repo.status !== 'active') {
    console.log(`[PushWorker] Repo ${repoFullName} is not active (status: ${repo?.status}). Re-queuing push ${commitSHA}.`);
    // Still auditing — queue this push to run after audit completes
    await pushQueue.add('process-push', job.data, { delay: 60_000 });
    return;
  }

  console.log(`[PushWorker] Processing push ${commitSHA} for ${repoFullName}`);
  
  // Proceed with existing push processing logic
  // ... your existing push processing ...
  
}, { 
  connection: connection as any, 
  concurrency: 10 
});
