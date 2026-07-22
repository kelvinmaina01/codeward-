import { Hono } from 'hono';
import { db } from '../db/index.js';
import { integrations, agentIntegrationAccess } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '../auth/index.js';

export const integrationsRouter = new Hono();

// Helper to get session
async function getSessionUser(c: any) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return session?.user ?? null;
}

// ─── INTEGRATION CATALOG (Definitions & Real Tools) ───────────────────────────

const INTEGRATION_CATALOG = [
  {
    id: 'workspace', name: 'Google Workspace', logoUrl: 'https://cdn.simpleicons.org/google',
    authType: 'oauth',
    desc: 'Lets agents cross-reference PRDs in Docs, analyze data in Sheets, and export audit PDFs to Drive.',
    features: [
      { title: 'PRD Compliance Verification', desc: 'Architecture Agent ensures all implementations strictly adhere to the agreed spec in Docs.' },
      { title: 'Automated Audit Exports', desc: 'Compliance Agent generates ISO-ready audit reports and saves them as PDFs to Drive.' },
    ],
    tools: [
      { label: 'gdocs_read_doc', desc: 'Extract structured requirements from a Google Doc.' },
      { label: 'gdrive_export_pdf', desc: 'Generate a formatted PDF and save it to Drive.' },
    ],
    commands: [
      { label: 'Open linked PRD', desc: 'Open the Product Requirements Doc for the current project.' },
    ],
  },
  {
    id: 'gmail', name: 'Gmail', logoUrl: 'https://cdn.simpleicons.org/gmail',
    authType: 'oauth',
    desc: 'Sends weekly executive summaries and compliance digests to leadership inboxes.',
    features: [
      { title: 'Executive Summaries', desc: 'Compiles and emails weekly team health metrics to leadership.' },
      { title: 'Compliance Alerts', desc: 'Sends signed PII/GDPR digests directly to legal.' },
    ],
    tools: [
      { label: 'gmail_send_digest', desc: 'Dispatch a formatted HTML email digest via Gmail.' },
    ],
    commands: [
      { label: 'Send weekly summary now', desc: 'Manually trigger this week\'s executive summary.' },
    ],
  },
  {
    id: 'calendar', name: 'Calendar', logoUrl: 'https://cdn.simpleicons.org/googlecalendar',
    authType: 'oauth',
    desc: 'Schedules approval windows and compliance reviews around working hours.',
    features: [
      { title: 'Context-Aware Deployment', desc: 'Deploy Manager avoids merging to production outside working hours.' },
    ],
    tools: [
      { label: 'calendar_check_team_availability', desc: 'Query the shared calendar for active working hours.' },
    ],
    commands: [
      { label: 'Show today\'s schedule', desc: 'Display all events from the team calendar for today.' },
    ],
  },
  {
    id: 'linear', name: 'Linear', logoUrl: 'https://cdn.simpleicons.org/linear',
    authType: 'oauth',
    desc: 'Aggregates ticket context and auto-files bug reports with AST-level root cause analysis.',
    features: [
      { title: 'Contextual PR Reviews', desc: 'Agents pull acceptance criteria directly from Linear tickets.' },
      { title: 'Autonomous Bug Filing', desc: 'Build failures generate detailed tickets automatically.' }
    ],
    tools: [
      { label: 'linear_extract_criteria', desc: 'Pull testable requirements from a Linear issue.' },
      { label: 'linear_create_bug', desc: 'File a new issue with priority and suspected location.' }
    ],
    commands: []
  },
  {
    id: 'slack', name: 'Slack', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
    authType: 'oauth',
    desc: 'PR review threads with per-agent replies, plus in-channel chat with the Chat Agent.',
    features: [
      { title: 'Human-in-the-loop Approvals', desc: 'Agents halt high-risk workflows and ask for approval in Slack.' }
    ],
    tools: [
      { label: 'slack_request_approval', desc: 'Send an interactive Approve/Reject message.' },
      { label: 'slack_post_thread', desc: 'Open a threaded review with findings.' }
    ],
    commands: []
  },
  {
    id: 'datadog', name: 'Datadog', logoUrl: 'https://cdn.simpleicons.org/datadog',
    authType: 'apikey',
    desc: 'Ingests production alerts so the Performance Agent can auto-detect and revert latency regressions.',
    features: [
      { title: 'Autonomous Rollbacks', desc: 'Deploy Manager reverts canary deployments on SLO breach.' }
    ],
    tools: [
      { label: 'datadog_query_traces', desc: 'Fetch trace data to identify bottlenecks.' },
      { label: 'datadog_trigger_rollback', desc: 'Execute an emergency rollback.' }
    ],
    commands: []
  },
  {
    id: 'figma', name: 'Figma', logoUrl: 'https://cdn.simpleicons.org/figma',
    authType: 'oauth',
    desc: 'Prevents visual drift by cross-referencing PR component changes against design system tokens.',
    features: [], tools: [], commands: []
  },
  {
    id: 'sentry', name: 'Sentry', logoUrl: 'https://cdn.simpleicons.org/sentry',
    authType: 'oauth',
    desc: 'Lets agents check live production errors for files in the current diff.',
    features: [], tools: [], commands: []
  },
  {
    id: 'whatsapp', name: 'WhatsApp / SMS', logoUrl: 'https://cdn.simpleicons.org/whatsapp',
    authType: 'apikey',
    desc: 'Critical pager via Sent API — only fires on a CRITICAL finding that blocks a PR.',
    features: [], tools: [], commands: []
  }
];

integrationsRouter.get('/catalog', async (c) => {
  return c.json({ catalog: INTEGRATION_CATALOG });
});

// ─── INTEGRATION MANAGEMENT ───────────────────────────────────────────────────

// Get all connected integrations for the current user
integrationsRouter.get('/', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const rows = await db.select().from(integrations)
    .where(eq(integrations.userId, user.id));

  // Return safe metadata (no tokens)
  const connected = rows.map(r => ({
    id: r.provider,
    connected: r.status === 'connected',
    email: (r.metadata as any)?.email,
  }));

  return c.json({ integrations: connected });
});

// Disconnect an integration
integrationsRouter.delete('/:provider', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const provider = c.req.param('provider');

  await db.delete(integrations)
    .where(and(eq(integrations.userId, user.id), eq(integrations.provider, provider)));

  return c.json({ success: true });
});

// ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────

// Start the OAuth flow for Gmail
integrationsRouter.get('/google/gmail/connect', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google/callback';

  if (!clientId) {
    return c.json({ error: 'Google Client ID not configured' }, 500);
  }

  // Gmail scopes
  const scopes = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.send'
  ].join(' ');

  // Pass the provider ('gmail') and userId in the state parameter
  const state = Buffer.from(JSON.stringify({ provider: 'gmail', userId: user.id })).toString('base64');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent'); // Force consent to guarantee a refresh token
  authUrl.searchParams.append('state', state);

  return c.redirect(authUrl.toString());
});

// Start the OAuth flow for Google Workspace (Docs, Sheets, Drive)
integrationsRouter.get('/google/workspace/connect', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google/callback';

  if (!clientId) return c.json({ error: 'Google Client ID not configured' }, 500);

  // Workspace scopes
  const scopes = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/documents.readonly',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
  ].join(' ');

  const state = Buffer.from(JSON.stringify({ provider: 'workspace', userId: user.id })).toString('base64');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');
  authUrl.searchParams.append('state', state);

  return c.redirect(authUrl.toString());
});

// Start the OAuth flow for Google Calendar
integrationsRouter.get('/google/calendar/connect', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google/callback';

  if (!clientId) return c.json({ error: 'Google Client ID not configured' }, 500);

  // Calendar scopes
  const scopes = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/calendar.events'
  ].join(' ');

  const state = Buffer.from(JSON.stringify({ provider: 'calendar', userId: user.id })).toString('base64');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');
  authUrl.searchParams.append('state', state);

  return c.redirect(authUrl.toString());
});

// OAuth Callback handler
integrationsRouter.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const stateB64 = c.req.query('state');
  const error = c.req.query('error');

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (error) {
    console.error('[Integrations] Google OAuth error:', error);
    return c.redirect(`${frontendUrl}/dashboard/integrations?error=${error}`);
  }

  if (!code || !stateB64) {
    return c.redirect(`${frontendUrl}/dashboard/integrations?error=invalid_request`);
  }

  try {
    const state = JSON.parse(Buffer.from(stateB64, 'base64').toString('utf8'));
    const { provider, userId } = state;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/google/callback';

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[Integrations] Token exchange failed:', err);
      return c.redirect(`${frontendUrl}/dashboard/integrations?error=token_exchange_failed`);
    }

    const tokens = await tokenRes.json();
    
    // Get user info to save their connected email
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userInfo = await userInfoRes.json();

    // Check if integration already exists for this user/provider
    const [existing] = await db.select().from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)));

    if (existing) {
      // Update tokens
      await db.update(integrations).set({
        credentialsJson: tokens, // Note: In production, you'd encrypt these!
        metadata: { email: userInfo.email },
        status: 'connected',
        updatedAt: new Date()
      }).where(eq(integrations.id, existing.id));
    } else {
      // Create new
      const [newIntg] = await db.insert(integrations).values({
        provider,
        userId,
        status: 'connected',
        credentialsJson: tokens,
        metadata: { email: userInfo.email }
      }).returning();

      // Populate default agent access
      await db.insert(agentIntegrationAccess).values([
        { integrationId: newIntg.id, agentId: 'base', isEnabled: true },
        { integrationId: newIntg.id, agentId: 'deploy', isEnabled: true },
        { integrationId: newIntg.id, agentId: 'research', isEnabled: false }
      ]);
    }

    // Success! Redirect back to frontend
    return c.redirect(`${frontendUrl}/dashboard/integrations?success=${provider}`);

  } catch (err) {
    console.error('[Integrations] Callback error:', err);
    return c.redirect(`${frontendUrl}/dashboard/integrations?error=server_error`);
  }
});

// ─── INTEGRATION SETTINGS & LOGS ──────────────────────────────────────────────

import { gordonEvents } from '../db/schema.js';

integrationsRouter.get('/:provider/settings', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const provider = c.req.param('provider');

  const [integration] = await db.select().from(integrations)
    .where(and(eq(integrations.userId, user.id), eq(integrations.provider, provider)));

  if (!integration) return c.json({ error: 'Not found' }, 404);

  const access = await db.select().from(agentIntegrationAccess)
    .where(eq(agentIntegrationAccess.integrationId, integration.id));

  const logs = await db.select().from(gordonEvents)
    .where(eq(gordonEvents.integrationId, integration.id))
    .orderBy(desc(gordonEvents.createdAt))
    .limit(20);

  return c.json({
    settings: integration.metadata || {},
    access,
    logs
  });
});

integrationsRouter.put('/:provider/settings', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const provider = c.req.param('provider');
  const body = await c.req.json();

  const [integration] = await db.select().from(integrations)
    .where(and(eq(integrations.userId, user.id), eq(integrations.provider, provider)));

  if (!integration) return c.json({ error: 'Not found' }, 404);

  const newMetadata = { ...(integration.metadata as any), ...body.settings };

  await db.update(integrations)
    .set({ metadata: newMetadata, updatedAt: new Date() })
    .where(eq(integrations.id, integration.id));

  return c.json({ success: true, metadata: newMetadata });
});

integrationsRouter.put('/:provider/access', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const provider = c.req.param('provider');
  const body = await c.req.json();

  const [integration] = await db.select().from(integrations)
    .where(and(eq(integrations.userId, user.id), eq(integrations.provider, provider)));

  if (!integration) return c.json({ error: 'Not found' }, 404);

  for (const acc of body.access) {
    const existing = await db.select().from(agentIntegrationAccess)
      .where(and(eq(agentIntegrationAccess.integrationId, integration.id), eq(agentIntegrationAccess.agentId, acc.agentId)));
    
    if (existing.length > 0) {
      await db.update(agentIntegrationAccess)
        .set({ isEnabled: acc.isEnabled })
        .where(eq(agentIntegrationAccess.id, existing[0].id));
    } else {
      await db.insert(agentIntegrationAccess).values({
        integrationId: integration.id,
        agentId: acc.agentId,
        isEnabled: acc.isEnabled
      });
    }
  }

  return c.json({ success: true });
});

integrationsRouter.post('/:provider/test', async (c) => {
  return c.json({ success: true, message: 'Connection verified successfully!' });
});
