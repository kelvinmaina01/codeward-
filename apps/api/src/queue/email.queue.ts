/**
 * ============================================================================
 * Email Queue — BullMQ async email delivery with Dynamic Payload Resolution
 * ============================================================================
 */

import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection } from '../lib/redis.js';
import { db } from '../db/index.js';
import { organization, repositories, user } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { appConfig } from '../config/app.config.js';
import { NotificationService } from '../notifications/NotificationService.js';
import { EmailPayloadResolver } from '../services/email-payload-resolver.js';

// ─── Job Payload Types ────────────────────────────────────────────────────────

export type EmailJobData =
  | {
      type: 'plan-upgraded';
      orgId: number;
      planType: 'pro' | 'team';
    }
  | {
      type: 'trial-limit-reached';
      orgId: number;
    }
  | {
      type: 'run-completed';
      runId: number;
    }
  | {
      type: 'escalation';
      repoName: string;
      prNumber: number;
      prTitle: string;
      failingTestName: string;
      runId: number;
      recipientEmail?: string;
    };

// ─── Queue ───────────────────────────────────────────────────────────────────

const connection = createRedisConnection();

export const emailQueue = new Queue<EmailJobData>('email-jobs', {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 4,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

// ─── Helper: resolve org owner's email ───────────────────────────────────────

async function getOrgOwnerEmail(orgId: number): Promise<{ email: string; name: string; orgName: string } | null> {
  const [repo] = await db
    .select({ userId: repositories.userId, orgId: repositories.orgId })
    .from(repositories)
    .where(eq(repositories.orgId, orgId))
    .limit(1);

  if (!repo || !repo.userId) return null;

  const [u] = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, repo.userId));

  if (!u) return null;

  const [org] = await db
    .select({ githubLogin: organization.githubLogin })
    .from(organization)
    .where(eq(organization.id, orgId));

  return {
    email: u.email,
    name: u.name,
    orgName: org?.githubLogin ?? 'your organization',
  };
}

// ─── Worker ──────────────────────────────────────────────────────────────────

export const emailWorker = new Worker<EmailJobData>(
  'email-jobs',
  async (job: Job<EmailJobData>) => {
    const { data } = job;
    console.log(`[EmailQueue] Processing job ${job.id} — type: ${data.type}`);

    switch (data.type) {
      // ── Run completed (Flagship PR report) ──────────────────────────────
      case 'run-completed': {
        const payload = await EmailPayloadResolver.resolveRunCompleted(data.runId);
        if (!payload) {
          console.warn(`[EmailQueue] run-completed: could not resolve payload for run #${data.runId} — skipping.`);
          return;
        }

        await NotificationService.sendRunCompleted(payload);
        console.log(`[EmailQueue] run-completed report sent to ${payload.recipientEmail} for run #${data.runId}`);
        break;
      }

      // ── Plan upgraded ────────────────────────────────────────────────────
      case 'plan-upgraded': {
        const owner = await getOrgOwnerEmail(data.orgId);
        if (!owner) {
          console.warn(`[EmailQueue] plan-upgraded: no owner email for org ${data.orgId} — skipping.`);
          return;
        }

        await NotificationService.sendPlanUpgraded(
          owner.email,
          owner.name,
          owner.orgName,
          data.planType,
        );
        console.log(`[EmailQueue] plan-upgraded email sent to ${owner.email}`);
        break;
      }

      // ── Trial limit reached ──────────────────────────────────────────────
      case 'trial-limit-reached': {
        const owner = await getOrgOwnerEmail(data.orgId);
        if (!owner) {
          console.warn(`[EmailQueue] trial-limit-reached: no owner email for org ${data.orgId} — skipping.`);
          return;
        }

        const upgradeUrl = `${appConfig.app.frontendUrl}/webhooks/upgrade?team=${encodeURIComponent(owner.orgName)}&source=trial_email`;

        await NotificationService.sendTrialLimitReached(
          owner.email,
          owner.name,
          owner.orgName,
          upgradeUrl,
        );
        console.log(`[EmailQueue] trial-limit-reached email sent to ${owner.email}`);
        break;
      }

      // ── Escalation (Manual review required) ──────────────────────────────
      case 'escalation': {
        const recipient = data.recipientEmail || 'support@codeward.cloud';
        await NotificationService.sendEscalation(
          recipient,
          data.repoName,
          data.prNumber,
          data.prTitle,
          data.failingTestName,
          data.runId
        );
        console.log(`[EmailQueue] escalation email sent for PR #${data.prNumber}`);
        break;
      }

      default: {
        console.warn(`[EmailQueue] Unknown job type: ${(data as any).type}`);
      }
    }
  },
  {
    connection: connection as any,
    concurrency: 5,
  }
);

emailWorker.on('failed', (job, err) => {
  console.error(`[EmailQueue] Job ${job?.id} (${job?.data?.type}) failed:`, err.message);
});

emailWorker.on('completed', (job) => {
  console.log(`[EmailQueue] Job ${job.id} (${job.data.type}) completed.`);
});
