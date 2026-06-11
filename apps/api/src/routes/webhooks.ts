import { Hono } from 'hono';
import crypto from 'crypto';
import { commitQueue } from '../queue/index.js';
import { db } from '../db/index.js';
import { runs } from '../db/schema.js';

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
      
      // Enqueue job in BullMQ (Layer 2: Incremental Scan)
      await commitQueue.add('process-commit', { 
        runId: runRecord.id,
        commitSHA, 
        repoName 
      });
      
      return c.json({ status: 'queued', type: 'incremental', commitSHA, runId: runRecord.id });
    } else if (event === 'installation' || event === 'installation_repositories') {
      // Layer 1: Initial Deep Scan when a repository is first connected
      const repos = data.repositories_added || data.repositories || [];
      
      for (const repo of repos) {
        console.log(`[Webhook] Received installation for ${repo.full_name}. Triggering Layer 1 Deep Scan.`);
        
        // Enqueue a distinct 'process-repo' job. The orchestrator will know this requires
        // fetching the default branch and doing a full architectural scan rather than just a diff.
        await commitQueue.add('process-repo', {
          repoName: repo.full_name,
          installationId: data.installation?.id,
          isInitialScan: true
        });
      }
      
      return c.json({ status: 'queued', type: 'deep-scan', reposProcessed: repos.length });
    }

    return c.json({ status: 'ignored', event });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});
