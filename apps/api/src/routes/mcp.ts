/**
 * MCP Servers API routes
 *
 * POST /api/mcp/postgres/test    — Test a Postgres connection (no save)
 * POST /api/mcp/postgres/save    — Validate, then encrypt & persist credentials
 * GET  /api/mcp/postgres/:id     — Fetch a saved Postgres server (no plaintext creds)
 * POST /api/mcp/redis/test       — Test a Redis connection (no save)
 * POST /api/mcp/redis/save       — Validate, then encrypt & persist credentials
 * GET  /api/mcp/redis/:id        — Fetch a saved Redis server (no plaintext creds)
 * GET  /api/mcp                  — List all MCP servers for the authenticated user
 * DELETE /api/mcp/:id            — Remove an MCP server
 * PATCH /api/mcp/:id/agents      — Update agent access map
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { mcpServers } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { auth } from '../auth/index.js';
import { encryptCredentials, decryptCredentials } from '../lib/credential-crypto.js';
import { pg_test_connection, type PostgresCredentials } from '../mcp-servers/postgres.js';
import { redis_test_connection, type RedisCredentials } from '../mcp-servers/redis.js';
import { validateBody, getValidatedBody } from '../middleware/zod-validator.js';

export const mcpRouter = new Hono();

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const postgresTestSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]).default(5432),
  database: z.string().min(1, 'Database is required'),
  user: z.string().min(1, 'User is required'),
  password: z.string().min(1, 'Password is required'),
  sslMode: z.enum(['disable', 'prefer', 'require']).default('require'),
});

const postgresSaveSchema = postgresTestSchema.extend({
  displayName: z.string().min(1, 'Display name is required').max(100),
});

const redisTestSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]).default(6379),
  password: z.string().optional(),
  db: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]).default(0),
  tls: z.boolean().default(false),
});

const redisSaveSchema = redisTestSchema.extend({
  displayName: z.string().min(1, 'Display name is required').max(100),
});

const agentAccessSchema = z.object({
  agentAccess: z.record(z.string(), z.boolean()),
});

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getSessionUser(c: any) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return session?.user ?? null;
}

// ─── Shared: list all MCP servers for the calling user ────────────────────────

mcpRouter.get('/', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // BOLA Fix: Strictly filter by createdBy = user.id
  const rows = await db.select({
    id: mcpServers.id,
    provider: mcpServers.provider,
    displayName: mcpServers.displayName,
    status: mcpServers.status,
    agentAccess: mcpServers.agentAccess,
    config: mcpServers.config,
    createdAt: mcpServers.createdAt,
    updatedAt: mcpServers.updatedAt,
    // Never return encryptedCredentials to the client
  })
    .from(mcpServers)
    .where(eq(mcpServers.createdBy, user.id));

  return c.json({ servers: rows });
});

// ─── Delete an MCP server ─────────────────────────────────────────────────────

mcpRouter.delete('/:id', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { id } = c.req.param();

  // BOLA Fix: Verify resource belongs to calling user
  const [existing] = await db.select().from(mcpServers).where(
    and(eq(mcpServers.id, id), eq(mcpServers.createdBy, user.id))
  );

  if (!existing) {
    return c.json({ error: 'Server not found or forbidden' }, 404);
  }

  await db.delete(mcpServers).where(
    and(eq(mcpServers.id, id), eq(mcpServers.createdBy, user.id))
  );

  return c.json({ success: true });
});

// ─── Update agent access map ──────────────────────────────────────────────────

mcpRouter.patch('/:id/agents', validateBody(agentAccessSchema), async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { id } = c.req.param();
  const body = getValidatedBody<z.infer<typeof agentAccessSchema>>(c);

  // BOLA Fix: Verify resource belongs to calling user
  const [existing] = await db.select().from(mcpServers).where(
    and(eq(mcpServers.id, id), eq(mcpServers.createdBy, user.id))
  );

  if (!existing) {
    return c.json({ error: 'Server not found or forbidden' }, 404);
  }

  const [updated] = await db.update(mcpServers)
    .set({ agentAccess: body.agentAccess, updatedAt: new Date() })
    .where(and(eq(mcpServers.id, id), eq(mcpServers.createdBy, user.id)))
    .returning();

  return c.json({ success: true, server: updated });
});

// ─── PostgreSQL ───────────────────────────────────────────────────────────────

mcpRouter.post('/postgres/test', validateBody(postgresTestSchema), async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = getValidatedBody<z.infer<typeof postgresTestSchema>>(c);
  const creds: PostgresCredentials = {
    host: body.host,
    port: body.port,
    database: body.database,
    user: body.user,
    password: body.password,
    sslMode: body.sslMode,
  };

  try {
    const result = await pg_test_connection(creds);
    return c.json({ success: true, ...result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

mcpRouter.post('/postgres/save', validateBody(postgresSaveSchema), async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = getValidatedBody<z.infer<typeof postgresSaveSchema>>(c);
  const creds: PostgresCredentials = {
    host: body.host,
    port: body.port,
    database: body.database,
    user: body.user,
    password: body.password,
    sslMode: body.sslMode,
  };

  // 1. Validate the connection before persisting
  try {
    await pg_test_connection(creds);
  } catch (err: any) {
    return c.json({ success: false, error: `Connection test failed: ${err.message}` }, 400);
  }

  // 2. Encrypt credentials
  let encryptedCredentials: string;
  try {
    encryptedCredentials = encryptCredentials(JSON.stringify(creds));
  } catch (err: any) {
    return c.json({ error: `Encryption error: ${err.message}. Check DB_ENCRYPTION_KEY.` }, 500);
  }

  // 3. Persist scoped to user.id
  const [row] = await db.insert(mcpServers).values({
    provider: 'postgres',
    displayName: body.displayName,
    encryptedCredentials,
    status: 'connected',
    agentAccess: {},
    config: { sslMode: body.sslMode },
    createdBy: user.id,
  }).returning();

  return c.json({ success: true, server: { id: row.id, displayName: row.displayName, status: row.status } });
});

mcpRouter.get('/postgres/:id', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { id } = c.req.param();

  // BOLA Fix: Strictly scope to createdBy = user.id
  const [row] = await db.select().from(mcpServers).where(
    and(
      eq(mcpServers.id, id),
      eq(mcpServers.provider, 'postgres'),
      eq(mcpServers.createdBy, user.id)
    )
  );

  if (!row) return c.json({ error: 'Not found' }, 404);

  const { encryptedCredentials: _, ...safe } = row;
  return c.json({ server: safe });
});

// ─── Redis ────────────────────────────────────────────────────────────────────

mcpRouter.post('/redis/test', validateBody(redisTestSchema), async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = getValidatedBody<z.infer<typeof redisTestSchema>>(c);
  const creds: RedisCredentials = {
    host: body.host,
    port: body.port,
    password: body.password,
    db: body.db,
    tls: body.tls,
  };

  try {
    const result = await redis_test_connection(creds);
    return c.json({ success: true, ...result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

mcpRouter.post('/redis/save', validateBody(redisSaveSchema), async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = getValidatedBody<z.infer<typeof redisSaveSchema>>(c);
  const creds: RedisCredentials = {
    host: body.host,
    port: body.port,
    password: body.password,
    db: body.db,
    tls: body.tls,
  };

  // 1. Validate
  try {
    await redis_test_connection(creds);
  } catch (err: any) {
    return c.json({ success: false, error: `Connection test failed: ${err.message}` }, 400);
  }

  // 2. Encrypt
  let encryptedCredentials: string;
  try {
    encryptedCredentials = encryptCredentials(JSON.stringify(creds));
  } catch (err: any) {
    return c.json({ error: `Encryption error: ${err.message}. Check DB_ENCRYPTION_KEY.` }, 500);
  }

  // 3. Persist scoped to user.id
  const [row] = await db.insert(mcpServers).values({
    provider: 'redis',
    displayName: body.displayName,
    encryptedCredentials,
    status: 'connected',
    agentAccess: {},
    config: { tls: creds.tls, db: creds.db },
    createdBy: user.id,
  }).returning();

  return c.json({ success: true, server: { id: row.id, displayName: row.displayName, status: row.status } });
});

mcpRouter.get('/redis/:id', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { id } = c.req.param();

  // BOLA Fix: Strictly scope to createdBy = user.id
  const [row] = await db.select().from(mcpServers).where(
    and(
      eq(mcpServers.id, id),
      eq(mcpServers.provider, 'redis'),
      eq(mcpServers.createdBy, user.id)
    )
  );

  if (!row) return c.json({ error: 'Not found' }, 404);

  const { encryptedCredentials: _, ...safe } = row;
  return c.json({ server: safe });
});
