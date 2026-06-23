import { Hono } from 'hono';
import crypto from 'crypto';
import { auditQueue, pushQueue } from '../queue/index.js';
import { db } from '../db/index.js';
import { runs, repositories } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const webhookRouter = new Hono<{ Variables: { rawBody: string } }>();

// Middleware to verify GitHub webhook HMAC signature
webhookRouter.use('/github', async (c, next) => {
  const signature = c.req.header('x-hub-signature-256');
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 401);
  }

  const payload = await c.req.text();
  const secret = process.env.GITHUB_WEBHOOK_SECRET || 'dev-secret';

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  // Compare using timingSafeEqual to prevent timing attacks
  if (
    signature.length !== digest.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
  ) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  // Restore payload for downstream handlers since we consumed the text stream
  c.set('rawBody', payload);
  await next();
});

webhookRouter.post('/github', async (c) => {
  const rawBody = c.get('rawBody');
  const event = c.req.header('x-github-event');
  
  try {
    const data = JSON.parse(rawBody);

    if (event === 'push') {
      const commitSHA = data.after;
      const repoName = data.repository?.full_name;
      
      console.log(`[Webhook] Received push for ${repoName} at ${commitSHA}`);
      
      // Add a record in the database
      const [runRecord] = await db.insert(runs).values({
        commitSha: commitSHA,
        status: 'queued',
      }).returning();
      
      // Enqueue job in BullMQ (Layer 2: Push Guard)
      await pushQueue.add('process-push', { 
        runId: runRecord.id,
        commitSHA, 
        repoFullName: repoName 
      });
      
      return c.json({ status: 'queued', type: 'incremental', commitSHA, runId: runRecord.id });
    } else if (event === 'installation' || event === 'installation_repositories') {
      // Layer 1: Full Audit (Mode 1)
      const repos = data.repositories_added || data.repositories || [];
      const installationId = data.installation?.id;
      
      for (const repo of repos) {
        console.log(`[Webhook] Received installation for ${repo.full_name}. Triggering Mode 1 Full Audit.`);
        
        // Save repo to DB with status pending_audit
        // Check if exists first to avoid unique constraint violation
        const existing = await db.select().from(repositories).where(eq(repositories.fullName, repo.full_name));
        
        if (existing.length > 0) {
          // Update existing
          await db.update(repositories).set({
            status: 'pending_audit',
            auditTriggeredAt: new Date(),
            githubRepoId: repo.id,
            installationId: installationId
          }).where(eq(repositories.fullName, repo.full_name));
        } else {
          console.log(`[Webhook] Skipping insert for ${repo.full_name} because it has not been connected by a user yet.`);
          // The repository will be inserted with the correct userId when the user clicks 'Connect' in the UI.
        }

        await auditQueue.add('full-repo-audit', {
          repoFullName: repo.full_name,
          installationId: installationId,
          defaultBranch: repo.default_branch || 'main'
        }, {
          jobId: `audit-${repo.id}`,
          attempts: 2,
          removeOnComplete: true,
        });
      }
      
      return c.json({ status: 'queued', type: 'deep-scan', auditsQueued: repos.length });
    }

    return c.json({ status: 'ignored', event });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});
