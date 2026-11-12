// Categories that may be linked and indexed: at least 12 published games
// (docs/SEO-PLAN.md §Categories). Every category link on the site uses this list.
import { getPublishedGames } from './games';
import { categories, type Category } from './categories';

export const MIN_PUBLISHED_GAMES = 12;

interface HasCategories {
  data: { categories: string[] };
}

export function countGamesIn(games: HasCategories[], slug: string): number {
  return games.filter((g) => g.data.categories.includes(slug)).length;
}

export function publishedCategoriesFrom(games: HasCategories[]): Category[] {
  return categories.filter((c) => countGamesIn(games, c.slug) >= MIN_PUBLISHED_GAMES);
}

export async function getPublishedCategories(): Promise<Category[]> {
  return publishedCategoriesFrom(await getPublishedGames());
}
