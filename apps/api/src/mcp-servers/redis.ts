/**
 * Redis MCP Server
 *
 * Security model:
 * - v1 exposes ONLY read-only commands: GET, SCAN (cursor-paginated), TTL, and INFO.
 * - Write commands (DEL, SET, FLUSHALL, HSET, etc.) are not exposed at all.
 * - KEYS * is never used. All key enumeration goes through SCAN, which is
 *   cursor-based and non-blocking on the Redis event loop.
 * - Connection is established fresh per call and closed immediately after.
 */

import { createClient } from 'redis';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RedisCredentials {
  host: string;
  port: number;
  password?: string;
  /** Redis logical DB index, default 0 */
  db?: number;
  tls?: boolean;
}

type RedisClient = Awaited<ReturnType<typeof makeClient>>;

// ─── Connection factory ────────────────────────────────────────────────────────

async function makeClient(creds: RedisCredentials) {
  const url = `redis${creds.tls ? 's' : ''}://${creds.password ? `:${creds.password}@` : ''}${creds.host}:${creds.port}/${creds.db ?? 0}`;
  const client = createClient({ url, socket: { connectTimeout: 5000 } });
  await client.connect();
  return client;
}

/**
 * Wrap a Redis operation: connect, run fn, quit.
 */
async function withClient<T>(creds: RedisCredentials, fn: (client: RedisClient) => Promise<T>): Promise<T> {
  const client = await makeClient(creds);
  try {
    return await fn(client);
  } finally {
    await client.quit().catch(() => { /* ignore quit errors */ });
  }
}

// ─── Tool handlers ────────────────────────────────────────────────────────────

/**
 * Test connection by sending PING.
 */
export async function redis_test_connection(creds: RedisCredentials): Promise<{ ok: true; latencyMs: number }> {
  const start = Date.now();
  await withClient(creds, async (client) => {
    const pong = await client.ping();
    if (pong !== 'PONG') throw new Error(`Unexpected PING response: ${pong}`);
  });
  return { ok: true, latencyMs: Date.now() - start };
}

/**
 * GET the value of a single key.
 * Returns null if the key does not exist.
 */
export async function redis_get_key(creds: RedisCredentials, key: string): Promise<{ key: string; value: string | null }> {
  const value = await withClient(creds, (client) => client.get(key));
  return { key, value };
}

/**
 * Cursor-based key scan. Never uses KEYS * — always SCAN.
 * Returns up to `count` keys matching `pattern`, plus the next cursor.
 * Pass cursor = 0 to start from the beginning.
 */
export async function redis_scan_keys(
  creds: RedisCredentials,
  pattern: string,
  cursor: string,
  count = 50
): Promise<{ nextCursor: string; keys: string[]; done: boolean }> {
  const result = await withClient(creds, (client) =>
    client.scan(cursor, { MATCH: pattern, COUNT: count })
  );
  return {
    nextCursor: result.cursor,
    keys: result.keys,
    done: result.cursor === '0',
  };
}

/**
 * Get the TTL (time-to-live) of a key in seconds.
 * Returns -1 if the key has no expiry, -2 if the key does not exist.
 */
export async function redis_get_ttl(creds: RedisCredentials, key: string): Promise<{ key: string; ttlSeconds: number }> {
  const ttl = await withClient(creds, (client) => client.ttl(key));
  return { key, ttlSeconds: ttl };
}

/**
 * Returns the Redis INFO output for a specific section.
 * Allowed sections: 'server', 'clients', 'memory', 'stats', 'keyspace'.
 */
const ALLOWED_INFO_SECTIONS = new Set(['server', 'clients', 'memory', 'stats', 'keyspace']);

export async function redis_info(creds: RedisCredentials, section: string): Promise<{ section: string; info: string }> {
  if (!ALLOWED_INFO_SECTIONS.has(section.toLowerCase())) {
    throw new Error(
      `INFO section "${section}" is not allowed. Permitted: ${[...ALLOWED_INFO_SECTIONS].join(', ')}.`
    );
  }
  const info = await withClient(creds, (client) => client.info(section));
  return { section, info };
}
