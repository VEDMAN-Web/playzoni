// Which games get a badge (docs/DESIGN.md §V2.2). Pure functions, tested with plain tsx.
//   new = added within 7 days AND among the newest 8 games on the site
//   hot = the top 10 by popularity
// One badge per game ("new" wins). "updated" has an icon but no rule yet, so nothing assigns it.

export type BadgeKind = 'New' | 'Hot' | 'Updated';

export interface BadgeInput {
  slug: string;
  addedDate: Date;
  popularity: number;
}

export const NEW_WITHIN_DAYS = 7;
export const NEWEST_COUNT = 8;
export const HOT_COUNT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export function pickBadges(games: BadgeInput[], now: number): Map<string, BadgeKind> {
  const badges = new Map<string, BadgeKind>();
  const newest = [...games].sort((a, b) => b.addedDate.valueOf() - a.addedDate.valueOf()).slice(0, NEWEST_COUNT);
  for (const game of newest) {
    if (now - game.addedDate.valueOf() <= NEW_WITHIN_DAYS * DAY_MS) badges.set(game.slug, 'New');
  }
  const hot = [...games].sort((a, b) => b.popularity - a.popularity).slice(0, HOT_COUNT);
  for (const game of hot) {
    if (!badges.has(game.slug)) badges.set(game.slug, 'Hot');
  }
  return badges;
}
