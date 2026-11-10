// The picture on a category tile (docs/DESIGN.md §V2.8, R33): the thumbnail of a popular published game in that
// category. Two categories never share a picture on the same page: categories are walked in nav order, and each takes
// the most popular game in it that an earlier category has not taken. If every game in a category is taken, it falls
// back to its own most popular game. A category with no game has no entry (the tile shows its emoji).
interface GameLike {
  data: { slug: string; categories: string[]; popularity: number };
}

interface CategoryLike {
  slug: string;
  name: string;
  navOrder?: number | null;
}

export function popularSlugIn(games: GameLike[], categorySlug: string, taken: ReadonlySet<string> = new Set()): string | undefined {
  let best: GameLike | undefined;
  let bestFree: GameLike | undefined;
  for (const g of games) {
    if (!g.data.categories.includes(categorySlug)) continue;
    if (!best || g.data.popularity > best.data.popularity) best = g;
    if (!taken.has(g.data.slug) && (!bestFree || g.data.popularity > bestFree.data.popularity)) bestFree = g;
  }
  return (bestFree ?? best)?.data.slug;
}

// One picture per category, the same on every page (the order does not depend on the page).
export function categoryPictures(games: GameLike[], categories: CategoryLike[]): Map<string, string> {
  const ordered = [...categories].sort((a, b) => (a.navOrder ?? 99) - (b.navOrder ?? 99) || a.name.localeCompare(b.name));
  const taken = new Set<string>();
  const pictures = new Map<string, string>();
  for (const c of ordered) {
    const slug = popularSlugIn(games, c.slug, taken);
    if (!slug) continue;
    pictures.set(c.slug, slug);
    taken.add(slug);
  }
  return pictures;
}
