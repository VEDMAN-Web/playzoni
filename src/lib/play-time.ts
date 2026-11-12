// Play history for the profile panel (docs/DESIGN.md §V2.9). Pure functions, no browser calls, so they are tested with
// plain tsx (scripts/test-tp7.ts). src/lib/storage.ts keeps the data in localStorage and calls these.
//
// One entry per game: first and last time it was played (ms since 1970), number of plays, seconds played.
// Time is counted while the game page is visible, in 5-second steps, at most 4 hours per visit.

export interface GameStat {
  slug: string;
  firstPlayed: number;
  lastPlayed: number;
  plays: number;
  seconds: number;
}

export type StatsMap = Record<string, GameStat>;

export const STEP_SECONDS = 5;
export const SESSION_CAP_SECONDS = 4 * 60 * 60;
export const MAX_STATS = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

// The game was started: a new entry, or one more play and a new "last played" time.
export function applyPlayStart(stats: StatsMap, slug: string, now: number): StatsMap {
  const old = stats[slug];
  const entry: GameStat = old
    ? { ...old, lastPlayed: now, plays: old.plays + 1 }
    : { slug, firstPlayed: now, lastPlayed: now, plays: 1, seconds: 0 };
  return trim({ ...stats, [slug]: entry });
}

// Adds played seconds to a game (creates the entry if the game was never started through this code).
export function applyPlayTime(stats: StatsMap, slug: string, seconds: number, now: number): StatsMap {
  if (!(seconds > 0)) return stats;
  const old = stats[slug] ?? { slug, firstPlayed: now, lastPlayed: now, plays: 1, seconds: 0 };
  return trim({ ...stats, [slug]: { ...old, lastPlayed: now, seconds: old.seconds + seconds } });
}

// How many seconds may still be added in this visit (never more than one step, never past the 4 hour cap).
export function secondsToAdd(sessionSeconds: number): number {
  return Math.max(0, Math.min(STEP_SECONDS, SESSION_CAP_SECONDS - sessionSeconds));
}

// Keeps the newest MAX_STATS games.
function trim(stats: StatsMap): StatsMap {
  const all = Object.values(stats);
  if (all.length <= MAX_STATS) return stats;
  const keep = all.sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, MAX_STATS);
  return Object.fromEntries(keep.map((s) => [s.slug, s]));
}

// "32m", "2h 5m", "2h", and "<1m" for less than a minute (or "0m" when nothing was played).
export function formatPlayTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds === 0) return '0m';
  if (seconds < 60) return '<1m';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

// "Played today", "Played yesterday", "Played 3 days ago" (calendar days in the visitor's time zone).
export function playedLabel(lastPlayed: number, now: number): string {
  const startOfDay = (ms: number): number => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const days = Math.max(0, Math.round((startOfDay(now) - startOfDay(lastPlayed)) / DAY_MS));
  if (days === 0) return 'Played today';
  if (days === 1) return 'Played yesterday';
  return `Played ${days} days ago`;
}

// Keeps only well-formed entries from whatever was in storage (it may be old, edited or damaged).
export function cleanStats(raw: unknown): StatsMap {
  if (typeof raw !== 'object' || raw === null) return {};
  const result: StatsMap = {};
  for (const [slug, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const v = value as Record<string, unknown>;
    const { firstPlayed, lastPlayed, plays, seconds } = v;
    if (![firstPlayed, lastPlayed, plays, seconds].every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)) continue;
    result[slug] = { slug, firstPlayed: firstPlayed as number, lastPlayed: lastPlayed as number, plays: plays as number, seconds: seconds as number };
  }
  return result;
}
