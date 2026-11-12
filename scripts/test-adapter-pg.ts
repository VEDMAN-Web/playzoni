// Self-test for the Playgama adapter (T4.4). Small fixtures only; nothing in the repo changes.

import { parsePgCatalog, thumbnailFor, PG_IMAGE_HEADERS } from './import/pg';
import { expect, finish, same } from './test-kit';

const pgHit = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: '10', slug: 'cake', title: 'Piece of Cake', description: 'Bake <i>cakes</i>.', howToPlayText: 'Tap to merge.',
  gameURL: 'https://playgama.com/export/game/cake?clid=p_test', genres: ['cozy', 'puzzle'], tags: ['relaxing-games'],
  images: ['https://static.playgama.com/p-img/pg/cake/big_preview/aaa?width=448', 'https://static.playgama.com/p-img/pg/cake/icon/bbb?width=448'],
  mobileReady: ['For Android', 'For IOS', 'For Desktop'], supportedLanguages: ['en-US'], screenOrientation: { horizontal: true, vertical: true }, ...over,
});

const one = (over: Record<string, unknown>): ReturnType<typeof parsePgCatalog> => parsePgCatalog([pgHit(over)]);

function testMapping(): void {
  const catalog = {
    segments: [
      { title: 'A', hits: [pgHit(), pgHit({ id: '11', title: 'Tall', screenOrientation: { horizontal: false, vertical: true }, mobileReady: ['For Desktop'] })] },
      { title: 'B', hits: [pgHit({ id: '10', title: 'Seen already' })] },
    ],
  };
  const { games, skipped } = parsePgCatalog(catalog);
  same(games.map((g) => g.sourceId), ['10', '11'], 'Playgama: ranking order, a game in two segments counts once');
  same(skipped, [], 'Playgama: nothing left out');
  const [cake, tall] = games;
  same([cake.width, cake.height, cake.mobile, cake.providerCategories, cake.tags], [800, 450, true, ['cozy', 'puzzle'], ['relaxing-games']], 'Playgama: landscape, mobile, genres, tags');
  same([tall.width, tall.height, tall.mobile], [450, 800, false], 'Playgama: vertical only is portrait; desktop only is not mobile');
  same(cake.thumbnailUrl, 'https://static.playgama.com/p-img/pg/cake/icon/bbb?width=600', 'Playgama: the square icon at 600 px');
  same(cake.description, 'Bake cakes.\nTap to merge.', 'Playgama: feedText is the description and how to play');
  same([cake.source, cake.embedUrl, cake.developer], ['pg', 'https://playgama.com/export/game/cake?clid=p_test', undefined], 'Playgama: embed address is the catalog gameURL');
  same(PG_IMAGE_HEADERS.accept, 'image/webp,image/*', 'Playgama: pictures are asked for as WebP');
}

function testLeftOut(): void {
  expect(one({ gameURL: 'https://deadlydescent.net/play' }).skipped[0]?.reason.includes('not an allowed frame domain') === true, 'Playgama: another host is left out');
  expect(one({ gameURL: 'http://playgama.com/export/game/cake' }).skipped[0]?.reason.includes('not https') === true, 'Playgama: plain http is left out');
  expect(one({ supportedLanguages: ['ru-RU', 'de-DE'] }).skipped[0]?.reason.startsWith('no English') === true, 'Playgama: no English is left out');
  same(one({ supportedLanguages: [] }).games.length, 1, 'Playgama: no language list is kept');
  expect(one({ screenOrientation: { horizontal: false, vertical: false } }).skipped[0]?.reason.includes('orientation') === true, 'Playgama: no orientation is left out');
  same(one({ images: [] }).skipped[0]?.reason, 'no usable picture address', 'Playgama: no pictures is left out');
  same(one({ id: '' }).skipped[0]?.reason, 'no id', 'Playgama: no id is left out');
}

function testPictures(): void {
  same(one({ images: ['https://static.playgama.com/p-img/pg/cake/big-preview/ccc'] }).games[0].thumbnailUrl, 'https://static.playgama.com/p-img/pg/cake/big-preview/ccc?width=600', 'Playgama: the first picture when there is no icon');
  same(thumbnailFor(['not an address']), null, 'thumbnailFor rejects a bad address');
  same(parsePgCatalog({ hits: [pgHit()] }).games.length, 1, 'Playgama: a plain hits list is read');
  same(parsePgCatalog([pgHit()]).games.length, 1, 'Playgama: a plain list is read');
  let threw = false;
  try {
    parsePgCatalog({ nothing: true });
  } catch {
    threw = true;
  }
  expect(threw, 'Playgama: an unknown shape is rejected');
}

testMapping();
testLeftOut();
testPictures();
finish('test-adapter-pg');
