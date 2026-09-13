import './instrument.js';
import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { webhookRouter } from './routes/webhooks.js';
import { reposRouter } from './routes/repos.js';
import { prRouter } from './routes/pr.js';
import { auth } from './auth/index.js';
import { leadsRouter } from './routes/leads.js';
import { NativeOpenAIProvider } from './providers/openai.provider.js';

// Validate AI provider configuration at startup so missing keys fail loudly and early
NativeOpenAIProvider.validateConfiguration();

// NOTE: agentWorker is started dynamically AFTER the HTTP server is up.
// This ensures a Redis/BullMQ failure at startup cannot crash the server.

const app = new Hono();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

const corsConfig = {
  origin: (origin: string | undefined) => {
    // Unconditionally reflect the incoming origin back to satisfy credentials: true dynamically
    // If undefined (e.g., server-side fetch), fallback to process.env.FRONTEND_URL
    return origin || process.env.FRONTEND_URL || 'http://localhost:5173';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  // Gordon's chat stream returns the (possibly lazily-created) session id in this header so
  // the client can adopt it after the first send.
  exposeHeaders: ['X-Chat-Session-Id'],
  credentials: true,
  maxAge: 600,
};

// Apply CORS globally. It will intercept OPTIONS requests with 204.
app.use('*', cors(corsConfig));

// ─── Global error handler ─────────────────────────────────────────────────────
// Catches any unhandled error thrown inside a route handler and returns a
// clean, structured JSON response instead of crashing or sending a bare 500.
app.onError((err, c) => {
  const timestamp = new Date().toISOString();
  console.error(`\n[${timestamp}] 🚨 ROUTE ERROR on ${c.req.method} ${c.req.path}`);
  console.error(`  Name:    ${err.name}`);
  console.error(`  Message: ${err.message}`);
  console.error(`  Stack:\n${err.stack}`);

  Sentry.captureException(err);

  return c.json({
    error: 'Internal Server Error',
    message: 'Something went wrong. Our team has been notified.',
    timestamp,
    path: c.req.path,
  }, 500);
});


app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'codeward-api' });
});

app.get('/', (c) => c.text('Codeward API Running!'));

app.get('/api/sentinel/status', async (c) => {
  const { BudgetService } = await import('./services/budget.service.js');
  const status = await BudgetService.getSentinelStatus();
  return c.json(status);
});

app.route('/api/leads', leadsRouter);

// Better Auth handler — must manually inject CORS headers because
// constructing a new Response() discards what Hono's cors middleware wrote.
app.on(['POST', 'GET', 'OPTIONS'], '/api/auth/*', async (c) => {
  const origin = c.req.header('Origin') || '';
  const defaultFrontend = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Respond to OPTIONS preflight immediately with CORS headers — don't even
  // bother calling better-auth for a preflight; it doesn't need to.
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || defaultFrontend,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '600',
      }
    });
  }

  try {
    const res = await auth.handler(c.req.raw);

    // Rebuild the response with mutable headers and always inject CORS headers.
    const headers = new Headers(res.headers);
    headers.set('Access-Control-Allow-Origin', origin || defaultFrontend);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Vary', 'Origin');

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  } catch (authErr: any) {
    console.error(`[Auth] Handler error on ${c.req.method} ${c.req.path}:`, authErr);
    return new Response(JSON.stringify({
      error: 'Authentication Error',
      message: authErr?.message || 'Failed to process authentication request.'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || defaultFrontend,
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin',
      }
    });
  }
});


import { statsRouter } from './routes/stats.js';
import { wsRouter, setupWs } from './routes/ws.js';
import { createNodeWebSocket } from '@hono/node-ws';

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
setupWs(upgradeWebSocket);

import { githubRouter } from './routes/github.js';
import { chatRouter } from './routes/chat.js';
import { reportsRouter } from './routes/reports.js';
import { approvalsRouter } from './routes/approvals.js';
import { alertsRouter } from './routes/alerts.js';
import { issuesPrsRouter } from './routes/issues-prs.js';
import { integrationsRouter } from './routes/integrations.js';
import { connectorRequestsRouter } from './routes/connector-requests.js';
import { mcpRouter } from './routes/mcp.js';
import { newsletterRouter } from './routes/newsletter.js';
import { workspacesRouter } from './routes/workspaces.js';
import { usersRouter } from './routes/users.js';
import { billingRouter } from './routes/billing.js';

const routes = app
  .route('/api/webhooks', webhookRouter)
  .route('/api/repos', reposRouter)
  .route('/api/repos', prRouter)
  .route('/api/stats', statsRouter)
  .route('/api/github', githubRouter)
  .route('/api/chat', chatRouter)
  .route('/api/reports', reportsRouter)
  .route('/api/approvals', approvalsRouter)
  .route('/api/alerts', alertsRouter)
  .route('/api/issues-prs', issuesPrsRouter)
  .route('/api/integrations', integrationsRouter)
  .route('/api/connector-requests', connectorRequestsRouter)
  .route('/api/mcp', mcpRouter)
  .route('/api/newsletter', newsletterRouter)
  .route('/api/workspaces', workspacesRouter)
  .route('/api/users', usersRouter)
  .route('/api/billing', billingRouter)
  .route('/ws', wsRouter);

export type AppType = typeof routes;

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
console.log(`Server is running on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port
});

injectWebSocket(server);

// ─── Worker process initialization ───────────────────────────────────────────
// In production, workers run as a dedicated, horizontally scalable service ('src/worker.ts').
// For local development convenience, RUN_WORKER_INLINE defaults to true in non-production.
const shouldRunWorkerInline = process.env.RUN_WORKER_INLINE === 'true' || 
  (process.env.NODE_ENV !== 'production' && process.env.RUN_WORKER_INLINE !== 'false');

if (shouldRunWorkerInline) {
  (async () => {
    try {
      const { startAgentWorker } = await import('./agents/queue/agent.queue.js');
      startAgentWorker();
      console.log(`[AgentSystem] ✅ Agent worker started inline — listening for agent-jobs`);

      const { startEscalationWorker } = await import('./agents/escalation/escalation.queue.js');
      startEscalationWorker();
      console.log(`[AgentSystem] ✅ Escalation worker started inline — listening for escalation-jobs`);

      const { startMergeWorker } = await import('./agents/merge/merge.queue.js');
      startMergeWorker();
      console.log(`[AgentSystem] ✅ Merge worker started inline — listening for merge-jobs`);
    } catch (err) {
      console.error(`[AgentSystem] ⚠️ Worker failed to start inline (Redis may be unavailable):`);
      console.error(err instanceof Error ? err.stack : String(err));
      console.log(`[AgentSystem] HTTP server remains running — queue features disabled.`);
    }
  })();
} else {
  console.log(`[AgentSystem] Standalone worker mode active. Workers decoupled from HTTP server (RUN_WORKER_INLINE=false).`);
}


// ─── Process-level crash guards ───────────────────────────────────────────────
// Prevents the entire server from dying on a single unhandled error.
// Devs get a full, timestamped stack trace; the process stays alive.

process.on('uncaughtException', (err: Error) => {
  console.error(`\n[${new Date().toISOString()}] 💥 UNCAUGHT EXCEPTION — server will NOT crash`);
  console.error(`  Name:    ${err.name}`);
  console.error(`  Message: ${err.message}`);
  console.error(`  Stack:\n${err.stack}`);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error(`\n[${new Date().toISOString()}] 🔥 UNHANDLED PROMISE REJECTION — server will NOT crash`);
  console.error(`  Promise: ${String(promise)}`);
  console.error(`  Reason:  ${reason instanceof Error ? reason.stack : String(reason)}`);
});

process.on('SIGTERM', () => {
  console.log(`\n[${new Date().toISOString()}] 🛑 SIGTERM received — graceful shutdown initiated`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] ✅ HTTP server closed. Exiting.`);
    process.exit(0);
  });
});
