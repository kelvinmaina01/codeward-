import { Hono } from 'hono';
import crypto from 'crypto';
import { pushQueue } from '../queue/index.js';
import { agentQueue } from '../agents/queue/agent.queue.js';
import { triggerComprehensiveAudit } from '../agents/audit-trigger.js';
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
      const beforeSHA = data.before;
      const repoName = data.repository?.full_name;

      console.log(`[Webhook] Received push for ${repoName} at ${commitSHA}`);

      // A push for a repo nobody connected is noise, not work — and a run row without a
      // repoId is an orphan that breaks memory, reports, and escalation downstream.
      const [repo] = await db.select().from(repositories).where(eq(repositories.fullName, repoName));
      if (!repo) {
        console.log(`[Webhook] Ignoring push for ${repoName} — repo is not connected.`);
        return c.json({ status: 'ignored', reason: 'repo not connected' });
      }
      if (repo.paused) {
        console.log(`[Webhook] Ignoring push for ${repoName} — repo is paused by the user.`);
        return c.json({ status: 'ignored', reason: 'repo paused' });
      }

      const [runRecord] = await db.insert(runs).values({
        repoId: repo.id,
        commitSha: commitSHA,
        status: 'queued',
      }).returning();

      // Enqueue job in BullMQ (Layer 2: Push Guard)
      await pushQueue.add('process-push', {
        runId: runRecord.id,
        commitSHA,
        beforeSHA,
        repoFullName: repoName
      });

      return c.json({ status: 'queued', type: 'incremental', commitSHA, runId: runRecord.id });
    } else if (event === 'installation' || event === 'installation_repositories') {
      // GitHub App (re-)installation. A full user-journey audit found this used to enqueue to a
      // completely disconnected legacy queue (queue/audit.queue.ts) whose worker checked
      // job.data.type, a field never set here -- a permanent no-op, on top of 100% mock logic
      // underneath anyway. Real fix: only trigger the real audit for repos that ALREADY have a
      // real repositories row (a genuine re-installation / re-authorization case) -- if the repo
      // doesn't exist yet, the user hasn't connected it via the UI, and /api/repos/connect is
      // the real trigger point for that (it needs the real userId, which this event doesn't have).
      const repos = data.repositories_added || data.repositories || [];
      const installationId = data.installation?.id;
      let auditsTriggered = 0;

      for (const repo of repos) {
        const [existing] = await db.select().from(repositories).where(eq(repositories.fullName, repo.full_name));

        if (existing) {
          console.log(`[Webhook] Re-installation for already-connected repo ${repo.full_name} — triggering a real re-audit.`);
          await db.update(repositories).set({
            status: 'pending_audit',
            auditTriggeredAt: new Date(),
            githubRepoId: repo.id,
            installationId: installationId,
          }).where(eq(repositories.id, existing.id));
          await triggerComprehensiveAudit(existing.id, repo.full_name);
          auditsTriggered++;
        } else {
          console.log(`[Webhook] ${repo.full_name} installed but not yet connected by a user — no audit triggered here; /api/repos/connect will do it when they click Connect.`);
        }
      }

      return c.json({ status: 'ok', type: 'installation', reposSeen: repos.length, auditsTriggered });
    } else if (event === 'pull_request' && (data.action === 'opened' || data.action === 'synchronize')) {
      const prNumber = data.pull_request.number;
      const repoName = data.repository?.full_name;
      const commitSHA = data.pull_request.head?.sha;
      const headRef = data.pull_request.head?.ref ?? '';
      const authorType = data.pull_request.user?.type ?? '';

      console.log(`[Webhook] Received PR ${data.action} for ${repoName} #${prNumber} at ${commitSHA}`);

      // Skip Codeward's OWN auto-fix PRs — they were already reviewed inside the fixer flow when
      // opened. Re-analyzing them here would duplicate work and (since opening a fix PR fires
      // this same webhook) create a needless second run per bot PR.
      if (authorType === 'Bot' || headRef.startsWith('codeward/')) {
        console.log(`[Webhook] Ignoring PR #${prNumber} — Codeward's own auto-fix PR (already reviewed in the fixer flow).`);
        return c.json({ status: 'ignored', reason: 'own auto-fix PR' });
      }

      // Same orphan-run guard as the push path: a PR on an unconnected repo is noise, and a run
      // without a repoId breaks memory/reports/escalation downstream.
      const [repo] = await db.select().from(repositories).where(eq(repositories.fullName, repoName));
      if (!repo) {
        console.log(`[Webhook] Ignoring PR for ${repoName} — repo is not connected.`);
        return c.json({ status: 'ignored', reason: 'repo not connected' });
      }

      const [runRecord] = await db.insert(runs).values({
        repoId: repo.id,
        commitSha: commitSHA,
        status: 'queued',
        prNumber,
      }).returning();

      // Enqueue Phase 1 of the Orchestrator. After Phase 3, because this run carries a prNumber,
      // guardian will post a real review on the human's PR (wired in agent.queue.ts).
      await agentQueue.add('orchestrator-phase1', {
        agentId: 'orchestrator_phase1',
        commitSHA,
        repoFullName: repoName,
        runId: runRecord.id
      });

      return c.json({ status: 'queued', type: 'orchestrator', commitSHA, runId: runRecord.id, prNumber });
    }

    return c.json({ status: 'ignored', event });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});
