import { Redis } from 'ioredis';

/**
 * Creates an ioredis connection that correctly handles both:
 * - rediss:// (Upstash SSL in production)
 * - redis://  (local dev)
 *
 * ioredis does NOT automatically enable TLS from a rediss:// URL string
 * unless you explicitly pass tls: {}. Without this, the connection silently
 * hangs or throws on Upstash, crashing the process at startup.
 */
export function createRedisConnection(): Redis {
  const isForcedLocal = process.env.FORCE_LOCAL_REDIS === 'true';
  const url = isForcedLocal ? 'redis://localhost:6379' : (process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379');
  const isTLS = url.startsWith('rediss://');

  const redis = new Redis(url, {
    maxRetriesPerRequest: null,
    ...(isTLS ? { tls: {} } : {}),
  });

  redis.on('error', (err) => {
    console.error(`[Redis] Connection error:`, err.message);
  });

  return redis;
}
