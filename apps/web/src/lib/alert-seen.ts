/**
 * Per-user "seen" watermark for alert badges.
 *
 * The API reports how many alerts are OPEN, not how many are UNREAD — there is no read
 * state on the server. Zeroing a counter locally would be undone by the next poll, so
 * instead we remember which alert ids the user has already had on screen and count only
 * the ones they haven't. Stored in localStorage, scoped by user id, capped so it can't
 * grow without bound. Every access is wrapped: storage can be missing or throw (private
 * windows, cleared site data), and the badge must still render correctly without it.
 */

const KEY_PREFIX = 'cw_seen_alerts:';
const MAX_IDS = 1000;

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function read(userId: string): string[] {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(userId: string, ids: string[]): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(ids.slice(-MAX_IDS)));
  } catch {
    // Storage unavailable — the badge simply keeps counting until the next visit.
  }
}

/** Ids the user has already seen. */
export function getSeen(userId: string): Set<string> {
  return new Set(read(userId));
}

/** Records ids as seen. Returns true only if something new was recorded (so callers can skip a re-render). */
export function markSeen(userId: string, ids: readonly string[]): boolean {
  if (ids.length === 0) return false;
  const existing = read(userId);
  const seen = new Set(existing);
  const fresh = ids.filter((id) => !seen.has(id));
  if (fresh.length === 0) return false;
  write(userId, [...existing, ...fresh]);
  return true;
}

/** How many of `ids` the user has not seen yet. */
export function countUnseen(userId: string | null | undefined, ids: readonly string[]): number {
  if (!userId) return ids.length;
  const seen = getSeen(userId);
  let n = 0;
  for (const id of ids) if (!seen.has(id)) n++;
  return n;
}
