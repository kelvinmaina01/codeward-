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
  // The ConnectRepo UI synchronizes installations dynamically,
  // so we just redirect them back. The actual repos are connected
  // when the user selects them via POST /api/repos/connect.
  
  // Note: we could fetch auth.api.getSession(c) here and explicitly 
  // track the installation_id if needed. For now, the UI fetches it 
  // securely via the user/installations GitHub endpoint.
  
  // Redirect back to the frontend dashboard or connect page
  return c.redirect('http://localhost:5173/dashboard?installation=success');
});
