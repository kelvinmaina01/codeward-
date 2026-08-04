/**
 * MCP Servers API routes
 *
 * POST /api/mcp/postgres/test    — Test a Postgres connection (no save)
 * POST /api/mcp/postgres/save    — Validate, then encrypt & persist credentials
 * GET  /api/mcp/postgres/:id     — Fetch a saved Postgres server (no plaintext creds)
 * POST /api/mcp/redis/test       — Test a Redis connection (no save)
 * POST /api/mcp/redis/save       — Validate, then encrypt & persist credentials
 * GET  /api/mcp/redis/:id        — Fetch a saved Redis server (no plaintext creds)
 * GET  /api/mcp                  — List all MCP servers for the org
 * DELETE /api/mcp/:id            — Remove an MCP server
 * PATCH /api/mcp/:id/agents      — Update agent access map
 */

import { Hono } from 'hono';
import { db } from '../db/index.js';
import { mcpServers } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { auth } from '../auth/index.js';
import { encryptCredentials, decryptCredentials } from '../lib/credential-crypto.js';
import { pg_test_connection, type PostgresCredentials } from '../mcp-servers/postgres.js';
import { redis_test_connection, type RedisCredentials } from '../mcp-servers/redis.js';

export const mcpRouter = new Hono();

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getSessionUser(c: any) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return session?.user ?? null;
}

// ─── Shared: list all MCP servers for the calling user's org ──────────────────

mcpRouter.get('/', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

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
  }).from(mcpServers);

  return c.json({ servers: rows });
});

// ─── Delete an MCP server ─────────────────────────────────────────────────────

mcpRouter.delete('/:id', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { id } = c.req.param();
  await db.delete(mcpServers).where(eq(mcpServers.id, id));
  return c.json({ success: true });
});

// ─── Update agent access map ──────────────────────────────────────────────────

mcpRouter.patch('/:id/agents', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { id } = c.req.param();
  const { agentAccess } = await c.req.json();

  if (typeof agentAccess !== 'object' || agentAccess === null) {
    return c.json({ error: 'agentAccess must be an object mapping agentId -> boolean' }, 400);
  }

  const [updated] = await db.update(mcpServers)
    .set({ agentAccess, updatedAt: new Date() })
    .where(eq(mcpServers.id, id))
    .returning();

  return c.json({ success: true, server: updated });
});

// ─── PostgreSQL ───────────────────────────────────────────────────────────────

mcpRouter.post('/postgres/test', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const creds: PostgresCredentials = {
    host: body.host,
    port: Number(body.port) || 5432,
    database: body.database,
    user: body.user,
    password: body.password,
    sslMode: body.sslMode || 'require',
  };

  if (!creds.host || !creds.database || !creds.user || !creds.password) {
    return c.json({ error: 'Missing required fields: host, database, user, password' }, 400);
  }

  try {
    const result = await pg_test_connection(creds);
    return c.json({ success: true, ...result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

mcpRouter.post('/postgres/save', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const { displayName, host, port, database, sslMode } = body;
  const creds: PostgresCredentials = {
    host,
    port: Number(port) || 5432,
    database,
    user: body.user,
    password: body.password,
    sslMode: sslMode || 'require',
  };

  if (!displayName || !creds.host || !creds.database || !creds.user || !creds.password) {
    return c.json({ error: 'Missing required fields: displayName, host, database, user, password' }, 400);
  }

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

  // 3. Persist
  const [row] = await db.insert(mcpServers).values({
    provider: 'postgres',
    displayName,
    encryptedCredentials,
    status: 'connected',
    agentAccess: {},
    config: { sslMode },
    createdBy: user.id,
  }).returning();

  return c.json({ success: true, server: { id: row.id, displayName: row.displayName, status: row.status } });
});

mcpRouter.get('/postgres/:id', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { id } = c.req.param();
  const [row] = await db.select().from(mcpServers).where(
    and(eq(mcpServers.id, id), eq(mcpServers.provider, 'postgres'))
  );

  if (!row) return c.json({ error: 'Not found' }, 404);

  // Return all fields except the encrypted credentials blob
  const { encryptedCredentials: _, ...safe } = row;
  return c.json({ server: safe });
});

// ─── Redis ────────────────────────────────────────────────────────────────────

mcpRouter.post('/redis/test', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const creds: RedisCredentials = {
    host: body.host,
    port: Number(body.port) || 6379,
    password: body.password || undefined,
    db: Number(body.db) || 0,
    tls: body.tls === true,
  };

  if (!creds.host) {
    return c.json({ error: 'Missing required field: host' }, 400);
  }

  try {
    const result = await redis_test_connection(creds);
    return c.json({ success: true, ...result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

mcpRouter.post('/redis/save', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const { displayName } = body;
  const creds: RedisCredentials = {
    host: body.host,
    port: Number(body.port) || 6379,
    password: body.password || undefined,
    db: Number(body.db) || 0,
    tls: body.tls === true,
  };

  if (!displayName || !creds.host) {
    return c.json({ error: 'Missing required fields: displayName, host' }, 400);
  }

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

  // 3. Persist
  const [row] = await db.insert(mcpServers).values({
    provider: 'redis',
    displayName,
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
  const [row] = await db.select().from(mcpServers).where(
    and(eq(mcpServers.id, id), eq(mcpServers.provider, 'redis'))
  );

  if (!row) return c.json({ error: 'Not found' }, 404);

  const { encryptedCredentials: _, ...safe } = row;
  return c.json({ server: safe });
});
