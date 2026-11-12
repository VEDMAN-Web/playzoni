// Pure rules shared by the tracking script (src/lib/track.ts), the collection endpoint (/api/e) and the tests.

/** A session ends after 30 minutes without activity (docs/ADMIN.md §3). */
export const IDLE_MS = 30 * 60 * 1000;
/** At most 50 events per request. */
export const MAX_BATCH = 50;

/** Keeps the current session while it is fresh, otherwise starts a new one with `newId`. */
export function sessionFor(now: number, last: number, current: string | null, newId: string): { sid: string; fresh: boolean } {
  return current && last > 0 && now - last <= IDLE_MS ? { sid: current, fresh: false } : { sid: newId, fresh: true };
}

/** Splits a queue into requests of at most MAX_BATCH events. */
export function splitBatches<T>(events: T[], size = MAX_BATCH): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < events.length; i += size) out.push(events.slice(i, i + size));
  return out;
}

/** Page type from a URL path: home, game, list, category, or the first path segment. */
export function pageType(path: string): string {
  if (path === '/') return 'home';
  if (path.startsWith('/game/')) return 'game';
  if (/^\/(all|new|popular)-games(\/|$)/.test(path)) return 'list';
  if (/^\/[a-z0-9-]+-games(\/\d+)?$/.test(path)) return 'category';
  return path.slice(1).split('/')[0] || 'other';
}
