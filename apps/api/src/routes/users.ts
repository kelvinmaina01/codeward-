import { Hono } from 'hono';
import { db } from '../db/index.js';
import { repositories, chatSessions, workspace, user, accountDeletions, organization, organizationMember, account, session, runs, agentTasks, runLogs } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { auth } from '../auth/index.js';
import { NotificationService } from '../notifications/NotificationService.js';
import { PolarService } from '../services/polar.service.js';
import { appConfig } from '../config/app.config.js';

export const usersRouter = new Hono();

/**
 * Generates an authenticated Polar Customer Portal session URL for the current user.
 * Validates the user's session, finds or provisions their customer record on Polar,
 * and returns the time-limited portal session link.
 */
usersRouter.post('/me/billing-portal', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const portalUrl = await PolarService.getCustomerPortalUrl({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });

    // Optionally attach customer ID to the user's organization in DB
    try {
      const [membership] = await db
        .select({ orgId: organizationMember.orgId })
        .from(organizationMember)
        .where(eq(organizationMember.userId, session.user.id))
        .limit(1);

      if (membership?.orgId) {
        const customer = await PolarService.findCustomerByEmail(session.user.email);
        if (customer?.id) {
          await db
            .update(organization)
            .set({ polarCustomerId: customer.id })
            .where(eq(organization.id, membership.orgId));
        }
      }
    } catch (dbErr) {
      console.warn('[Billing Portal] Non-fatal error persisting polar customer ID to DB:', dbErr);
    }

    return c.json({
      success: true,
      url: portalUrl,
    });
  } catch (err: any) {
    console.error('[Billing Portal] Failed to generate portal session:', err);
    return c.json({
      error: 'Failed to create billing portal session',
      message: err?.message || 'Polar service error',
    }, 500);
  }
});

/**
 * Direct browser redirect to the Polar Customer Portal for the logged-in user.
 */
usersRouter.get('/me/billing-portal', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.redirect(`${appConfig.app.frontendUrl}/login?redirect=/dashboard/settings?tab=billing`);
  }

  try {
    const portalUrl = await PolarService.getCustomerPortalUrl({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
    return c.redirect(portalUrl);
  } catch (err: any) {
    console.error('[Billing Portal] Direct redirect failed:', err);
    return c.redirect(`${appConfig.app.frontendUrl}/dashboard/settings?tab=billing&error=portal_failed`);
  }
});

/**
 * Returns billing & subscription information for the authenticated user and their active organization.
 * Automatically provisions an organization record if the user does not have one yet.
 */
usersRouter.get('/me/billing-info', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    let [membership] = await db
      .select({
        orgId: organization.id,
        planType: organization.planType,
        prQuotaLimit: organization.prQuotaLimit,
        trialPrsUsed: organization.trialPrsUsed,
        trialPrLimit: organization.trialPrLimit,
        polarCustomerId: organization.polarCustomerId,
        polarSubscriptionId: organization.polarSubscriptionId,
        currentPeriodStart: organization.currentPeriodStart,
        currentPeriodEnd: organization.currentPeriodEnd,
      })
      .from(organizationMember)
      .innerJoin(organization, eq(organizationMember.orgId, organization.id))
      .where(eq(organizationMember.userId, session.user.id))
      .limit(1);

    // If user has no organization entry yet, provision one dynamically
    if (!membership) {
      const slug = (session.user.name || session.user.email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-');
      const uniqueLogin = `${slug}-${session.user.id.slice(0, 6)}`;

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
        [newOrg] = await db
          .select()
          .from(organization)
          .where(eq(organization.githubLogin, uniqueLogin))
          .limit(1);
      }

      if (newOrg) {
        await db
          .insert(organizationMember)
          .values({
            orgId: newOrg.id,
            userId: session.user.id,
            role: 'owner',
          })
          .onConflictDoNothing();

        membership = {
          orgId: newOrg.id,
          planType: newOrg.planType,
          prQuotaLimit: newOrg.prQuotaLimit,
          trialPrsUsed: newOrg.trialPrsUsed,
          trialPrLimit: newOrg.trialPrLimit,
          polarCustomerId: newOrg.polarCustomerId,
          polarSubscriptionId: newOrg.polarSubscriptionId,
          currentPeriodStart: newOrg.currentPeriodStart,
          currentPeriodEnd: newOrg.currentPeriodEnd,
        };
      }
    }

    return c.json({
      success: true,
      plan: membership?.planType || 'free',
      trialPrsUsed: membership?.trialPrsUsed ?? 0,
      trialPrLimit: membership?.trialPrLimit ?? appConfig.billing.trialPrLimit,
      prQuotaLimit: membership?.prQuotaLimit ?? appConfig.billing.proPrLimit,
      hasSubscription: Boolean(membership?.polarSubscriptionId),
      polarCustomerId: membership?.polarCustomerId || null,
      currentPeriodStart: membership?.currentPeriodStart || null,
      currentPeriodEnd: membership?.currentPeriodEnd || null,
    });
  } catch (err: any) {
    console.error('[Billing Info] Error fetching billing info:', err);
    return c.json({ error: 'Failed to fetch billing info' }, 500);
  }
});

/**
 * Returns pre-authenticated checkout URL for Pro or Team plan on Polar.
 */
usersRouter.get('/me/checkout-url', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const plan = c.req.query('plan') === 'team' ? 'team' : 'pro';
  const baseCheckout = plan === 'team'
    ? 'https://buy.polar.sh/polar_cl_G8nQdTjkiE3TT0f9HwQtEzZAA1FrGatie2AYr1PiFep'
    : 'https://buy.polar.sh/polar_cl_F6pFlJMO8NB1edLEiNLZ3ED0arMmOtoFUtpBc1J7ibY';

  const checkoutUrl = `${baseCheckout}?client_reference_id=${encodeURIComponent(session.user.id)}&customer_email=${encodeURIComponent(session.user.email)}`;

  return c.json({
    success: true,
    plan,
    url: checkoutUrl,
  });
});

usersRouter.post('/me/delete', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const userId = session.user.id;
  const userName = session.user.name || 'User';
  const userEmail = session.user.email;

  // 1. Gather data summary
  const reposCount = await db.$count(repositories, eq(repositories.userId, userId));
  const chatSessionsCount = await db.$count(chatSessions, eq(chatSessions.userId, userId));
  const workspacesCount = await db.$count(workspace, eq(workspace.ownerId, userId));

  const dataSummary = {
    Repositories: reposCount,
    'Chat Sessions': chatSessionsCount,
    Workspaces: workspacesCount,
  };

  // 2. Insert into account_deletions queue and update user table
  await db.transaction(async (tx) => {
    await tx.update(user).set({ isDeleted: true }).where(eq(user.id, userId));
    await tx.insert(accountDeletions).values({
      userId: userId,
      status: 'pending',
    });
  });

  // 3. Send email asynchronously
  try {
    await NotificationService.sendAccountDeletionQueued(userEmail, userName, dataSummary);
  } catch (err) {
    console.error('Failed to send account deletion email:', err);
    // Continue even if email fails
  }

  // 4. Revoke the user's session (log them out)
  // The client side better-auth SDK handles clearing cookies, but we can revoke it server-side too if needed
  try {
     // BetterAuth doesn't have a direct revoke by session object easily accessible via `api`, 
     // but client will call signOut() anyway.
  } catch(e) {}

  return c.json({ success: true });
});

/**
 * Administrative endpoint to list users directly from the active database.
 * Protected by BETTER_AUTH_SECRET or GITHUB_WEBHOOK_SECRET.
 */
usersRouter.get('/admin/list-users', async (c) => {
  const adminKey = c.req.header('x-admin-key') || c.req.query('key');
  const validSecret = process.env.BETTER_AUTH_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
  if (!adminKey || !validSecret || adminKey !== validSecret) {
    return c.json({ error: 'Forbidden: invalid admin key' }, 403);
  }

  const users = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      isDeleted: user.isDeleted,
      createdAt: user.createdAt,
    })
    .from(user);

  return c.json({ count: users.length, users });
});

/**
 * Administrative endpoint to hard-delete (cascade purge) a user by email from the active database.
 * Protected by BETTER_AUTH_SECRET or GITHUB_WEBHOOK_SECRET.
 */
usersRouter.post('/admin/purge-user', async (c) => {
  const adminKey = c.req.header('x-admin-key') || c.req.query('key');
  const validSecret = process.env.BETTER_AUTH_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
  if (!adminKey || !validSecret || adminKey !== validSecret) {
    return c.json({ error: 'Forbidden: invalid admin key' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const email = (body.email || c.req.query('email') || '').trim();
  if (!email) {
    return c.json({ error: 'Missing required field: email' }, 400);
  }

  const usersToDelete = await db.select().from(user).where(eq(user.email, email));
  if (usersToDelete.length === 0) {
    return c.json({ message: `No user found with email: ${email}` }, 404);
  }

  const purged: any[] = [];
  for (const u of usersToDelete) {
    await db.delete(accountDeletions).where(eq(accountDeletions.userId, u.id)).catch(() => {});
    await db.delete(session).where(eq(session.userId, u.id)).catch(() => {});
    await db.delete(account).where(eq(account.userId, u.id)).catch(() => {});
    await db.delete(organizationMember).where(eq(organizationMember.userId, u.id)).catch(() => {});

    const repos = await db.select().from(repositories).where(eq(repositories.userId, u.id));
    for (const r of repos) {
      await db.delete(runs).where(eq(runs.repoId, r.id)).catch(() => {});
      await db.delete(repositories).where(eq(repositories.id, r.id)).catch(() => {});
    }

    await db.delete(user).where(eq(user.id, u.id));
    purged.push({ id: u.id, email: u.email });
  }

  return c.json({ success: true, purged });
});

/**
 * Administrative diagnostic endpoint to inspect system state, recent runs, tasks and errors.
 * Protected by BETTER_AUTH_SECRET or GITHUB_WEBHOOK_SECRET.
 */
usersRouter.get('/admin/diagnostics', async (c) => {
  const adminKey = c.req.header('x-admin-key') || c.req.query('key');
  const validSecret = process.env.BETTER_AUTH_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
  if (!adminKey || !validSecret || adminKey !== validSecret) {
    return c.json({ error: 'Forbidden: invalid admin key' }, 403);
  }

  const latestRuns = await db
    .select({
      id: runs.id,
      repoId: runs.repoId,
      status: runs.status,
      commitSha: runs.commitSha,
      score: runs.score,
      createdAt: runs.createdAt,
    })
    .from(runs)
    .orderBy(desc(runs.id))
    .limit(10);

  const latestTasks = await db
    .select({
      id: agentTasks.id,
      runId: agentTasks.runId,
      agentId: agentTasks.agentId,
      status: agentTasks.status,
      error: agentTasks.error,
      model: agentTasks.model,
      duration: agentTasks.duration,
      createdAt: agentTasks.createdAt,
      completedAt: agentTasks.completedAt,
    })
    .from(agentTasks)
    .orderBy(desc(agentTasks.id))
    .limit(15);

  const latestLogs = await db
    .select({
      id: runLogs.id,
      runId: runLogs.runId,
      level: runLogs.level,
      message: runLogs.message,
      tsMs: runLogs.tsMs,
    })
    .from(runLogs)
    .orderBy(desc(runLogs.id))
    .limit(35);

  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    AI_ENGINE: process.env.AI_ENGINE,
    BEDROCK_REGION: process.env.BEDROCK_REGION,
    AWS_REGION: process.env.AWS_REGION,
    BEDROCK_MODEL_MECHANICAL: process.env.BEDROCK_MODEL_MECHANICAL,
    BEDROCK_MODEL_SYNTHESIS: process.env.BEDROCK_MODEL_SYNTHESIS,
    BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID,
    OPENAI_API_KEY_PRESENT: !!process.env.OPENAI_API_KEY,
  };

  return c.json({ envInfo, latestRuns, latestTasks, latestLogs });
});

/**
 * Administrative endpoint to directly test AWS Bedrock model invocations live from ECS.
 */
usersRouter.get('/admin/test-bedrock', async (c) => {
  const adminKey = c.req.header('x-admin-key') || c.req.query('key');
  const validSecret = process.env.BETTER_AUTH_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
  if (!adminKey || !validSecret || adminKey !== validSecret) {
    return c.json({ error: 'Forbidden: invalid admin key' }, 403);
  }

  const specificModel = c.req.query('model');
  const specificRegion = c.req.query('region') || 'us-east-1';

  const testModels = specificModel
    ? [{ id: specificModel, region: specificRegion }]
    : [
        { id: 'us.amazon.nova-pro-v1:0', region: 'us-east-1' },
        { id: 'us.amazon.nova-lite-v1:0', region: 'us-east-1' },
        { id: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0', region: 'us-east-1' },
        { id: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', region: 'us-east-1' },
        { id: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0', region: 'us-east-1' },
      ];

  const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
  const results: any[] = [];
  for (const m of testModels) {
    try {
      const client = new BedrockRuntimeClient({ region: m.region });
      const cmd = new ConverseCommand({
        modelId: m.id,
        messages: [{ role: 'user', content: [{ text: 'Ping. Say Pong.' }] }],
        inferenceConfig: { maxTokens: 20 },
      });
      const res = await client.send(cmd);
      const text = (res.output as any)?.message?.content?.[0]?.text;
      results.push({ model: m.id, region: m.region, status: 'ok', response: text });
    } catch (err: any) {
      results.push({
        model: m.id,
        region: m.region,
        status: 'error',
        name: err.name,
        message: err.message,
        code: err.$metadata?.httpStatusCode,
      });
    }
  }

  return c.json({ results });
});



