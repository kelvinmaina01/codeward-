import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { connectorRequests } from '../db/schema.js';
import { eq, ilike, sql } from 'drizzle-orm';
import { auth } from '../auth/index.js';
import { verifyEmailRealTime } from '../services/email-verifier.js';
import { validateBody, getValidatedBody } from '../middleware/zod-validator.js';

export const connectorRequestsRouter = new Hono();

const voteSchema = z.object({
  id: z.union([z.string(), z.number().transform(String)]),
});

const createRequestSchema = z.object({
  toolName: z.string().min(1, 'Tool name is required').max(100),
  useCase: z.string().min(1, 'Use case is required').max(1000),
  notifyEmail: z.string().email('Invalid email address'),
});

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
connectorRequestsRouter.post('/vote', validateBody(voteSchema), async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { id } = getValidatedBody<z.infer<typeof voteSchema>>(c);

  // Increment vote_count
  const [updated] = await db.update(connectorRequests)
    .set({ voteCount: sql`${connectorRequests.voteCount} + 1`, updatedAt: new Date() })
    .where(eq(connectorRequests.id, String(id)))
    .returning();

  return c.json({ success: true, request: updated });
});

// ─── CREATE NEW CONNECTOR REQUEST ────────────────────────────────────────
connectorRequestsRouter.post('/', validateBody(createRequestSchema), async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { toolName, useCase, notifyEmail } = getValidatedBody<z.infer<typeof createRequestSchema>>(c);

  // 1. Verify email using the real-time API
  const verification = await verifyEmailRealTime(notifyEmail);
  if (!verification.isValid) {
    return c.json({ error: verification.message }, 400);
  }

  // 2. Insert request
  const [newRequest] = await db.insert(connectorRequests).values({
    requestedBy: user.id,
    toolName,
    useCase,
    notifyEmail
  }).returning();

  return c.json({ success: true, request: newRequest });
});
