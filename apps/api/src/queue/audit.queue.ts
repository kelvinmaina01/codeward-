import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import { db } from '../db/index.js';
import { repositories, runs, runResults } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { runSandbox } from '../sandbox/runner.js';
import { NotificationService } from '../notifications/NotificationService.js';

dotenv.config();

const connection = new Redis(process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const auditQueue = new Queue('full-audits', { connection: connection as any });

export const auditWorker = new Worker('full-audits', async (job: Job) => {
  const { type, repoFullName, installationId, defaultBranch, commitSha, prNumber, prTitle, authorEmail } = job.data;
  
  console.log(`[AuditWorker] Processing job type: ${type} for ${repoFullName}`);
  
  try {
    if (type === 'process-repo') {
      // LAYER 1: Deep Scan (Onboarding)
      console.log(`[AuditWorker] Starting Deep Scan for ${repoFullName}`);
      
      const res = await runSandbox({
        repoUrl: `https://github.com/${repoFullName}`,
        files: [], // we could fetch via api
        githubToken: process.env.GITHUB_TOKEN || 'dummy_token'
      });

      if (!res.success) {
        throw new Error(`Sandbox failed: ${res.error}`);
      }

      const baselineScore = 85; // mock calculated score
      await db.update(repositories).set({
        status: 'active',
        baselineScore,
        auditCompletedAt: new Date(),
      }).where(eq(repositories.fullName, repoFullName));

      // Send Success Email
      if (authorEmail) {
        await NotificationService.sendRepoConnectedSuccess(
          authorEmail, 
          repoFullName, 
          baselineScore, 
          `https://codeward.io/dashboard/${repoFullName}`
        );
      }

    } else if (type === 'process-commit') {
      // LAYER 2: Incremental Scan (PR Intercept)
      console.log(`[AuditWorker] Starting PR Scan for ${repoFullName} #${prNumber}`);

      // 1. Create Run in DB
      const [newRun] = await db.insert(runs).values({
        repoId: 1, // should lookup real repo id
        commitSha: commitSha || 'unknown',
        status: 'running',
      }).returning();

      // 2. Run Sandbox
      const res = await runSandbox({
        repoUrl: `https://github.com/${repoFullName}`,
        files: [],
        githubToken: process.env.GITHUB_TOKEN || 'dummy_token'
      });

      const rawOutput = res.testOutput || res.error || 'Empty Output';
      
      // 3. Update DB with results
      await db.update(runs).set({
        status: res.success ? 'completed' : 'agent_failed',
        rawLogs: rawOutput,
        score: res.success ? 100 : 0
      }).where(eq(runs.id, newRun.id));

      if (!res.success) {
        // Fallback Chain Triggered!
        console.log(`[AuditWorker] Agent failed. Triggering Escalation Email and GitHub Issue Fallback.`);
        
        if (authorEmail) {
          await NotificationService.sendEscalation(
            authorEmail,
            repoFullName,
            prNumber || 0,
            prTitle || 'Unknown PR',
            'Security Scan Failure',
            newRun.id.toString()
          );
        }
        // TODO: Call Octokit to create GitHub Issue
      } else {
        console.log(`[AuditWorker] Agent succeeded. Code is safe.`);
      }
    }
  } catch (error) {
    console.error(`[AuditWorker] Error processing ${repoFullName}:`, error);
  }
}, { 
  connection: connection as any, 
  concurrency: 3 
});
