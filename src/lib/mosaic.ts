// Tile placement for the game grid (docs/DESIGN.md §V2.2). No Astro imports, so it is tested with plain tsx.
//
// Tile sizes: S = 1x1, L = 2x2, XL = 3x3. The home mosaic repeats every 24 tiles after the nav box:
// positions 3 and 16 are L, everything else S. Featured games fill the L slots first; the very first
// featured game may be XL (shown 3x3 from 1024px, 2x2 below; the grid CSS decides).

export const MOSAIC_CYCLE = 24;
export const LARGE_SLOTS: readonly number[] = [3, 16];
export const MAX_BADGES_PER_PAGE = 12;
export const MAX_HOT_BADGES_PER_PAGE = 6;

export type PlacedSize = 'S' | 'L' | 'XL' | 'CAT';

export interface Placeable {
  kind: string;
  featured?: boolean;
}

export interface Placed<T> {
  item: T;
  size: PlacedSize;
}

export interface PlaceOptions {
  mode: 'mosaic' | 'uniform';
  uniformSize: 'S' | 'L';
  /** First featured game becomes XL (home page only). */
  xlFirst: boolean;
}

export function mosaicSize(position: number): 'S' | 'L' {
  const inCycle = ((position - 1) % MOSAIC_CYCLE) + 1;
  return LARGE_SLOTS.includes(inCycle) ? 'L' : 'S';
}

const isFeaturedGame = (item: Placeable): boolean => item.kind === 'game' && item.featured === true;

export function placeItems<T extends Placeable>(items: T[], options: PlaceOptions): Placed<T>[] {
  const mosaic = options.mode === 'mosaic';
  const featured = mosaic ? items.filter(isFeaturedGame) : [];
  const rest = mosaic ? items.filter((item) => !isFeaturedGame(item)) : [...items];
  const placed: Placed<T>[] = [];
  for (let position = 1; placed.length < items.length; position++) {
    const slot: 'S' | 'L' = mosaic ? mosaicSize(position) : options.uniformSize;
    const wantsFeatured = mosaic && featured.length > 0 && (slot === 'L' || (options.xlFirst && position === 1));
    const next = wantsFeatured ? featured.shift() : (rest.shift() ?? featured.shift());
    if (!next) break;
    if (next.kind === 'category') {
      placed.push({ item: next, size: 'CAT' });
    } else if (mosaic && options.xlFirst && position === 1 && isFeaturedGame(next)) {
      placed.push({ item: next, size: 'XL' });
    } else {
      placed.push({ item: next, size: slot });
    }
  }
  return placed;
}

// Keeps the first badges on a page and drops the rest (docs/DESIGN.md §V2.2): at most `max` in all and at most
// `perKind[kind]` of one kind (six "Hot" by default, so a page does not open with a row of flames).
// Items without a badge field (category tiles) pass through untouched.
export function capBadges<T extends object>(
  items: T[],
  max: number = MAX_BADGES_PER_PAGE,
  perKind: Record<string, number> = { Hot: MAX_HOT_BADGES_PER_PAGE },
): T[] {
  let used = 0;
  const usedByKind: Record<string, number> = {};
  return items.map((item) => {
    const badge = (item as { badge?: string }).badge;
    if (!badge) return item;
    const kindUsed = usedByKind[badge] ?? 0;
    if (used >= max || kindUsed >= (perKind[badge] ?? Infinity)) return { ...item, badge: undefined } as T;
    used++;
    usedByKind[badge] = kindUsed + 1;
    return item;
  });
}
