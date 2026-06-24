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
    return origin || 'http://localhost:5173';
  },
  allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-client-name', 'x-client-version'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  maxAge: 600,
};

// General CORS for other API routes. For /api/auth, let Hono handle OPTIONS (preflight)
// to fix CORS issues, but skip for GET/POST to avoid duplicate headers from better-auth.
app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/api/auth') && c.req.method !== 'OPTIONS') {
    return next();
  }
  return cors(corsConfig)(c, next);
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'codeward-api' });
});

app.get('/', (c) => c.text('Codeward API Running!'));

// Better Auth handler — use app.on() with explicit methods per docs
app.on(['POST', 'GET', 'OPTIONS'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
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
