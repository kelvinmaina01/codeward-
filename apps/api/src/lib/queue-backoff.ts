import type { BackoffStrategy } from 'bullmq';

/**
 * Shared custom backoff for every BullMQ queue that declares `backoff: { type: 'custom' }`.
 *
 * This MUST be registered as `settings.backoffStrategy` (singular, a function) on the Worker.
 * BullMQ v3/v4 took `settings.backoffStrategies` — a map of name -> function — and that shape was
 * removed in v5: `Job.moveToFailed` now reads `opts.settings.backoffStrategy` and passes it to
 * `Backoffs.calculate` as the single fallback used for any non-builtin `backoff.type`. Registering
 * the old plural map leaves the lookup undefined, so `lookupStrategy` throws
 * `Unknown backoff strategy custom.` from inside `Worker.handleFailed` — which takes down the
 * worker loop rather than just failing the job. Keep this singular.
 *
 * Exponential from 5s with up to 30% jitter to de-synchronise retries across concurrent agents,
 * capped so a queue configured with many attempts cannot schedule a retry hours out.
 */
const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 300_000; // 5 minutes

export const customBackoffStrategy: BackoffStrategy = (attemptsMade: number): number => {
  const exponent = Math.max(0, attemptsMade - 1);
  const base = Math.min(BASE_DELAY_MS * Math.pow(2, exponent), MAX_DELAY_MS);
  const jitter = Math.random() * base * 0.3; // up to 30% randomized jitter
  return Math.round(base + jitter);
};
