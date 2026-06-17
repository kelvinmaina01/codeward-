import { Hono } from 'hono';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

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
  
  // Here, the GitHub App has been installed.
  // In a full implementation, we could fetch the repos and sync them to DB right now,
  // or we can wait until the user connects them in the UI (since our /api/repos fetches them live).
  // The ConnectRepo UI already does the synchronization.
  
  // Redirect back to the frontend dashboard or connect page
  return c.redirect('http://localhost:5173/dashboard?installation=success');
});
