import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { webhookRouter } from './routes/webhooks.js';
import { reposRouter } from './routes/repos.js';
import { prRouter } from './routes/pr.js';
import { auth } from './auth/index.js';

// Agent System — model-agnostic orchestration
import { agentWorker } from './agents/queue/agent.queue.js';

const app = new Hono();

const allowedOrigins = [
  'http://localhost:5173',
  'https://codeward-frontend-production.up.railway.app',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

const corsConfig = {
  origin: (origin: string | undefined) => {
    // Unconditionally reflect the origin back to satisfy credentials: true dynamically
    // If undefined (e.g., server-side fetch), fallback to the production URL
    return origin || process.env.FRONTEND_URL || 'https://codeward-frontend-production.up.railway.app';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600,
};

// Apply CORS globally. It will intercept OPTIONS requests with 204.
app.use('*', cors(corsConfig));

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'codeward-api' });
});

app.get('/', (c) => c.text('Codeward API Running!'));

// Better Auth handler — must manually inject CORS headers because
// constructing a new Response() discards what Hono's cors middleware wrote.
app.on(['POST', 'GET', 'OPTIONS'], '/api/auth/*', async (c) => {
  const origin = c.req.header('Origin') || '';

  // Respond to OPTIONS preflight immediately with CORS headers — don't even
  // bother calling better-auth for a preflight; it doesn't need to.
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || 'https://codeward-frontend-production.up.railway.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '600',
      }
    });
  }

  const res = await auth.handler(c.req.raw);

  // Rebuild the response with mutable headers and always inject CORS headers.
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', origin || 'https://codeward-frontend-production.up.railway.app');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Vary', 'Origin');

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
});


import { statsRouter } from './routes/stats.js';
import { wsRouter, setupWs } from './routes/ws.js';
import { createNodeWebSocket } from '@hono/node-ws';

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
setupWs(upgradeWebSocket);

import { githubRouter } from './routes/github.js';
import { chatRouter } from './routes/chat.js';

const routes = app
  .route('/api/webhooks', webhookRouter)
  .route('/api/repos', reposRouter)
  .route('/api/repos', prRouter)
  .route('/api/stats', statsRouter)
  .route('/api/github', githubRouter)
  .route('/api/chat', chatRouter)
  .route('/ws', wsRouter);

export type AppType = typeof routes;

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
console.log(`Server is running on port ${port}`);

const server = serve({
  fetch: app.fetch,
  port
});

injectWebSocket(server);

console.log(`[AgentSystem] Worker ready — listening for agent-jobs on BullMQ`);
