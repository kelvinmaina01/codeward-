import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { PolarService } from '../services/polar.service.js';
import { db } from '../db/index.js';
import { organization, organizationMember } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { appConfig } from '../config/app.config.js';

export const billingRouter = new Hono();

/**
 * GET /api/billing/portal
 * Returns the authenticated Polar Customer Portal session URL as JSON.
 * Called by frontend when the user clicks 'Manage Plan' / 'Manage Billing'.
 */
billingRouter.get('/portal', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: 'Unauthorized', message: 'You must be logged in to access billing.' }, 401);
  }

  try {
    const portalUrl = await PolarService.getCustomerPortalUrl({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });

    // Best-effort cache of the Polar customer ID to the user's organization in DB
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
      console.warn('[Billing] Non-fatal error persisting polarCustomerId:', dbErr);
    }

    return c.json({
      success: true,
      url: portalUrl,
    });
  } catch (err: any) {
    console.error('[Billing] Failed to create customer portal session:', err);
    return c.json({
      error: 'Failed to create billing portal session',
      message: err?.message || 'Polar service error',
    }, 500);
  }
});

/**
 * POST /api/billing/portal
 * Alias for POST callers requesting a customer portal session.
 */
billingRouter.post('/portal', async (c) => {
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

    return c.json({
      success: true,
      url: portalUrl,
    });
  } catch (err: any) {
    console.error('[Billing] POST portal failed:', err);
    return c.json({
      error: 'Failed to create billing portal session',
      message: err?.message || 'Polar service error',
    }, 500);
  }
});

/**
 * GET /api/billing/info
 * Returns the current plan, limits, and subscription status for the active user's workspace.
 */
billingRouter.get('/info', async (c) => {
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
        currentPeriodStart: organization.currentPeriodStart,
        currentPeriodEnd: organization.currentPeriodEnd,
      })
      .from(organizationMember)
      .innerJoin(organization, eq(organizationMember.orgId, organization.id))
      .where(eq(organizationMember.userId, session.user.id))
      .limit(1);

    const plan = membership?.planType || 'free';
    const isPro = plan === 'pro';
    const isTeam = plan === 'team';

    return c.json({
      success: true,
      plan,
      isPro,
      isTeam,
      trialPrsUsed: membership?.trialPrsUsed ?? 0,
      trialPrLimit: membership?.trialPrLimit ?? appConfig.billing.trialPrLimit,
      prQuotaLimit: membership?.prQuotaLimit ?? appConfig.billing.trialPrLimit,
      hasActiveSubscription: Boolean(membership?.polarSubscriptionId),
      currentPeriodEnd: membership?.currentPeriodEnd ?? null,
    });
  } catch (err: any) {
    console.error('[Billing] Error fetching billing info:', err);
    return c.json({ error: 'Failed to fetch billing info', message: err?.message }, 500);
  }
});

/**
 * GET /api/billing/checkout
 * Generates an authenticated checkout link for either 'pro' or 'team' plan.
 */
billingRouter.get('/checkout', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const tier = c.req.query('tier') === 'team' ? 'team' : 'pro';

  try {
    const checkoutUrl = await PolarService.createCheckoutSession({
      tier,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name,
      successUrl: `${appConfig.app.frontendUrl}/dashboard/settings?tab=billing&checkout=success`,
    });

    return c.json({
      success: true,
      tier,
      url: checkoutUrl,
    });
  } catch (err: any) {
    console.error('[Billing] Checkout session generation failed:', err);
    return c.json({ error: 'Failed to generate checkout URL', message: err?.message }, 500);
  }
});
