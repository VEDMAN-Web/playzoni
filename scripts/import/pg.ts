// Playgama Partners adapter (docs/TASKS.md T4.4). Run: npm run import:pg
// --limit N keeps the first N games in the catalog's own ranking order (default 500, 0 = all).
// PG_FEED_URL (in .env) is the catalog: a web address, or the path of a saved catalog file such as
// data/playgama.json (git-ignored; it also holds the partner id inside each game address).
//
// What the catalog gives and what this adapter decides:
// - embedUrl: the catalog's own `gameURL` (it already carries the partner id). Only addresses on an allowed
//   frame domain (src/lib/providers.ts) are kept; a few games point at the developer's own site and are left out.
// - width and height: the catalog has none. Orientation decides: horizontal (alone or with vertical) is
//   landscape 800x450, the size of Playgama's own embed snippet; vertical only is portrait 450x800.
// - mobile: true when `mobileReady` lists Android or iOS.
// - picture: the square `icon`, asked at 600 px as WebP (without the Accept header the server sends the
//   original PNG, 0.7 MB to 2.5 MB each); the first picture is the fallback.
// - categories: the catalog's genres, in the catalog's order. No developer or release date in the catalog.
// - English only: games that list languages but none starting with "en" are left out.

import { pathToFileURL } from 'node:url';
import { PROVIDERS } from '../../src/lib/providers';
import { parseArgs, parseLimit } from './args';
import { readJsonSource } from './feed';
import { applyLimit, runImport, summaryLine } from './run';
import { decodeEntities, plainText } from './text';
import type { AdapterResult, RawGame, SkippedEntry } from './types';

const PG_HOSTS: readonly string[] = PROVIDERS.find((p) => p.key === 'pg')?.frameDomains ?? [];
export const PG_IMAGE_HEADERS = { accept: 'image/webp,image/*' };
export const PG_THUMB_WIDTH = 600;
const LANDSCAPE = { width: 800, height: 450 };
const PORTRAIT = { width: 450, height: 800 };
const IMPORT_CONCURRENCY = 6;

const text = (value: unknown): string => (typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '');
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

function httpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

// The square icon at 600 px; the first picture when a game has no icon.
export function thumbnailFor(images: string[]): string | null {
  const chosen = images.find((u) => /\/icon\//.test(u)) ?? images[0];
  const url = chosen ? httpsUrl(chosen) : null;
  if (!url) return null;
  url.searchParams.set('width', String(PG_THUMB_WIDTH));
  return url.toString();
}

function sizeFor(orientation: unknown): { width: number; height: number } | null {
  const o = (typeof orientation === 'object' && orientation !== null ? orientation : {}) as Record<string, unknown>;
  if (o.horizontal === true) return LANDSCAPE;
  if (o.vertical === true) return PORTRAIT;
  return null;
}

function mapHit(item: Record<string, unknown>): { game: RawGame } | { skip: SkippedEntry } {
  const sourceId = text(item.id).trim();
  const title = decodeEntities(text(item.title)).replace(/\s+/g, ' ').trim();
  const skip = (reason: string): { skip: SkippedEntry } => ({ skip: { sourceId, title, reason } });
  if (sourceId === '') return skip('no id');
  if (title === '') return skip('no title');
  const embed = httpsUrl(text(item.gameURL).trim());
  if (!embed) return skip('the game address (gameURL) is missing or not https');
  if (!PG_HOSTS.includes(embed.host)) return skip(`game address host "${embed.host}" is not an allowed frame domain (src/lib/providers.ts)`);
  const languages = strings(item.supportedLanguages);
  if (languages.length > 0 && !languages.some((l) => /^en/i.test(l))) return skip(`no English version (${languages.join(', ')})`);
  const size = sizeFor(item.screenOrientation);
  if (!size) return skip('the catalog gives no screen orientation');
  const thumbnailUrl = thumbnailFor(strings(item.images));
  if (!thumbnailUrl) return skip('no usable picture address');

  const mobileReady = strings(item.mobileReady);
  return {
    game: {
      source: 'pg',
      sourceId,
      title,
      description: [plainText(text(item.description)), plainText(text(item.howToPlayText))].filter((t) => t !== '').join('\n'),
      providerCategories: strings(item.genres).map((g) => g.trim()).filter((g) => g !== ''),
      tags: strings(item.tags).map((t) => t.trim()).filter((t) => t !== ''),
      thumbnailUrl,
      embedUrl: embed.toString(),
      width: size.width,
      height: size.height,
      mobile: mobileReady.includes('For Android') || mobileReady.includes('For IOS'),
    },
  };
}

function hitsOf(catalog: unknown): unknown[] {
  if (Array.isArray(catalog)) return catalog;
  const object = (typeof catalog === 'object' && catalog !== null ? catalog : {}) as Record<string, unknown>;
  if (Array.isArray(object.segments)) {
    return (object.segments as unknown[]).flatMap((s) => {
      const hits = (typeof s === 'object' && s !== null ? (s as Record<string, unknown>).hits : undefined) as unknown;
      return Array.isArray(hits) ? hits : [];
    });
  }
  if (Array.isArray(object.hits)) return object.hits;
  throw new Error('Playgama catalog: expected "segments" with "hits" (or a plain list of games)');
}

// The catalog lists games in its own ranking order, which becomes our default popularity order.
// A game listed in two segments counts once (the first place wins).
export function parsePgCatalog(catalog: unknown): AdapterResult {
  const games: RawGame[] = [];
  const skipped: SkippedEntry[] = [];
  const seen = new Set<string>();
  for (const item of hitsOf(catalog)) {
    if (typeof item !== 'object' || item === null) {
      skipped.push({ sourceId: '', title: '', reason: 'entry is not an object' });
      continue;
    }
    const mapped = mapHit(item as Record<string, unknown>);
    if ('skip' in mapped) {
      skipped.push(mapped.skip);
    } else if (!seen.has(mapped.game.sourceId)) {
      seen.add(mapped.game.sourceId);
      games.push(mapped.game);
    }
  }
  return { games, skipped };
}

async function main(): Promise<void> {
  const location = process.env.PG_FEED_URL;
  if (!location) throw new Error('PG_FEED_URL is not set. Copy .env.example to .env and fill it in.');
  const limit = parseLimit(parseArgs(process.argv.slice(2)).limit);
  const result = applyLimit(parsePgCatalog(await readJsonSource(location)), limit);
  console.log(`import:pg: catalog read, ${result.games.length} games${limit > 0 ? ` (limit ${limit}, --limit 0 = all)` : ''}, ${result.skipped.length} left out`);
  const report = await runImport({
    source: 'pg',
    result,
    fetchOptions: { headers: PG_IMAGE_HEADERS },
    concurrency: IMPORT_CONCURRENCY,
    log: console.log,
  });
  console.log(summaryLine('pg', result.skipped.length, report));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
