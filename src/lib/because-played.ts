// T9.6 "Because you played X": similar games for the home page, from the visitor's own history only (localStorage).
// Same order as related.ts (build time): same primary category, then shared tags, then overall popularity. The index
// is already most popular first. Never the game itself or any game the visitor has already played.
import type { IndexGame } from './render-tiles';

export const BECAUSE_MIN = 6;
export const BECAUSE_MAX = 12;

export function becauseYouPlayed(index: IndexGame[], played: string[]): { source: IndexGame; games: IndexGame[] } | null {
  // X is the most recent played game that is still on the site.
  const source = played.map((slug) => index.find((g) => g.slug === slug)).find((g) => g !== undefined);
  if (!source) return null;
  const skip = new Set(played);
  const primary = source.cats?.[0];
  const tags = source.t ?? [];
  const picked: IndexGame[] = [];
  const add = (list: IndexGame[]): void => {
    for (const g of list) {
      if (picked.length >= BECAUSE_MAX) return;
      if (skip.has(g.slug)) continue;
      skip.add(g.slug);
      picked.push(g);
    }
  };
  if (primary) add(index.filter((g) => g.cats?.includes(primary)));
  if (tags.length) add(index.filter((g) => (g.t ?? []).some((t) => tags.includes(t))));
  add(index);
  return picked.length >= BECAUSE_MIN ? { source, games: picked } : null;
}
