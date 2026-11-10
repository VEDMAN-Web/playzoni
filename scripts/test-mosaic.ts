// Self-test for the tile placement and badge rules (TP.1, docs/DESIGN.md §V2.2). Pure functions only.

import { pickBadges } from '../src/lib/badges';
import { capBadges, mosaicSize, placeItems } from '../src/lib/mosaic';
import { expect, finish, same } from './test-kit';

type Item = { kind: 'game' | 'category'; id: number; featured?: boolean; badge?: string };
const games = (n: number, featuredIds: number[] = []): Item[] =>
  Array.from({ length: n }, (_, i) => ({ kind: 'game' as const, id: i + 1, featured: featuredIds.includes(i + 1) }));
const sizes = (placed: ReturnType<typeof placeItems<Item>>): string[] => placed.map((p) => p.size);
const mosaic = { mode: 'mosaic' as const, uniformSize: 'S' as const, xlFirst: false };

function testSlots(): void {
  const larges = Array.from({ length: 60 }, (_, i) => i + 1).filter((p) => mosaicSize(p) === 'L');
  same(larges, [3, 16, 27, 40, 51], 'large slots repeat every 24 tiles: 3 and 16');
  same([mosaicSize(1), mosaicSize(2), mosaicSize(24), mosaicSize(25)], ['S', 'S', 'S', 'S'], 'other positions are S');
}

function testPlacement(): void {
  const plain = sizes(placeItems(games(30), mosaic));
  same(plain.map((s, i) => (s === 'L' ? i + 1 : 0)).filter(Boolean), [3, 16, 27], 'plain games: L at 3, 16, 27');
  same(new Set(plain), new Set(['S', 'L']), 'no M and no XL without xlFirst');

  const withFeatured = placeItems(games(30, [5, 9, 20]), mosaic);
  same([withFeatured[2].item.id, withFeatured[15].item.id, withFeatured[26].item.id], [5, 9, 20], 'featured games fill the L slots in order');
  same(new Set(withFeatured.map((p) => p.item.id)).size, 30, 'every game is placed once');

  const xl = placeItems(games(30, [7, 8]), { ...mosaic, xlFirst: true });
  same([xl[0].size, xl[0].item.id], ['XL', 7], 'xlFirst: the first featured game is XL at position 1');
  same([xl[2].size, xl[2].item.id], ['L', 8], 'xlFirst: the next featured game takes the first L slot');
  expect(xl.filter((p) => p.size === 'XL').length === 1, 'only one XL tile');

  const noFeatured = placeItems(games(10), { ...mosaic, xlFirst: true });
  expect(!noFeatured.some((p) => p.size === 'XL'), 'xlFirst without a featured game gives no XL');

  const mixed: Item[] = [...games(2), { kind: 'category', id: 100 }, ...games(2)];
  same(sizes(placeItems(mixed, mosaic)).filter((s) => s === 'CAT').length, 1, 'a category item is a CAT tile');
  same(sizes(placeItems(games(5), { mode: 'uniform', uniformSize: 'L', xlFirst: false })), ['L', 'L', 'L', 'L', 'L'], 'uniform L list');
  same(sizes(placeItems(games(3), { mode: 'uniform', uniformSize: 'S', xlFirst: true })), ['S', 'S', 'S'], 'uniform lists never use XL');
  same(placeItems(games(0), mosaic), [], 'an empty list places nothing');
}

function testBadges(): void {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 10, 12);
  const list = Array.from({ length: 30 }, (_, i) => ({ slug: `g${i + 1}`, addedDate: new Date(now - (i + 1) * DAY), popularity: 1000 - i }));
  const badges = pickBadges(list, now);
  const kinds = (k: string): string[] => [...badges].filter(([, v]) => v === k).map(([s]) => s);
  same(kinds('New'), ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'], 'New: added within 7 days (and among the newest 8)');
  same(kinds('Hot'), ['g8', 'g9', 'g10'], 'Hot: top 10 by popularity, minus the games that are already New');
  expect(!badges.has('g8') || badges.get('g8') === 'Hot', 'a game 8 days old is not New');
  same(badges.size, 10, 'one badge per game: 7 New and 3 Hot');

  const old = list.map((g) => ({ ...g, addedDate: new Date(now - 400 * DAY) }));
  same([...pickBadges(old, now).values()].filter((v) => v === 'New').length, 0, 'no New when nothing was added recently');
  same(pickBadges([], now).size, 0, 'no games, no badges');

  const items: Item[] = Array.from({ length: 20 }, (_, i) => ({ kind: 'game' as const, id: i, badge: 'Hot' }));
  same(capBadges(items).filter((i) => i.badge).length, 12, 'a page keeps at most 12 badges');
  same(capBadges(items)[0].badge, 'Hot', 'the first badges are kept');
  same(capBadges(items, 3).filter((i) => i.badge).length, 3, 'the cap can be changed');
}

testSlots();
testPlacement();
testBadges();
finish('test-mosaic');
