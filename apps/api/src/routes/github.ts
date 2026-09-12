import { Hono } from 'hono';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { auth } from '../auth/index.js';
import { githubApp } from '../github/client.js';

export const githubRouter = new Hono();

/**
 * GET /api/github/install
 * Callback from GitHub App installation
 */
githubRouter.get('/install', async (c) => {
  const installationIdStr = c.req.query('installation_id');
  const setupAction = c.req.query('setup_action'); // 'install' or 'update'

  if (!installationIdStr) {
    return c.json({ error: 'Missing installation_id' }, 400);
  }

  const installationId = parseInt(installationIdStr, 10);
  console.log(`[GitHub App] Installed/Updated with ID: ${installationId}, action: ${setupAction}`);
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  let targetLogin = '';

  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    
    // Fetch installation details directly from GitHub App API
    const { data: inst } = await githubApp.octokit.request('GET /app/installations/{installation_id}', {
      installation_id: installationId,
    });

    const account = inst?.account as any;
    targetLogin = account?.login || account?.slug || '';
    const accountType = account?.type || '';

    if (targetLogin && accountType === 'Organization') {
      const existing = await db.select().from(schema.organization).where(eq(schema.organization.githubLogin, targetLogin));
      let orgRecord = existing[0];
      if (!orgRecord) {
        const [inserted] = await db.insert(schema.organization).values({
          githubLogin: targetLogin,
          planType: 'free',
        }).returning();
        orgRecord = inserted;
      }

      if (session?.user?.id && orgRecord) {
        const existingMember = await db.select().from(schema.organizationMember).where(
          and(eq(schema.organizationMember.orgId, orgRecord.id), eq(schema.organizationMember.userId, session.user.id))
        );
        if (existingMember.length === 0) {
          await db.insert(schema.organizationMember).values({
            orgId: orgRecord.id,
            userId: session.user.id,
            role: 'admin',
          });
        }
      }
    }
  } catch (err: any) {
    console.warn('[GitHub App] Could not enrich installation redirect:', err?.message);
  }

  // Redirect to connect page so user can immediately select repositories for their new installation
  return c.redirect(`${frontendUrl}/connect?installation=success${targetLogin ? `&installed=${encodeURIComponent(targetLogin)}` : ''}`);
});
