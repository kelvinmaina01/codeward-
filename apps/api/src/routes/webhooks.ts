import { Hono } from 'hono';
import crypto from 'crypto';
import { agentQueue } from '../agents/queue/agent.queue.js';
import { triggerComprehensiveAudit } from '../agents/audit-trigger.js';
import { db } from '../db/index.js';
import { runs, repositories, organization, user, organizationMember, account } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { BudgetService } from '../services/budget.service.js';
import { appConfig } from '../config/app.config.js';
import { getInstallationOctokit } from '../lib/github.js';

export const webhookRouter = new Hono<{ Variables: { rawBody: string } }>();

// ─── GitHub HMAC Middleware ──────────────────────────────────────────────────

webhookRouter.use('/github', async (c, next) => {
  const signature = c.req.header('x-hub-signature-256');
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 401);
  }

  const payload = await c.req.text();
  const secret = process.env.GITHUB_WEBHOOK_SECRET || 'dev-secret';

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  if (
    signature.length !== digest.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
  ) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  c.set('rawBody', payload);
  await next();
});

// ─── GitHub Webhook Handler ──────────────────────────────────────────────────

webhookRouter.post('/github', async (c) => {
  const rawBody = c.get('rawBody');
  const event = c.req.header('x-github-event');

  try {
    const data = JSON.parse(rawBody);

    if (event === 'push') {
      const repoName = data.repository?.full_name;
      const commitSHA = data.after;
      console.log(`[Webhook] Received push for ${repoName} at ${commitSHA} — ignoring commit push (PR-only policy enabled).`);
      return c.json({
        status: 'ignored',
        reason: 'commit_push_scans_disabled_pr_only',
        message: 'Codeward operates on Pull Requests only. Open or update a PR to trigger analysis.'
      });

    } else if (event === 'installation' || event === 'installation_repositories') {
      const repos = data.repositories_added || data.repositories || [];
      const installationId = data.installation?.id;
      const accountLogin = data.installation?.account?.login;
      const accountType = data.installation?.account?.type;
      let auditsTriggered = 0;

      let orgRecord: any = null;
      if (accountLogin && accountType === 'Organization') {
        const existingOrgs = await db.select().from(organization).where(eq(organization.githubLogin, accountLogin));
        if (existingOrgs.length > 0) {
          orgRecord = existingOrgs[0];
        } else {
          const [insertedOrg] = await db.insert(organization).values({
            githubLogin: accountLogin,
            planType: 'free',
          }).returning();
          orgRecord = insertedOrg;
        }

        // Link the installing user if known in our database
        if (data.sender?.id && orgRecord) {
          try {
            const senderAccounts = await db.select().from(account).where(
              and(eq(account.providerId, 'github'), eq(account.accountId, String(data.sender.id)))
            );
            if (senderAccounts.length > 0) {
              const existingMember = await db.select().from(organizationMember).where(
                and(eq(organizationMember.orgId, orgRecord.id), eq(organizationMember.userId, senderAccounts[0].userId))
              );
              if (existingMember.length === 0) {
                await db.insert(organizationMember).values({
                  orgId: orgRecord.id,
                  userId: senderAccounts[0].userId,
                  role: 'admin',
                });
              }
            }
          } catch (mErr) {
            console.warn('[Webhook] Could not link organization member on install:', mErr);
          }
        }
      }

      for (const repo of repos) {
        const [existing] = await db.select().from(repositories).where(eq(repositories.fullName, repo.full_name));
        if (existing) {
          console.log(`[Webhook] Re-installation for already-connected repo ${repo.full_name} — triggering a real re-audit.`);
          await db.update(repositories).set({
            status: 'pending_audit',
            auditTriggeredAt: new Date(),
            githubRepoId: repo.id,
            installationId,
            ...(orgRecord ? { orgId: orgRecord.id } : {}),
          }).where(eq(repositories.id, existing.id));
          await triggerComprehensiveAudit(existing.id, repo.full_name);
          auditsTriggered++;
        } else {
          console.log(`[Webhook] ${repo.full_name} installed but not yet connected — no audit triggered; /api/repos/connect will do it when they click Connect.`);
        }
      }

      return c.json({ status: 'ok', type: 'installation', reposSeen: repos.length, auditsTriggered, org: accountLogin });

    } else if (event === 'pull_request' && (data.action === 'opened' || data.action === 'synchronize')) {
      const prNumber    = data.pull_request.number;
      const repoName    = data.repository?.full_name;
      const commitSHA   = data.pull_request.head?.sha;
      const headRef     = data.pull_request.head?.ref ?? '';
      const authorType  = data.pull_request.user?.type ?? '';

      console.log(`[Webhook] Received PR ${data.action} for ${repoName} #${prNumber} at ${commitSHA}`);

      // Skip Codeward's own auto-fix PRs
      if (authorType === 'Bot' || headRef.startsWith('codeward/')) {
        console.log(`[Webhook] Ignoring PR #${prNumber} — Codeward's own auto-fix PR.`);
        return c.json({ status: 'ignored', reason: 'own auto-fix PR' });
      }

      const [repo] = await db.select().from(repositories).where(eq(repositories.fullName, repoName));
      if (!repo) {
        console.log(`[Webhook] Ignoring PR for ${repoName} — repo is not connected.`);
        return c.json({ status: 'ignored', reason: 'repo not connected' });
      }

      // Tier 1: Global budget sentinel
      const isBudgetOk = await BudgetService.checkGlobalBudget();
      if (!isBudgetOk) {
        return c.json({ status: 'ignored', reason: 'global_budget_exceeded' }, 429);
      }

      let runRecord: any;

      if (repo.orgId) {
        // Tier 2: Per-org PR quota (atomic gate)
        const reservation = await BudgetService.reserveOrgPrRun(repo.orgId, {
          repoId: repo.id,
          commitSha: commitSHA,
          prNumber,
        });

        if (!reservation.allowed) {
          // Post a friendly "trial exhausted" comment on the PR
          await postTrialExhaustedComment({
            installationId: repo.installationId,
            owner: repo.owner,
            repoName: repo.name,
            prNumber,
            orgId: repo.orgId,
            githubLogin: repo.owner,
            reason: reservation.reason,
          });

          return c.json({ status: 'ignored', reason: reservation.reason }, 403);
        }

        runRecord = reservation.runRecord;
      } else {
        const [inserted] = await db.insert(runs).values({
          repoId: repo.id,
          commitSha: commitSHA,
          status: 'queued',
          prNumber,
        }).returning();
        runRecord = inserted;
      }

      try {
        const { isRedisQuotaExceeded } = await import('../lib/redis.js');
        if (!isRedisQuotaExceeded()) {
          await Promise.race([
            agentQueue.add('orchestrator-phase1', {
              agentId: 'orchestrator_phase1',
              commitSHA,
              repoFullName: repoName,
              runId: runRecord.id,
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Queue timeout (Redis unavailable)')), 2500))
          ]);
        } else {
          console.warn(`[Webhook] Redis quota exceeded — run #${runRecord.id} recorded in Postgres, queue dispatch deferred.`);
        }
      } catch (queueErr: any) {
        console.warn(`[Webhook] Could not enqueue orchestrator-phase1 for run #${runRecord.id}:`, queueErr?.message);
      }

      // Visible immediately on GitHub, but never block the webhook acknowledgement if GitHub
      // is temporarily unavailable. The run remains the idempotency anchor for retries.
      void import('../services/github-pr-lifecycle.service.js')
        .then(({ startPrLifecycle }) => startPrLifecycle(runRecord.id))
        .catch((lifecycleError) => {
          console.error(`[Webhook] Could not start PR lifecycle for run #${runRecord.id}:`, (lifecycleError as Error).message);
        });

      return c.json({ status: 'queued', type: 'orchestrator', commitSHA, runId: runRecord.id, prNumber });
    } else if ((event === 'issue_comment' || event === 'pull_request_review_comment') && data.action === 'created') {
      const body = String(data.comment?.body ?? '');
      const isPullRequest = event === 'pull_request_review_comment' || Boolean(data.issue?.pull_request);
      const repoName = data.repository?.full_name;
      const isBot = data.sender?.type === 'Bot';
      if (!isPullRequest || isBot || !/@codeward\b|\/codeward\b/i.test(body)) return c.json({ status: 'ignored', reason: 'not an explicit Codeward PR mention' });
      const prNumber = event === 'pull_request_review_comment' ? data.pull_request?.number : data.issue?.number;
      if (!repoName || !prNumber) return c.json({ status: 'ignored', reason: 'missing PR context' });
      // Do not make GitHub wait on the model. This is a bounded, read-only evidence response.
      void import('../services/github-comment-responder.service.js').then(({ respondToGithubMention }) =>
        respondToGithubMention({ repoFullName: repoName, prNumber, body, inlineCommentId: event === 'pull_request_review_comment' ? data.comment?.id : undefined })
      ).catch((e) => console.error(`[Webhook] Codeward mention reply failed: ${e.message}`));
      return c.json({ status: 'accepted', type: 'codeward_mention', prNumber });
    }

    return c.json({ status: 'ignored', event });
  } catch (error) {
    console.error('Error processing GitHub webhook:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// ─── Polar Webhook Handler ───────────────────────────────────────────────────

/**
 * Verifies a Polar webhook signature using the Standard Webhooks spec.
 * Headers: webhook-id, webhook-timestamp, webhook-signature
 * Signature: HMAC-SHA256(webhook-id + "\n" + webhook-timestamp + "\n" + body)
 * The secret is base64-encoded in Polar's dashboard.
 */
function verifyPolarSignature(
  rawBody: string,
  headers: { id: string; timestamp: string; signature: string }
): boolean {
  try {
    const secret = appConfig.polar.webhookSecret;

    // Polar (Standard Webhooks) uses a base64-encoded secret.
    // In test mode we skip verification if secret is the placeholder.
    if (secret === 'test_secret') {
      console.warn('[Polar Webhook] Using test_secret — signature verification SKIPPED. Set POLAR_WEBHOOK_SECRET in prod.');
      return true;
    }

    const keyBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const toSign   = `${headers.id}\n${headers.timestamp}\n${rawBody}`;
    const expected = crypto.createHmac('sha256', keyBytes).update(toSign).digest('base64');

    // The signature header can contain multiple space-separated "vN,<sig>" pairs
    return headers.signature
      .split(' ')
      .some((part) => {
        const sig = part.startsWith('v1,') ? part.slice(3) : part;
        const sigBuf = Buffer.from(sig, 'base64');
        const expBuf = Buffer.from(expected, 'base64');
        // timingSafeEqual throws if buffers differ in length — check first
        if (sigBuf.length !== expBuf.length) return false;
        return crypto.timingSafeEqual(sigBuf, expBuf);
      });
  } catch (err) {
    console.error('[Polar Webhook] Signature verification error:', err);
    return false;
  }
}

/** Maps a Polar product ID to a Codeward plan tier. */
function resolvePlanFromProductId(productId: string): 'pro' | 'team' | null {
  if (productId === appConfig.polar.proProductId)  return 'pro';
  if (productId === appConfig.polar.teamProductId) return 'team';
  return null;
}

/** Looks up the orgId from a userId or direct orgId (from clientReferenceId or metadata). */
async function resolveOrgFromUserId(userId: string): Promise<number | null> {
  if (!userId) return null;

  // 1. Direct numeric orgId (e.g. if passed as teamId or numeric clientReferenceId)
  const numId = Number(userId);
  if (!isNaN(numId) && numId > 0) {
    const [directOrg] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, numId))
      .limit(1);
    if (directOrg) return directOrg.id;
  }

  // 2. Check organizationMember (canonical membership link for workspace/user)
  const [member] = await db
    .select({ orgId: organizationMember.orgId })
    .from(organizationMember)
    .where(eq(organizationMember.userId, userId))
    .limit(1);
  if (member?.orgId) return member.orgId;

  // 3. Check repositories
  const [row] = await db
    .select({ orgId: repositories.orgId })
    .from(repositories)
    .where(eq(repositories.userId, userId))
    .limit(1);
  if (row?.orgId) return row.orgId;

  // 4. Auto-provision organization if user exists in auth table
  const [u] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (u) {
    const slug = (u.name || u.email.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
    const uniqueLogin = `${slug}-${u.id.slice(0, 6)}`;

    let [newOrg] = await db
      .insert(organization)
      .values({
        githubLogin: uniqueLogin,
        planType: 'free',
        trialPrLimit: appConfig.billing.trialPrLimit,
        trialPrsUsed: 0,
      })
      .onConflictDoNothing()
      .returning();

    if (!newOrg) {
      [newOrg] = await db.select().from(organization).where(eq(organization.githubLogin, uniqueLogin)).limit(1);
    }

    if (newOrg) {
      await db.insert(organizationMember).values({
        orgId: newOrg.id,
        userId: u.id,
        role: 'owner',
      }).onConflictDoNothing();
      return newOrg.id;
    }
  }

  return null;
}

webhookRouter.post('/polar', async (c) => {
  const rawBody   = await c.req.text();
  const webhookId = c.req.header('webhook-id')        ?? '';
  const timestamp = c.req.header('webhook-timestamp') ?? '';
  const signature = c.req.header('webhook-signature') ?? '';

  // Reject if essential Standard Webhooks headers are missing
  if (!webhookId || !timestamp || !signature) {
    return c.json({ error: 'Missing webhook headers' }, 400);
  }

  if (!verifyPolarSignature(rawBody, { id: webhookId, timestamp, signature })) {
    console.error('[Polar Webhook] Signature verification FAILED — rejecting event.');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const eventType: string = event.type ?? '';
  const eventData: any   = event.data ?? {};

  console.log(`[Polar Webhook] Received event: ${eventType} | id: ${webhookId}`);

  try {
    // ── subscription.created ────────────────────────────────────────────────
    // ── subscription.updated ────────────────────────────────────────────────
    if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
      const productId       = eventData.product_id ?? eventData.productId ?? '';
      const polarCustomerId = eventData.customer_id ?? eventData.customerId ?? '';
      const subId           = eventData.id ?? '';
      const clientRefId     = eventData.checkout_id
        ? (eventData.metadata?.userId ?? eventData.client_reference_id ?? '')
        : (eventData.metadata?.userId ?? eventData.client_reference_id ?? '');

      const periodStart = eventData.current_period_start
        ? new Date(eventData.current_period_start)
        : new Date();
      const periodEnd = eventData.current_period_end
        ? new Date(eventData.current_period_end)
        : null;

      const newPlan = resolvePlanFromProductId(productId);
      if (!newPlan) {
        console.warn(`[Polar Webhook] Unknown product ID "${productId}" — no plan change applied.`);
        return c.json({ status: 'ok', note: 'unknown_product_id' });
      }

      // Resolve org from clientReferenceId (set during checkout by PricingPage)
      let orgId: number | null = null;
      if (clientRefId) {
        orgId = await resolveOrgFromUserId(clientRefId);
      }
      // Fallback: try to find org by polar customer ID if already stored
      if (!orgId && polarCustomerId) {
        const [existing] = await db
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.polarCustomerId, polarCustomerId));
        orgId = existing?.id ?? null;
      }

      if (!orgId) {
        console.error(`[Polar Webhook] Cannot resolve org for subscription ${subId} — clientRefId: "${clientRefId}", customerId: "${polarCustomerId}"`);
        return c.json({ status: 'error', reason: 'org_not_found' }, 422);
      }

      await db.update(organization).set({
        planType:            newPlan,
        polarCustomerId,
        polarSubscriptionId: subId,
        polarProductId:      productId,
        currentPeriodStart:  periodStart,
        currentPeriodEnd:    periodEnd ?? undefined,
        // Pro-tier quota stored in the existing prQuotaLimit column
        prQuotaLimit:        newPlan === 'pro' ? appConfig.billing.proPrLimit : -1,
      }).where(eq(organization.id, orgId));

      console.log(`[Polar Webhook] Org ${orgId} upgraded to plan: ${newPlan}`);

      // Idempotency guard: only enqueue the upgrade email on subscription.created,
      // not on subscription.updated retries or re-deliveries — avoids duplicate emails
      // when Polar retries because we returned non-200 (e.g. a transient DB hitch).
      // The DB update above is always safe to replay (idempotent UPDATE by orgId).
      if (eventType === 'subscription.created') {
        try {
          const { emailQueue } = await import('../queue/email.queue.js');
          await emailQueue.add(
            'plan-upgraded',
            { type: 'plan-upgraded', orgId, planType: newPlan },
            // Use Polar's subscription ID as the BullMQ job ID so replaying
            // the same event twice deduplicates at the queue level too.
            { jobId: `plan-upgraded:${subId}` }
          );
        } catch (e) {
          console.warn('[Polar Webhook] Failed to enqueue upgrade email:', e);
        }
      }

      return c.json({ status: 'ok', orgId, plan: newPlan });
    }

    // ── subscription.canceled ────────────────────────────────────────────────
    if (eventType === 'subscription.canceled' || eventType === 'subscription.revoked') {
      const subId           = eventData.id ?? '';
      const polarCustomerId = eventData.customer_id ?? eventData.customerId ?? '';

      const [org] = await db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.polarSubscriptionId, subId));

      if (!org) {
        // Try by customer ID
        const [byCustomer] = await db
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.polarCustomerId, polarCustomerId));

        if (!byCustomer) {
          console.warn(`[Polar Webhook] Canceled subscription ${subId} — org not found. Ignoring.`);
          return c.json({ status: 'ok', note: 'org_not_found_for_cancellation' });
        }

        await db.update(organization).set({
          planType:            'free',
          polarSubscriptionId: null,
          prQuotaLimit:        appConfig.billing.trialPrLimit,
          currentPeriodEnd:    null,
        }).where(eq(organization.id, byCustomer.id));

        console.log(`[Polar Webhook] Org ${byCustomer.id} downgraded to free (subscription canceled).`);
      } else {
        await db.update(organization).set({
          planType:            'free',
          polarSubscriptionId: null,
          prQuotaLimit:        appConfig.billing.trialPrLimit,
          currentPeriodEnd:    null,
        }).where(eq(organization.id, org.id));

        console.log(`[Polar Webhook] Org ${org.id} downgraded to free (subscription canceled).`);
      }

      return c.json({ status: 'ok', note: 'downgraded_to_free' });
    }

    // ── order.created — log for analytics, no plan change needed ────────────
    if (eventType === 'order.created') {
      console.log(`[Polar Webhook] order.created logged. Product: ${eventData.product_id}, Amount: ${eventData.amount}`);
      return c.json({ status: 'ok', note: 'order_logged' });
    }

    // Unknown event — ack to prevent retries
    console.log(`[Polar Webhook] Unhandled event type "${eventType}" — acknowledged.`);
    return c.json({ status: 'ok', note: 'unhandled_event_type' });

  } catch (err) {
    console.error('[Polar Webhook] Error processing event:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// ─── /upgrade Redirect Endpoint ─────────────────────────────────────────────
// Dynamic Polar checkout session creator.
// Link in GitHub PR comments points here (owns our domain, no static Polar URL),
// and attaches metadata.teamId so the webhook handler knows exactly which org paid.
//
// GET /webhooks/upgrade?team=ORG_GITHUB_LOGIN&source=pr_comment|trial_email|dashboard
//
// Requires POLAR_ACCESS_TOKEN to be set in production.

webhookRouter.get('/upgrade', async (c) => {
  const githubLogin = c.req.query('team') ?? '';
  const source      = c.req.query('source') ?? 'unknown';

  if (!githubLogin) {
    return c.redirect(appConfig.polar.upgradeUrl);
  }

  // If no Polar access token, fall back to the pricing page gracefully
  if (!appConfig.polar.accessToken) {
    console.warn('[Upgrade] POLAR_ACCESS_TOKEN not set — redirecting to pricing page as fallback.');
    return c.redirect(`${appConfig.polar.upgradeUrl}?team=${githubLogin}&source=${source}`);
  }

  try {
    // Find the org
    const [org] = await db
      .select({ id: organization.id, planType: organization.planType })
      .from(organization)
      .where(eq(organization.githubLogin, githubLogin));

    if (!org) {
      return c.redirect(appConfig.polar.upgradeUrl);
    }

    // Create a Polar checkout session dynamically
    const polarRes = await fetch('https://api.polar.sh/v1/checkouts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${appConfig.polar.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id:   appConfig.polar.proProductId,
        success_url:  `${appConfig.app.frontendUrl}/upgrade/success?team=${githubLogin}`,
        metadata: {
          // This lands back in the webhook as metadata.teamId
          // so we know exactly which org to upgrade — no email guessing.
          teamId: String(org.id),
          githubLogin,
          source,
        },
      }),
    });

    if (!polarRes.ok) {
      const err = await polarRes.text();
      console.error(`[Upgrade] Polar checkout creation failed:`, err);
      return c.redirect(appConfig.polar.upgradeUrl);
    }

    const session = await polarRes.json() as any;
    return c.redirect(session.url);
  } catch (err) {
    console.error('[Upgrade] Error creating Polar checkout session:', err);
    return c.redirect(appConfig.polar.upgradeUrl);
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Posts a friendly "trial limit reached" review comment on the PR
 * so the dev team knows exactly why the scan didn't run and how to fix it.
 */
async function postTrialExhaustedComment(params: {
  installationId: number | null | undefined;
  owner: string;
  repoName: string;
  prNumber: number;
  orgId: number;
  githubLogin: string;
  reason?: string;
}) {
  const { installationId, owner, repoName, prNumber, orgId, githubLogin, reason } = params;

  if (!installationId) {
    console.warn(`[Trial Gate] No installationId for ${owner}/${repoName} — cannot post trial comment.`);
    return;
  }

  const upgradeUrl = `${appConfig.app.frontendUrl}/webhooks/upgrade?team=${encodeURIComponent(githubLogin)}&source=pr_comment`;
  const limit = appConfig.billing.trialPrLimit;

  // GitHub PR comments support: <img>, <details>/<summary>, <table>, <sub>/<sup>, <br>, blockquotes.
  // We build a premium bot comment that matches the visual language of top-tier review bots
  // (Qodo, CodeRabbit) — minimal header, clear single message, collapsible detail, clean footer.
  const body = [
    // ── Logo header ──────────────────────────────────────────────────────────
    `<picture>`,
    `  <img src="https://i.ibb.co/0jxSNrnp/codewrdlogo-png-removebg-preview.png" height="28" alt="Codeward" />`,
    `</picture>`,
    ``,
    `---`,
    ``,
    // ── Core message — mirrors Qodo's clean single-paragraph style ────────────
    `> ℹ️ &nbsp; **Codeward reviews are paused — your ${limit}-PR free trial has been used up.**`,
    `> This PR didn't receive a full scan. Upgrade to resume reviews automatically, starting on your very next push.`,
    `>`,
    `> **[Upgrade to Pro →](${upgradeUrl})**&nbsp;&nbsp;&nbsp;<sub>Scans resume instantly · no re-setup · no re-installation</sub>`,
    ``,
    // ── Collapsible "what you missed" — only shown if they expand it ──────────
    `<details>`,
    `<summary>🔍 &nbsp; <b>Agents that would have run on this PR</b></summary>`,
    `<br>`,
    ``,
    `| Agent | What it catches |`,
    `|:---|:---|`,
    `| 🔐 &nbsp; **Security** | Auth flaws · exposed secrets · injection patterns · insecure dependencies |`,
    `| 🏛️ &nbsp; **Architecture** | Design antipatterns · tight coupling · structural violations |`,
    `| 🧹 &nbsp; **Bloat** | Dead code · duplicated logic · unnecessary complexity |`,
    `| 🤖 &nbsp; **AI Era** | LLM misuse · prompt injection · insecure AI integrations |`,
    `| 📋 &nbsp; **Compliance** | License violations · regulatory red flags |`,
    `| 🩺 &nbsp; **Data DX** | Schema issues · N+1 queries · data access antipatterns |`,
    ``,
    `</details>`,
    ``,
    `---`,
    ``,
    // ── Footer ────────────────────────────────────────────────────────────────
    `<sub>🤖 &nbsp;<b>Codeward</b> · Automated Principal Engineer · `,
    `<a href="${upgradeUrl}">Manage billing</a> · `,
    `Already upgraded? Allow up to 60 s for your plan to activate.</sub>`,
  ].join('\n');

  try {
    const octokit = await getInstallationOctokit(installationId);
    if ((octokit as any)?.rest?.issues?.createComment) {
      await (octokit as any).rest.issues.createComment({
        owner,
        repo: repoName,
        issue_number: prNumber,
        body,
      });
      console.log(`[Trial Gate] Posted trial-exhausted comment on ${owner}/${repoName}#${prNumber}`);
    }
  } catch (err) {
    // Non-fatal — the 403 response is still returned to GitHub, the comment is just cosmetic.
    console.error(`[Trial Gate] Failed to post trial comment on ${owner}/${repoName}#${prNumber}:`, err);
  }
}
