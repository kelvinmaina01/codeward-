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

/**
 * The shared ioredis client is created with `maxRetriesPerRequest: null` because BullMQ
 * requires it. That setting also means a command is retried forever and never rejects, so a
 * socket that is still `ready` but whose peer has stopped replying leaves `await redis.incr()`
 * pending indefinitely — the catch block never runs, the memory fallback never engages, and
 * the request hangs before ever reaching `next()`. This bounds every command so a stalled
 * Redis degrades into the in-memory limiter instead of taking the whole API down with it.
 */
const REDIS_COMMAND_TIMEOUT_MS = 500;

function withRedisDeadline<T>(command: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('redis command timed out')), REDIS_COMMAND_TIMEOUT_MS);
  });
  // The losing promise is left to settle on its own; clearing the timer stops it holding the
  // event loop open, and an unhandled rejection is avoided by attaching a no-op catch.
  command.catch(() => {});
  return Promise.race([command, deadline]).finally(() => clearTimeout(timer)) as Promise<T>;
}

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
        currentCount = await withRedisDeadline<number>(redis.incr(key));
        if (currentCount === 1) {
          await withRedisDeadline<number>(redis.expire(key, windowSec));
        }
        const ttl = await withRedisDeadline<number>(redis.ttl(key));
        resetTime = now + (ttl > 0 ? ttl * 1000 : windowMs);
      } catch {
        // Fall back to memory store on redis failure OR on a command that never settled.
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
