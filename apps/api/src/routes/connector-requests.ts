import { Hono } from 'hono';
import { db } from '../db/index.js';
import { connectorRequests } from '../db/schema.js';
import { eq, ilike, sql } from 'drizzle-orm';
import { auth } from '../auth/index.js';
import { verifyEmailRealTime } from '../services/email-verifier.js';

export const connectorRequestsRouter = new Hono();

async function getSessionUser(c: any) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return session?.user ?? null;
}

// ─── SEARCH CONNECTOR REQUESTS ───────────────────────────────────────────
connectorRequestsRouter.get('/search', async (c) => {
  const q = c.req.query('q');
  if (!q) return c.json({ results: [] });

  // Use ILIKE for case-insensitive matching
  const results = await db.select().from(connectorRequests)
    .where(ilike(connectorRequests.toolName, `%${q}%`))
    .limit(5);

  return c.json({ results });
});

// ─── VOTE FOR CONNECTOR REQUEST ──────────────────────────────────────────
connectorRequestsRouter.post('/vote', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  const { id } = await c.req.json();
  if (!id) return c.json({ error: 'Missing request ID' }, 400);

  // Increment vote_count
  const [updated] = await db.update(connectorRequests)
    .set({ voteCount: sql`${connectorRequests.voteCount} + 1`, updatedAt: new Date() })
    .where(eq(connectorRequests.id, id))
    .returning();

  return c.json({ success: true, request: updated });
});

// ─── CREATE NEW CONNECTOR REQUEST ────────────────────────────────────────
connectorRequestsRouter.post('/', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { toolName, useCase, notifyEmail } = await c.req.json();
  
  if (!toolName || !useCase || !notifyEmail) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  // 1. Verify email using the real-time API
  const verification = await verifyEmailRealTime(notifyEmail);
  if (!verification.isValid) {
    return c.json({ error: verification.message }, 400);
  }

  // 2. Insert request
  // (We could fetch the orgId from the user, but for now we can leave it null or map it if known)
  const [newRequest] = await db.insert(connectorRequests).values({
    requestedBy: user.id,
    toolName,
    useCase,
    notifyEmail
  }).returning();

  return c.json({ success: true, request: newRequest });
});
