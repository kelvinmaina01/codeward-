import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { webhookRouter } from './routes/webhooks.js';
import { reposRouter } from './routes/repos.js';
import { auth } from './auth/index.js';

const app = new Hono();

// CORS for Better Auth routes (must be registered BEFORE the auth handler)
// See: https://www.better-auth.com/docs/integrations/hono#cors
app.use(
  '/api/auth/*',
  cors({
    origin: 'http://localhost:5173',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  }),
);

// General CORS for other API routes
app.use('*', cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'codeward-api' });
});

app.get('/', (c) => c.text('Codeward API Running!'));

// Better Auth handler — use app.on() with explicit methods per docs
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

// Mount webhooks router
app.route('/api/webhooks', webhookRouter);

// Mount repos router
app.route('/api/repos', reposRouter);

const port = 3001;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
