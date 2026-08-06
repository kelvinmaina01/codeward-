/**
 * Metrics cache — in-process TTL cache with single-flight de-duplication.
 *
 * The dashboard endpoints hit Postgres several times per request. For repeat views
 * (the same user + time window) that work is identical, so we cache the computed
 * payload per key for a short TTL. `withCache` also coalesces concurrent misses so
 * a stampede of dashboard requests for the same user fires exactly ONE recompute.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.value as T;
  store.delete(key);
  return undefined;
}

export function setCached<T>(key: string, value: T, ttlMs = 60_000): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function deleteCached(key: string): void {
  store.delete(key);
}

/**
 * Return `fn()`'s result for `key`, cached for `ttlMs`.
 * Concurrent callers with the same key share a single in-flight promise.
 */
export async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== undefined) return hit;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fn()
    .then((value) => {
      setCached(key, value, ttlMs);
      inflight.delete(key);
      return value;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}
