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
    if (!origin) return process.env.FRONTEND_URL || 'https://codeward-frontend-production.up.railway.app';
    return allowedOrigins.includes(origin) ? origin : null;
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

// Better Auth handler
app.on(['POST', 'GET', 'OPTIONS'], '/api/auth/*', async (c) => {
  const res = await auth.handler(c.req.raw);
  // Reconstruct the response to make headers mutable so Hono's cors middleware can append to them
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: new Headers(res.headers)
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
