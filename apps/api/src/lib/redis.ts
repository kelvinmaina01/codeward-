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
let loggedQuotaWarning = false;
let isQuotaExceeded = false;

export function isRedisQuotaExceeded(): boolean {
  return isQuotaExceeded;
}

export function createRedisConnection(): Redis {
  const isForcedLocal = process.env.FORCE_LOCAL_REDIS === 'true';
  const url = isForcedLocal 
    ? 'redis://localhost:6379' 
    : (process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379');
  const isTLS = url.startsWith('rediss://');

  const redis = new Redis(url, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy: (times) => {
      if (isQuotaExceeded) {
        // Stop aggressive reconnects when Upstash free tier monthly quota is exceeded
        return 300000; // 5 minutes backoff
      }
      if (times > 5) return 60000;
      return Math.min(times * 2000, 30000);
    },
    ...(isTLS ? { tls: {} } : {}),
  });

  redis.on('error', (err) => {
    if (err.message.includes('max requests limit exceeded') || ((err as any).name === 'ReplyError' && err.message.includes('Limit:'))) {
      isQuotaExceeded = true;
      if (!loggedQuotaWarning) {
        loggedQuotaWarning = true;
        console.warn(`[Redis] ⚠️  Upstash Redis monthly quota exceeded (500k requests limit). Pausing aggressive reconnection until quota resets or a new Redis URL is provided.`);
      }
      return;
    }
    console.error(`[Redis] Connection error:`, err.message);
  });

  return redis;
}
