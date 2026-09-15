import { type Context, type Next } from 'hono';
import { createRedisConnection } from '../lib/redis.js';

export interface RateLimiterOptions {
  limit?: number; // Max requests per window
  windowMs?: number; // Window duration in milliseconds (default 60s)
  keyPrefix?: string; // Redis key prefix
  message?: string;
  skip?: (c: Context) => boolean;
}

// In-memory fallback store when Redis is unavailable
interface MemoryBucket {
  count: number;
  resetTime: number;
}
const memoryStore = new Map<string, MemoryBucket>();

// Periodic cleanup of expired memory keys
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryStore.entries()) {
    if (bucket.resetTime <= now) {
      memoryStore.delete(key);
    }
  }
}, 60000).unref();

export function rateLimiter(options: RateLimiterOptions = {}) {
  const limit = options.limit ?? 100;
  const windowMs = options.windowMs ?? 60 * 1000;
  const keyPrefix = options.keyPrefix ?? 'rate-limit';
  const message = options.message ?? 'Too many requests, please try again later.';
  const windowSec = Math.ceil(windowMs / 1000);

  let redis: any = null;
  try {
    redis = createRedisConnection();
  } catch {
    redis = null;
  }

  return async (c: Context, next: Next) => {
    if (options.skip && options.skip(c)) {
      return next();
    }

    // Determine client identifier: CF-Connecting-IP > X-Forwarded-For > remote address
    const forwarded = c.req.header('x-forwarded-for');
    const clientIp =
      c.req.header('cf-connecting-ip') ||
      (forwarded ? forwarded.split(',')[0].trim() : undefined) ||
      c.req.header('x-real-ip') ||
      'unknown-ip';

    const key = `${keyPrefix}:${clientIp}`;
    const now = Date.now();

    let currentCount = 1;
    let resetTime = now + windowMs;

    if (redis && redis.status === 'ready') {
      try {
        currentCount = await redis.incr(key);
        if (currentCount === 1) {
          await redis.expire(key, windowSec);
        }
        const ttl = await redis.ttl(key);
        resetTime = now + (ttl > 0 ? ttl * 1000 : windowMs);
      } catch {
        // Fall back to memory store on redis failure
        currentCount = incrementMemory(key, now, windowMs);
      }
    } else {
      currentCount = incrementMemory(key, now, windowMs);
      const bucket = memoryStore.get(key);
      if (bucket) resetTime = bucket.resetTime;
    }

    const remaining = Math.max(0, limit - currentCount);
    const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000));

    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

    if (currentCount > limit) {
      c.header('Retry-After', String(retryAfter));
      return c.json(
        {
          error: 'Too Many Requests',
          message,
          retryAfter,
        },
        429
      );
    }

    return next();
  };
}

function incrementMemory(key: string, now: number, windowMs: number): number {
  let bucket = memoryStore.get(key);
  if (!bucket || bucket.resetTime <= now) {
    bucket = { count: 1, resetTime: now + windowMs };
    memoryStore.set(key, bucket);
    return 1;
  }
  bucket.count++;
  return bucket.count;
}
