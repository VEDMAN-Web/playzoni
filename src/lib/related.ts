// "More games like this" (docs/PRD.md §7, docs/SEO-PLAN §Internal linking).
// Order: same primary category by popularity, then shared tags by popularity, then overall popularity.
// Never the game itself, never the same game twice.

export interface RelatableGame {
  data: {
    slug: string;
    categories: string[];
    tags: string[];
    popularity: number;
  };
}

export function relatedGames<T extends RelatableGame>(self: T, all: T[], limit: number = 24): T[] {
  const others = all.filter((g) => g.data.slug !== self.data.slug);
  const byPopularity = (a: T, b: T): number => b.data.popularity - a.data.popularity;
  const primary = self.data.categories[0];

  const picked: T[] = [];
  const seen = new Set<string>();
  const addFrom = (list: T[]): void => {
    for (const g of list) {
      if (picked.length >= limit) return;
      if (seen.has(g.data.slug)) continue;
      seen.add(g.data.slug);
      picked.push(g);
    }
  };

  addFrom(others.filter((g) => g.data.categories.includes(primary)).sort(byPopularity));
  addFrom(
    others
      .filter((g) => self.data.tags.some((t) => g.data.tags.includes(t)))
      .sort(byPopularity),
  );
  addFrom([...others].sort(byPopularity));
  return picked;
}
