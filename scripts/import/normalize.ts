// Shared normalizer for every provider adapter (docs/PRD.md §10, docs/TASKS.md T4.1).
// RawGame[] in; slugs, mapped categories, one game per title, thumbnails and og images, and
// data/staging/<source>/<slug>.json out. Problems are logged and the game is skipped, never guessed.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { appendUnmapped, loadCategoryMap, mapCategories, type CategoryMap } from './categories';
import { dedupeByTitle } from './dedupe';
import { readBrandColours, renderImages, writeImages, type BrandColours } from './images';
import { appendNewLines } from './log';
import { aspectFrom, slugify, uniqueSlug } from './text';
import {
  SOURCE_KEYS,
  type ImportOptions,
  type ImportPaths,
  type ImportReport,
  type RawGame,
  type StagingGame,
} from './types';

const DEFAULT_CONCURRENCY = 4;

interface Context {
  paths: ImportPaths;
  options: ImportOptions;
  report: ImportReport;
  categoryMap: CategoryMap;
  colours: BrandColours;
  taken: Set<string>;
  /** "<source>:<sourceId>" -> slug from an earlier import, so a slug never changes. */
  reuse: Map<string, string>;
  failedLines: string[];
}

interface Planned {
  game: RawGame;
  slug: string;
  isNew: boolean;
  categories: string[];
  popularity: number;
}

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();
const label = (game: RawGame): string => `${game.source}:${game.sourceId} "${game.title}"`;

function invalidReason(game: RawGame): string | null {
  if (!(SOURCE_KEYS as readonly string[]).includes(game.source)) return `unknown source "${game.source}"`;
  for (const field of ['sourceId', 'title', 'embedUrl', 'thumbnailUrl'] as const) {
    if (typeof game[field] !== 'string' || game[field].trim() === '') return `${field} is empty`;
  }
  if (!game.embedUrl.startsWith('https://')) return 'embedUrl must start with https://';
  if (!(game.width > 0) || !(game.height > 0)) return 'width and height must be positive numbers';
  return null;
}

function categorySlugs(file: string): Set<string> {
  const list = JSON.parse(readFileSync(file, 'utf8')) as { slug: string }[];
  return new Set(list.map((c) => c.slug));
}

// Slugs already used by earlier imports (any source) and by game pages in src/content/games.
function loadExisting(paths: ImportPaths): Pick<Context, 'taken' | 'reuse'> {
  const taken = new Set<string>();
  const reuse = new Map<string, string>();
  for (const source of SOURCE_KEYS) {
    const dir = join(paths.stagingDir, source);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const staged = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Partial<StagingGame>;
      if (!staged.slug) continue;
      taken.add(staged.slug);
      reuse.set(`${source}:${staged.sourceId}`, staged.slug);
    }
  }
  if (existsSync(paths.contentGamesDir)) {
    for (const file of readdirSync(paths.contentGamesDir).filter((f) => f.endsWith('.md'))) taken.add(file.replace(/\.md$/, ''));
  }
  return { taken, reuse };
}

function toStaging(planned: Planned): StagingGame {
  const { game, slug, categories, popularity } = planned;
  const developer = game.developer?.trim();
  const tags = [...new Set(game.tags.map((t) => t.trim().toLowerCase()).filter((t) => t !== ''))];
  return {
    slug,
    title: game.title.trim(),
    source: game.source,
    sourceId: game.sourceId,
    embedUrl: game.embedUrl,
    aspect: aspectFrom(game.width, game.height),
    width: game.width,
    height: game.height,
    mobile: game.mobile,
    categories,
    tags,
    ...(developer && developer.toLowerCase() !== 'unknown' ? { developer } : {}),
    ...(game.releaseDate ? { releaseDate: game.releaseDate } : {}),
    popularity: game.popularity ?? popularity,
    feedText: game.description,
  };
}

function recordFailure(ctx: Context, game: RawGame, reason: string, bucket: 'failed' | 'invalid'): void {
  ctx.report[bucket].push(`${label(game)}: ${reason}`);
  ctx.failedLines.push(`${game.source}\t${game.sourceId}\t${oneLine(game.title)}\t${oneLine(reason)}`);
  ctx.options.log?.(`skipped ${label(game)}: ${reason}`);
}

// Slugs, categories and popularity are decided in order before any download starts, so the same
// feed always gives the same result.
function plan(ctx: Context, games: RawGame[]): Planned[] {
  const unmapped: { source: RawGame['source']; category: string }[] = [];
  const planned = games.map((game, index): Planned => {
    const reused = ctx.reuse.get(`${game.source}:${game.sourceId}`);
    const slug = reused ?? uniqueSlug(slugify(game.title), ctx.taken);
    ctx.taken.add(slug);
    const mapped = mapCategories(game.source, game.providerCategories, ctx.categoryMap);
    for (const category of mapped.unmapped) unmapped.push({ source: game.source, category });
    if (mapped.slugs.length === 0) ctx.report.withoutCategory.push(label(game));
    return { game, slug, isNew: reused === undefined, categories: mapped.slugs, popularity: games.length - index };
  });
  appendUnmapped(join(ctx.paths.stagingDir, 'unmapped.txt'), unmapped);
  ctx.report.unmapped = [...new Set(unmapped.map((u) => `${u.source}: ${u.category}`))];
  return planned;
}

async function processOne(ctx: Context, planned: Planned): Promise<void> {
  const { game, slug } = planned;
  try {
    const picture = await ctx.options.fetchImage(game.thumbnailUrl);
    const images = await renderImages(picture, game.title, ctx.colours);
    writeImages(join(ctx.paths.thumbsDir, slug), images);
  } catch (error) {
    if (planned.isNew) ctx.taken.delete(slug);
    recordFailure(ctx, game, message(error), 'failed');
    return;
  }
  const dir = join(ctx.paths.stagingDir, game.source);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${slug}.json`), `${JSON.stringify(toStaging(planned), null, 2)}\n`);
  ctx.report.imported.push(slug);
  ctx.options.log?.(`imported ${slug}`);
}

async function mapLimit<T>(items: T[], limit: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) await work(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export async function normalizeGames(raw: RawGame[], paths: ImportPaths, options: ImportOptions): Promise<ImportReport> {
  const report: ImportReport = { imported: [], duplicates: [], failed: [], invalid: [], unmapped: [], withoutCategory: [] };
  mkdirSync(paths.stagingDir, { recursive: true });
  const ctx: Context = {
    paths,
    options,
    report,
    categoryMap: loadCategoryMap(paths.categoryMapJson, categorySlugs(paths.categoriesJson)),
    colours: readBrandColours(paths),
    failedLines: [],
    ...loadExisting(paths),
  };

  const valid = raw.filter((game) => {
    const reason = invalidReason(game);
    if (reason) recordFailure(ctx, game, `invalid entry: ${reason}`, 'invalid');
    return reason === null;
  });
  const { kept, dropped } = dedupeByTitle(valid, options.priority);
  for (const { game, keptSource, keptId } of dropped) {
    report.duplicates.push(`${label(game)} (kept ${keptSource}:${keptId})`);
    options.log?.(`duplicate ${label(game)}, kept ${keptSource}:${keptId}`);
  }

  await mapLimit(plan(ctx, kept), options.concurrency ?? DEFAULT_CONCURRENCY, (planned) => processOne(ctx, planned));
  report.imported.sort();
  appendNewLines(join(paths.stagingDir, 'failed.txt'), ctx.failedLines);
  return report;
}
