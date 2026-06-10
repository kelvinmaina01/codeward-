import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { webhookRouter } from './routes/webhooks.js';

const app = new Hono();

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'codeward-api' });
});

// Mount webhooks router
app.route('/api/webhooks', webhookRouter);

const port = 3001;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
