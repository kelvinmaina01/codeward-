import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import crypto from 'crypto';
import { webhookRouter } from './routes/webhooks.js';
import { auditQueue, auditWorker, pushQueue, pushWorker } from './queue/index.js';
import { db } from './db/index.js';
import { repositories, user } from './db/schema.js';
import { eq } from 'drizzle-orm';

const app = new Hono();
app.route('/webhooks', webhookRouter);

const secret = process.env.GITHUB_WEBHOOK_SECRET || 'dev-secret';

function signPayload(payload: string) {
  const hmac = crypto.createHmac('sha256', secret);
  return 'sha256=' + hmac.update(payload).digest('hex');
}

async function sendWebhook(event: string, payloadObj: any) {
  const payload = JSON.stringify(payloadObj);
  const signature = signPayload(payload);
  
  const res = await fetch('http://localhost:4567/webhooks/github', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-github-event': event,
      'x-hub-signature-256': signature
    },
    body: payload
  });
  
  const json = await res.json();
  console.log(`[Simulation] Response for ${event}:`, json);
}

// Start Server
const server = serve({
  fetch: app.fetch,
  port: 4567
}, async (info) => {
  console.log(`Server running at http://localhost:${info.port}`);

  // Create placeholder user so FK constraint passes
  const existingUser = await db.select().from(user).where(eq(user.id, 'placeholder'));
  if (existingUser.length === 0) {
    await db.insert(user).values({
      id: 'placeholder',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Clear DB record if it exists
  const testRepoName = 'codeward/test-repo';
  await db.delete(repositories).where(eq(repositories.fullName, testRepoName));

  console.log('=============================================');
  console.log('1. Simulating Mode 1 (Installation) - Audit Warmup');
  console.log('=============================================');
  
  await sendWebhook('installation_repositories', {
    action: 'added',
    installation: { id: 9999 },
    repositories_added: [
      {
        id: 12345,
        name: 'test-repo',
        full_name: testRepoName,
        default_branch: 'main'
      }
    ]
  });

  // Give it 2 seconds, then simulate a push while audit is still pending
  setTimeout(async () => {
    console.log('\n=============================================');
    console.log('2. Simulating Mode 2 (Push) while Audit is running');
    console.log('=============================================');
    
    await sendWebhook('push', {
      ref: 'refs/heads/main',
      after: 'a1b2c3d4e5f6g7h8i9j0',
      repository: {
        full_name: testRepoName
      }
    });

  }, 2000);

  // We wait for the workers to do their jobs.
  // auditWorker should take ~3 seconds to complete (let's mock it inside the worker or just wait for it to process).
  
  setTimeout(() => {
    console.log('Simulation complete. Press Ctrl+C to exit.');
  }, 10000);
});
