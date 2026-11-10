// Self-test for the import pipeline (T4.1). Runs as part of `npm run validate`.
// Everything happens in temp folders and on a throw-away local web server: no network, no repo files touched.

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { appendUnmapped, loadCategoryMap, mapCategories } from './import/categories';
import { DEFAULT_PRIORITY, dedupeByTitle, parsePriority } from './import/dedupe';
import { createImageFetcher, wrapTitle } from './import/images';
import { normalizeGames } from './import/normalize';
import { SAMPLE_PATHS, runSample } from './import/sample';
import { aspectFrom, normaliseTitle, slugify, uniqueSlug } from './import/text';
import type { ImageFetcher, ImportPaths, RawGame } from './import/types';

const ROOT = join(import.meta.dirname, '..');
sharp.cache(false); // Windows cannot delete the temp folder while sharp still holds its files open
const failures: string[] = [];
const expect = (ok: boolean, message: string): void => {
  if (!ok) failures.push(message);
};
const same = (actual: unknown, wanted: unknown, message: string): void =>
  expect(JSON.stringify(actual) === JSON.stringify(wanted), `${message}: got ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);

const picture = (width: number, height: number): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: '#1F7AFF' } }).png().toBuffer();

function game(overrides: Partial<RawGame>): RawGame {
  return {
    source: 'gd', sourceId: 'id-1', title: 'Test Game', description: 'Raw text.', providerCategories: [], tags: [],
    thumbnailUrl: 'ok', embedUrl: 'https://example.com/embed/1', width: 1280, height: 720, mobile: true, ...overrides,
  };
}

function testText(): void {
  same(slugify('Kiki & Momo: Jump!'), 'kiki-and-momo-jump', 'slugify ampersand and punctuation');
  same(slugify('Éclair Escape'), 'eclair-escape', 'slugify accents');
  same(slugify("Cat's Cradle"), 'cats-cradle', 'slugify apostrophe');
  same(slugify('!!!'), 'game', 'slugify with no letters');
  const long = slugify('word '.repeat(40));
  expect(long.length <= 60 && !long.endsWith('-'), `long slug is clipped at a word: "${long}"`);
  same(slugify('x'.repeat(100)).length, 60, 'one very long word is cut at 60');
  same(uniqueSlug('a', new Set(['a', 'a-2'])), 'a-3', 'uniqueSlug skips taken suffixes');
  same(uniqueSlug('b', new Set(['a'])), 'b', 'uniqueSlug keeps a free slug');
  same([aspectFrom(1280, 720), aspectFrom(720, 1280), aspectFrom(800, 800), aspectFrom(1000, 900)], ['landscape', 'portrait', 'square', 'square'], 'aspectFrom');
  same(normaliseTitle('Tumble Tower!'), normaliseTitle('tumble  TOWER'), 'normaliseTitle ignores case and punctuation');
  same(wrapTitle('Zorp Blaster'), ['Zorp Blaster'], 'a short og title stays on one line');
  same(wrapTitle('Super Mega Monster Truck Stunt Racing Championship Extreme Edition 2025'), ['Super Mega Monster Truck', 'Stunt Racing Championship…'], 'a long og title wraps to two lines and ends with an ellipsis');
}

function testCategories(tmp: string): void {
  const map = { gd: { action: ['action-games'], puzzle: ['puzzle-games', 'action-games'], a: ['car-games'], b: ['racing-games'], c: ['arcade-games'] } };
  const result = mapCategories('gd', [' Action ', 'Strategy', 'PUZZLE'], map);
  same(result, { slugs: ['action-games', 'puzzle-games'], unmapped: ['Strategy'] }, 'mapCategories maps, never guesses, no duplicates');
  same(mapCategories('gd', ['Action', 'Puzzle', 'A', 'B', 'C'], map).slugs.length, 4, 'mapCategories keeps at most 4');
  same(mapCategories('gm', ['Action'], map), { slugs: [], unmapped: ['Action'] }, 'a source with no map entries maps nothing');

  const bad = join(tmp, 'bad-map.json');
  writeFileSync(bad, JSON.stringify({ gd: { Action: ['no-such-category'] } }));
  let threw = false;
  try {
    loadCategoryMap(bad, new Set(['action-games']));
  } catch {
    threw = true;
  }
  expect(threw, 'loadCategoryMap rejects a map that points at an unknown category');

  const log = join(tmp, 'unmapped-test.txt');
  appendUnmapped(log, [{ source: 'gd', category: 'Strategy' }]);
  appendUnmapped(log, [{ source: 'gd', category: 'Strategy' }, { source: 'gm', category: 'Kids' }]);
  same(readFileSync(log, 'utf8'), 'gd\tStrategy\ngm\tKids\n', 'unmapped.txt lists each pair once');
}

function testDedupe(): void {
  same(parsePriority(''), DEFAULT_PRIORITY, 'empty SOURCE_PRIORITY uses the default order');
  same(parsePriority('gm,gd').slice(0, 2), ['gm', 'gd'], 'SOURCE_PRIORITY order is used');
  let threw = false;
  try {
    parsePriority('gd,zz');
  } catch {
    threw = true;
  }
  expect(threw, 'SOURCE_PRIORITY with an unknown source is rejected');

  const a = game({ source: 'gm', sourceId: 'm1', title: 'Tumble Tower' });
  const b = game({ source: 'gd', sourceId: 'd1', title: 'tumble tower!' });
  same(dedupeByTitle([a, b], parsePriority('')).kept.map((g) => g.sourceId), ['d1'], 'default priority keeps gd over gm');
  same(dedupeByTitle([a, b], parsePriority('gm')).kept.map((g) => g.sourceId), ['m1'], 'SOURCE_PRIORITY=gm keeps gm');
  const twin = game({ source: 'gd', sourceId: 'd2', title: 'Tumble Tower' });
  same(dedupeByTitle([b, twin], parsePriority('')).kept.map((g) => g.sourceId), ['d1'], 'same source twice keeps the first');
}

interface Fixture {
  paths: ImportPaths;
  fetchImage: ImageFetcher;
  calls: string[];
}

async function makeFixture(tmp: string): Promise<Fixture> {
  const mapFile = join(tmp, 'map.json');
  writeFileSync(mapFile, JSON.stringify({ gd: { action: ['action-games'] } }));
  const content = join(tmp, 'content');
  mkdirSync(content);
  writeFileSync(join(content, 'zorp-blaster.md'), '---\n---\n');
  const ok = await picture(512, 384);
  const tiny = await picture(100, 100);
  const calls: string[] = [];
  const fetchImage: ImageFetcher = (url) => {
    calls.push(url);
    if (url === 'ok') return Promise.resolve(ok);
    if (url === 'tiny') return Promise.resolve(tiny);
    return Promise.reject(new Error(`${url}: HTTP 404`));
  };
  const paths: ImportPaths = {
    stagingDir: join(tmp, 'staging'), thumbsDir: join(tmp, 'thumbs'), categoriesJson: join(ROOT, 'data', 'categories.json'),
    categoryMapJson: mapFile, contentGamesDir: content, brandJson: join(ROOT, 'data', 'brand.json'), tokensCss: join(ROOT, 'src', 'styles', 'tokens.css'),
  };
  return { paths, fetchImage, calls };
}

const feed = (): RawGame[] => [
  game({ sourceId: 'z1', title: 'Zorp Blaster', providerCategories: ['Action', 'Nope'], description: 'Raw <b>text</b>, kept as it came.', developer: 'Unknown' }),
  game({ sourceId: 'f1', title: 'Fish & Chips' }),
  game({ source: 'gm', sourceId: 'f2', title: 'Fish and Chips', providerCategories: ['Arcade'] }),
  game({ source: 'gm', sourceId: 'z2', title: 'ZORP BLASTER' }),
  game({ sourceId: 'b1', title: 'Bad Picture', thumbnailUrl: 'missing' }),
  game({ sourceId: 't1', title: 'Tiny Picture', thumbnailUrl: 'tiny' }),
  game({ sourceId: 'i1', title: 'Insecure Embed', embedUrl: 'http://example.com/embed' }),
];

async function checkImages(dir: string, slug: string): Promise<void> {
  const sizes: [string, string, number, number][] = [['s.webp', 'webp', 150, 150], ['m.webp', 'webp', 300, 300], ['l.webp', 'webp', 600, 600], ['og.jpg', 'jpeg', 1200, 630]];
  for (const [file, format, width, height] of sizes) {
    const meta = await sharp(join(dir, slug, file)).metadata();
    same([meta.format, meta.width, meta.height], [format, width, height], `${slug}/${file}`);
  }
}

async function testNormalize(tmp: string): Promise<void> {
  const { paths, fetchImage } = await makeFixture(tmp);
  const options = { priority: parsePriority(''), fetchImage };
  const report = await normalizeGames(feed(), paths, options);

  same(report.imported, ['fish-and-chips', 'fish-and-chips-2', 'zorp-blaster-2'], 'imported slugs (collisions get -2, published slugs are never reused)');
  expect(report.duplicates.length === 1 && report.duplicates[0].includes('z2'), `one duplicate dropped: ${report.duplicates.join('|')}`);
  expect(report.failed.length === 2, `two downloads skipped: ${report.failed.join('|')}`);
  expect(report.invalid.length === 1, `one invalid entry: ${report.invalid.join('|')}`);
  same(report.unmapped, ['gd: Nope', 'gm: Arcade'], 'unmapped categories');

  const zorp = JSON.parse(readFileSync(join(paths.stagingDir, 'gd', 'zorp-blaster-2.json'), 'utf8')) as Record<string, unknown>;
  same(zorp.categories, ['action-games'], 'only mapped categories are kept');
  same(zorp.feedText, 'Raw <b>text</b>, kept as it came.', 'the raw feed text is kept as it is');
  expect(!('developer' in zorp), 'developer "Unknown" is left out');
  same([zorp.aspect, zorp.popularity], ['landscape', 5], 'aspect from width and height; default popularity from feed order');
  expect(!existsSync(join(paths.stagingDir, 'gd', 'bad-picture.json')) && !existsSync(join(paths.thumbsDir, 'bad-picture')), 'a skipped game leaves no files');
  expect(!existsSync(join(paths.thumbsDir, 'tiny-picture')), 'a too-small picture leaves no folder');
  await checkImages(paths.thumbsDir, 'zorp-blaster-2');

  const unmapped = readFileSync(join(paths.stagingDir, 'unmapped.txt'), 'utf8');
  same(unmapped, 'gd\tNope\ngm\tArcade\n', 'unmapped.txt');
  const failed = readFileSync(join(paths.stagingDir, 'failed.txt'), 'utf8').trim().split('\n');
  expect(failed.length === 3 && failed.every((line) => line.split('\t').length === 4), `failed.txt has 3 four-column lines: ${failed.join('|')}`);

  // Second run: same slugs, nothing added to the logs, and a renamed game keeps its slug.
  const renamed = feed();
  renamed[1] = { ...renamed[1], title: 'Fish & Chips Deluxe' };
  const again = await normalizeGames(renamed, paths, options);
  same(again.imported, report.imported, 'a re-import (even with a new title) keeps every slug');
  same(readFileSync(join(paths.stagingDir, 'unmapped.txt'), 'utf8'), unmapped, 'unmapped.txt is not repeated');
  same(readFileSync(join(paths.stagingDir, 'failed.txt'), 'utf8').trim().split('\n').length, 3, 'failed.txt is not repeated');
}

async function testFetcher(): Promise<void> {
  const png = await picture(200, 200);
  const hits: Record<string, number> = {};
  const server = createServer((request, response) => {
    const path = request.url ?? '/';
    hits[path] = (hits[path] ?? 0) + 1;
    if (path === '/ok') {
      response.writeHead(200, { 'content-type': 'image/png' });
      response.end(png);
    } else if (path === '/missing') {
      response.writeHead(404);
      response.end();
    } // /slow never answers
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const fetcher = createImageFetcher({ timeoutMs: 150, retries: 2, retryDelayMs: 1 });
  const failsWith = async (url: string, text: string, label: string): Promise<void> => {
    try {
      await fetcher(url);
      failures.push(`${label}: should have failed`);
    } catch (error) {
      expect(String(error).includes(text), `${label}: wrong error "${String(error)}"`);
    }
  };
  try {
    same((await fetcher(`${base}/ok`)).length, png.length, 'fetcher returns the picture');
    await failsWith(`${base}/missing`, 'HTTP 404', 'a 404');
    same(hits['/missing'], 3, 'a failing download is tried 3 times (first try + 2 retries)');
    await failsWith(`${base}/slow`, 'aborted', 'a download that never answers');
    same(hits['/slow'], 3, 'a timeout is retried twice too');
    await failsWith('file:///etc/passwd', 'only http and https', 'a file: address');
    await failsWith('not a url', 'not a valid URL', 'text that is not an address');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function testSample(tmp: string): Promise<void> {
  // Own empty content folder: the real src/content/games must not change which slugs are free.
  const paths: ImportPaths = { ...SAMPLE_PATHS, stagingDir: join(tmp, 'staging'), thumbsDir: join(tmp, 'thumbs'), contentGamesDir: join(tmp, 'no-content') };
  const report = await runSample({ paths, fetchOptions: { retryDelayMs: 1, retries: 1 } });
  same(
    [report.imported.length, report.duplicates.length, report.failed.length, report.invalid.length, report.unmapped.length, report.withoutCategory.length],
    [17, 1, 2, 0, 2, 1],
    'sample feed: imported, duplicates, skipped, invalid, unmapped, without a category',
  );
  expect(report.imported.includes('fish-and-chips-2') && report.imported.includes('eclair-escape'), 'sample feed: collision suffix and accent slugs');
  await checkImages(paths.thumbsDir, 'zorp-blaster');
}

async function main(): Promise<void> {
  const tmp = mkdtempSync(join(tmpdir(), 'playzoni-import-test-'));
  try {
    testText();
    testCategories(tmp);
    testDedupe();
    mkdirSync(join(tmp, 'a'));
    await testNormalize(join(tmp, 'a'));
    await testFetcher();
    mkdirSync(join(tmp, 'b'));
    await testSample(join(tmp, 'b'));
  } finally {
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  if (failures.length > 0) {
    for (const failure of failures) console.error(`test-import: FAIL: ${failure}`);
    process.exit(1);
  }
  console.log('test-import: ok');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
