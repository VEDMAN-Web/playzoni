// T9.5 "Game of the day": the same pick for everyone in the world on the same UTC day. No randomness, no visitor data.
// Eligible = published games that work on phones, sorted by slug A to Z. Pick = eligible[(d x 7919) mod N], where d is
// the number of whole UTC days since 2026-01-01.

export const GAME_OF_DAY_EPOCH = Date.UTC(2026, 0, 1);
const DAY_MS = 86_400_000;

/** Whole UTC days from 2026-01-01 to the UTC day of `time` (ms). The visitor's time zone does not matter. */
export function dayNumber(time: number): number {
  return Math.floor((time - GAME_OF_DAY_EPOCH) / DAY_MS);
}

export function pickIndex(day: number, count: number): number {
  return (((day * 7919) % count) + count) % count;
}

export interface DayPick {
  d: number;
  slug: string;
  title: string;
}

/** Sorts the eligible games by slug and returns the picks for `days` days starting at `fromDay`. */
export function upcomingPicks(games: { slug: string; title: string }[], fromDay: number, days = 14): DayPick[] {
  const eligible = [...games].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  if (eligible.length === 0) return [];
  return Array.from({ length: days }, (_, i) => {
    const d = fromDay + i;
    const g = eligible[pickIndex(d, eligible.length)];
    return { d, slug: g.slug, title: g.title };
  });
}
