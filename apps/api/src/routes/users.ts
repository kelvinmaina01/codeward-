import { Hono } from 'hono';
import { db } from '../db/index.js';
import { repositories, chatSessions, workspace, user, accountDeletions, organization, organizationMember } from '../db/schema.js';
import { eq } from 'drizzle-orm';
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
 */
usersRouter.get('/me/billing-info', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const [membership] = await db
      .select({
        orgId: organization.id,
        planType: organization.planType,
        prQuotaLimit: organization.prQuotaLimit,
        trialPrsUsed: organization.trialPrsUsed,
        trialPrLimit: organization.trialPrLimit,
        polarCustomerId: organization.polarCustomerId,
        polarSubscriptionId: organization.polarSubscriptionId,
      })
      .from(organizationMember)
      .innerJoin(organization, eq(organizationMember.orgId, organization.id))
      .where(eq(organizationMember.userId, session.user.id))
      .limit(1);

    return c.json({
      success: true,
      plan: membership?.planType || 'free',
      trialPrsUsed: membership?.trialPrsUsed ?? 0,
      trialPrLimit: membership?.trialPrLimit ?? appConfig.billing.trialPrLimit,
      prQuotaLimit: membership?.prQuotaLimit ?? appConfig.billing.proPrLimit,
      hasSubscription: Boolean(membership?.polarSubscriptionId),
      polarCustomerId: membership?.polarCustomerId || null,
    });
  } catch (err: any) {
    console.error('[Billing Info] Error fetching billing info:', err);
    return c.json({ error: 'Failed to fetch billing info' }, 500);
  }
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

