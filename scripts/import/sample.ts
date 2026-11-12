// Sample "provider" for testing the import pipeline with no network (docs/TASKS.md T4.1).
// Run: npm run import:sample
// Reads data/sample-feed.json (20 fake games), makes placeholder pictures, serves them from a
// throw-away local web server, and runs the shared normalizer. Output goes to data/staging/_sample/
// (git-ignored), never to public/, so test games cannot reach the site.

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { parsePriority } from './dedupe';
import { createImageFetcher, type FetchOptions } from './images';
import { normalizeGames } from './normalize';
import type { ImportPaths, ImportReport, RawGame } from './types';

const ROOT = join(import.meta.dirname, '..', '..');
const FEED_FILE = join(ROOT, 'data', 'sample-feed.json');

export const SAMPLE_PATHS: ImportPaths = {
  stagingDir: join(ROOT, 'data', 'staging', '_sample'),
  thumbsDir: join(ROOT, 'data', 'staging', '_sample', 'thumbs'), // = <stagingDir>/thumbs
  categoriesJson: join(ROOT, 'data', 'categories.json'),
  categoryMapJson: join(ROOT, 'data', 'sample-category-map.json'),
  contentGamesDir: join(ROOT, 'src', 'content', 'games'),
  brandJson: join(ROOT, 'data', 'brand.json'),
  tokensCss: join(ROOT, 'src', 'styles', 'tokens.css'),
};

// Picture name prefix -> size. "missing-*" has no picture, so the server answers 404.
const PICTURE_SIZES: Record<string, [number, number]> = { sample: [512, 384], square: [512, 512], tiny: [100, 100] };
const COLOURS = ['#1F7AFF', '#FFC531', '#FF5A8A', '#0E2440', '#0F5FD6', '#50607A'];

async function placeholderPicture(name: string, index: number): Promise<Buffer | null> {
  const size = PICTURE_SIZES[name.split('-')[0]];
  if (!size) return null;
  const [width, height] = size;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${COLOURS[index % COLOURS.length]}"/><text x="50%" y="52%" font-family="Arial,sans-serif" font-size="${Math.round(width / 8)}" font-weight="700" fill="#FFFFFF" text-anchor="middle">${name.replace('.png', '')}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function readSampleFeed(): RawGame[] {
  return JSON.parse(readFileSync(FEED_FILE, 'utf8')) as RawGame[];
}

export interface SampleRunOptions {
  paths?: ImportPaths;
  log?: (message: string) => void;
  fetchOptions?: Partial<FetchOptions>;
}

export async function runSample(options: SampleRunOptions = {}): Promise<ImportReport> {
  const feed = readSampleFeed();
  const pictures = new Map<string, Buffer>();
  for (const [index, game] of feed.entries()) {
    const picture = await placeholderPicture(game.thumbnailUrl, index);
    if (picture) pictures.set(game.thumbnailUrl, picture);
  }
  const server = createServer((request, response) => {
    const picture = pictures.get(decodeURIComponent((request.url ?? '/').slice(1)));
    response.writeHead(picture ? 200 : 404, { 'content-type': 'image/png' });
    response.end(picture);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  try {
    const raw = feed.map((game) => ({ ...game, thumbnailUrl: base + game.thumbnailUrl }));
    return await normalizeGames(raw, options.paths ?? SAMPLE_PATHS, {
      priority: parsePriority(process.env.SOURCE_PRIORITY),
      fetchImage: createImageFetcher({ retryDelayMs: 50, timeoutMs: 5000, ...options.fetchOptions }),
      log: options.log,
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function main(): Promise<void> {
  const report = await runSample({ log: (message) => console.log(`  ${message}`) });
  console.log(
    `import:sample: ${report.imported.length} imported, ${report.duplicates.length} duplicate, ` +
      `${report.failed.length + report.invalid.length} skipped (data/staging/_sample/failed.txt), ` +
      `${report.unmapped.length} unmapped categories (unmapped.txt), ${report.withoutCategory.length} without a category`,
  );
}

// Only when run as a script (`npm run import:sample`), not when a test imports `runSample`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
