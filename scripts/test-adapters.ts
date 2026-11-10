// Self-test for the shared import runner and the GameMonetize adapter (T4.3).
// Small fixtures only; a throw-away local web server stands in for the provider. Nothing in the repo changes.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createImageFetcher } from './import/images';
import { parseLimit } from './import/args';
import { loadGmGames, pageAddress, parseGmFeed } from './import/gm';
import { applyLimit, runImport } from './import/run';
import { decodeEntities, plainText } from './import/text';
import { IMPORT_PATHS } from './import/paths';
import type { ImportPaths, RawGame } from './import/types';
import { expect, finish, same } from './test-kit';

sharp.cache(false);

const GM_URL = 'https://html5.gamemonetize.co/abc123/';
const gmItem = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: '1', title: 'Tom &amp; Jerry&#039;s Run', description: 'Run fast &ndash; <b>jump</b> high.', instructions: 'Tap to jump.',
  url: GM_URL, category: 'Puzzle', tags: 'Mobile, 3D, Action', thumb: 'https://img.gamemonetize.com/abc123/512x384.jpg', width: '800', height: '600', ...over,
});

function testLimit(): void {
  same([parseLimit(undefined), parseLimit('200'), parseLimit('0')], [500, 200, 0], 'parseLimit: default 500, a number, 0 = all');
  for (const bad of ['-1', '2.5', 'many']) {
    let threw = false;
    try {
      parseLimit(bad);
    } catch {
      threw = true;
    }
    expect(threw, `parseLimit rejects "${bad}"`);
  }
  const games = parseGmFeed([gmItem({ id: 'a' }), gmItem({ id: 'b' }), gmItem({ id: 'c' })]);
  same(applyLimit(games, 2).games.map((g) => g.sourceId), ['a', 'b'], 'applyLimit keeps the first games in order');
  same(applyLimit(games, 0).games.length, 3, 'applyLimit 0 keeps all');
  same(applyLimit(games, 99).games.length, 3, 'applyLimit above the count keeps all');
}

function testText(): void {
  same(decodeEntities('A &amp; B &#039;x&#039; &#x41; &ndash; &unknown;'), "A & B 'x' A – &unknown;", 'decodeEntities');
  same(plainText('<p>One &amp;\n two</p>   <b>three</b> <i>four</i>.'), 'One & two three four.', 'plainText: block tags separate words, inline tags vanish');
}

function testGm(): void {
  const { games, skipped } = parseGmFeed([
    gmItem(),
    gmItem({ id: '1' }), // same id again: counts once
    gmItem({ id: '2', url: 'https://evil.example.com/play/', title: 'Elsewhere' }),
    gmItem({ id: '3', url: 'http://html5.gamemonetize.co/x/', title: 'Plain http' }),
    gmItem({ id: '4', thumb: '', title: 'No picture' }),
    gmItem({ id: '5', width: 'wide', title: 'Bad width' }),
    gmItem({ id: '', title: 'No id' }),
    gmItem({ id: '6', title: '  ' }),
    gmItem({ id: '7', tags: 'Action', category: '', title: 'No mobile tag' }),
  ]);
  same(games.map((g) => g.sourceId), ['1', '7'], 'GameMonetize: kept games');
  same(skipped.map((s) => s.title), ['Elsewhere', 'Plain http', 'No picture', 'Bad width', 'No id', ''], 'GameMonetize: left-out games');
  expect(skipped[0].reason.includes('not an allowed frame domain'), `host reason: ${skipped[0].reason}`);
  const [first, seventh] = games;
  same([first.title, first.mobile, first.providerCategories, first.tags, first.width, first.height], ["Tom & Jerry's Run", true, ['Puzzle'], ['Mobile', '3D', 'Action'], 800, 600], 'GameMonetize: field mapping');
  same(first.description, 'Run fast – jump high.\nTap to jump.', 'GameMonetize: feedText is plain text with the instructions');
  same([first.source, first.embedUrl, first.developer, first.releaseDate], ['gm', GM_URL, undefined, undefined], 'GameMonetize: source, embed address, no developer or date');
  same([seventh.mobile, seventh.providerCategories], [false, []], 'GameMonetize: mobile only with the Mobile tag; no category stays empty');
  let threw = false;
  try {
    parseGmFeed({ error: 'nope' });
  } catch {
    threw = true;
  }
  expect(threw, 'GameMonetize: a feed that is not a list is rejected');
  same(pageAddress('https://gamemonetize.com/feed.php?format=0&num=50&page=1', 3), 'https://gamemonetize.com/feed.php?format=0&num=50&page=3', 'pageAddress changes only the page');
  same(pageAddress('https://gamemonetize.com/feed.php?format=0', 2), 'https://gamemonetize.com/feed.php?format=0&page=2', 'pageAddress adds a missing page');
}

interface Hits {
  [path: string]: { count: number; accept?: string };
}

async function withServer(handler: (path: string, response: ServerResponse, request: IncomingMessage) => void, run: (base: string, hits: Hits) => Promise<void>): Promise<void> {
  const hits: Hits = {};
  const server = createServer((request, response) => {
    const path = request.url ?? '/';
    hits[path] = { count: (hits[path]?.count ?? 0) + 1, accept: String(request.headers.accept ?? '') };
    handler(path, response, request);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, hits);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function testNetwork(tmp: string): Promise<void> {
  const png = await sharp({ create: { width: 400, height: 400, channels: 3, background: '#FFC531' } }).png().toBuffer();
  const pages: Record<string, unknown[]> = { '1': [gmItem({ id: 'a' }), gmItem({ id: 'b', title: 'B' })], '2': [gmItem({ id: 'c', title: 'C' })], '3': [] };
  await withServer(
    (path, response) => {
      const url = new URL(path, 'http://x');
      if (url.pathname === '/feed') {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify(pages[url.searchParams.get('page') ?? '1'] ?? []));
      } else {
        response.writeHead(200, { 'content-type': 'image/png' });
        response.end(png);
      }
    },
    async (base, hits) => {
      const loaded = await loadGmGames(`${base}/feed?format=0&num=2&page=1`, 5);
      same(loaded.games.map((g) => g.sourceId), ['a', 'b', 'c'], 'pages 1 to 3 are read and an empty page stops the loop');
      same([hits['/feed?format=0&num=2&page=1']?.count, hits['/feed?format=0&num=2&page=3']?.count, hits['/feed?format=0&num=2&page=4']], [1, 1, undefined], 'no page after the empty one is asked for');
      same((await loadGmGames(`${base}/feed?format=0&num=2&page=1`, 1)).games.length, 2, '--pages 1 reads one page');
      const before = hits['/feed?format=0&num=2&page=2']?.count ?? 0;
      const limited = await loadGmGames(`${base}/feed?format=0&num=2&page=1`, 5, 2);
      same([limited.games.length, (hits['/feed?format=0&num=2&page=2']?.count ?? 0) - before], [2, 0], 'paging stops once the limit is reached');

      await createImageFetcher({ headers: { accept: 'image/webp,image/*' } })(`${base}/pic.png`);
      same(hits['/pic.png']?.accept, 'image/webp,image/*', 'the picture request carries the extra Accept header');

      const staging = join(tmp, 'staging');
      const paths: ImportPaths = { ...IMPORT_PATHS, stagingDir: staging, thumbsDir: join(staging, 'thumbs'), contentGamesDir: join(tmp, 'no-content'), categoryMapJson: join(tmp, 'map.json') };
      writeFileSync(paths.categoryMapJson, JSON.stringify({ gm: { puzzle: ['puzzle-games'] } }));
      const game: RawGame = { ...parseGmFeed([gmItem({ id: 'z', title: 'Zed Game' })]).games[0], thumbnailUrl: `${base}/pic.png` };
      const report = await runImport({
        source: 'gm', paths, fetchOptions: { retryDelayMs: 1 },
        result: { games: [game], skipped: [{ sourceId: '9', title: 'Left\tOut', reason: 'because\nreasons' }] },
      });
      same(report.imported, ['zed-game'], 'runImport imports the game');
      same(readFileSync(join(staging, 'failed.txt'), 'utf8'), 'gm\t9\tLeft Out\tbecause reasons\n', 'adapter skips are written to failed.txt on one line');
      expect(existsSync(join(staging, 'gm', 'zed-game.json')) && existsSync(join(staging, 'thumbs', 'zed-game', 'og.jpg')), 'staging file and pictures exist');
      const staged = JSON.parse(readFileSync(join(staging, 'gm', 'zed-game.json'), 'utf8')) as { categories: string[] };
      same(staged.categories, ['puzzle-games'], 'the category map is applied');
    },
  );
}

async function main(): Promise<void> {
  const tmp = mkdtempSync(join(tmpdir(), 'playzoni-adapters-test-'));
  try {
    testLimit();
    testText();
    testGm();
    await testNetwork(tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  finish('test-adapters');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
