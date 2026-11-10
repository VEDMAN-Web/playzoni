// The picture on a category tile (docs/DESIGN.md §V2.8): the thumbnail of the most popular published game in
// that category. Returns undefined when the category has no game, so the tile falls back to its emoji.
interface GameLike {
  data: { slug: string; categories: string[]; popularity: number };
}

export function popularSlugIn(games: GameLike[], categorySlug: string): string | undefined {
  let best: GameLike | undefined;
  for (const g of games) {
    if (!g.data.categories.includes(categorySlug)) continue;
    if (!best || g.data.popularity > best.data.popularity) best = g;
  }
  return best?.data.slug;
}
