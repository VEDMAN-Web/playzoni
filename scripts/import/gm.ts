// GameMonetize adapter (docs/TASKS.md T4.3). Run: npm run import:gm [-- --pages 3]
// GM_FEED_URL (in .env) is the JSON feed address, for example
//   https://gamemonetize.com/feed.php?format=0&num=50&page=1
// --pages N downloads pages 1..N by changing the `page` value in that address.
// --limit N keeps the first N games in the feed's order (default 500, 0 = all); paging stops once there are enough.
// The feed has no developer, release date or mobile flag. Mobile is true only when the game's own
// tags include "Mobile"; every other game stays false until the play test says otherwise.

import { pathToFileURL } from 'node:url';
import { PROVIDERS } from '../../src/lib/providers';
import { parseArgs, parseLimit } from './args';
import { isWebAddress, readJsonSource } from './feed';
import { applyLimit, runImport, summaryLine } from './run';
import { decodeEntities, plainText } from './text';
import type { AdapterResult, RawGame, SkippedEntry } from './types';

const GM_HOSTS: readonly string[] = PROVIDERS.find((p) => p.key === 'gm')?.frameDomains ?? [];
const MAX_PAGES = 200;

const text = (value: unknown): string => (typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '');

function httpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

// One feed entry -> a RawGame, or the reason it is left out.
function mapEntry(item: Record<string, unknown>): { game: RawGame } | { skip: SkippedEntry } {
  const sourceId = text(item.id).trim();
  const title = decodeEntities(text(item.title)).replace(/\s+/g, ' ').trim();
  const skip = (reason: string): { skip: SkippedEntry } => ({ skip: { sourceId, title, reason } });
  if (sourceId === '') return skip('no id');
  if (title === '') return skip('no title');
  const embed = httpsUrl(text(item.url).trim());
  if (!embed) return skip('the game address (url) is missing or not https');
  if (!GM_HOSTS.includes(embed.host)) return skip(`game address host "${embed.host}" is not an allowed frame domain (src/lib/providers.ts)`);
  const thumb = httpsUrl(text(item.thumb).trim());
  if (!thumb) return skip('the picture address (thumb) is missing or not https');
  const width = Number(text(item.width));
  const height = Number(text(item.height));
  if (!(width > 0) || !(height > 0)) return skip(`width "${text(item.width)}" and height "${text(item.height)}" are not positive numbers`);

  const tags = text(item.tags).split(',').map((t) => decodeEntities(t).trim()).filter((t) => t !== '');
  const category = decodeEntities(text(item.category)).trim();
  return {
    game: {
      source: 'gm',
      sourceId,
      title,
      description: [plainText(text(item.description)), plainText(text(item.instructions))].filter((t) => t !== '').join('\n'),
      providerCategories: category === '' ? [] : [category],
      tags,
      thumbnailUrl: thumb.toString(),
      embedUrl: embed.toString(),
      width,
      height,
      mobile: tags.some((t) => t.toLowerCase() === 'mobile'),
    },
  };
}

// A page of the feed is a list of games. The same id on two pages counts once.
export function parseGmFeed(feed: unknown): AdapterResult {
  if (!Array.isArray(feed)) throw new Error('GameMonetize feed: expected a list of games (is format=0 in the address?)');
  const games: RawGame[] = [];
  const skipped: SkippedEntry[] = [];
  const seen = new Set<string>();
  for (const item of feed as unknown[]) {
    if (typeof item !== 'object' || item === null) {
      skipped.push({ sourceId: '', title: '', reason: 'entry is not an object' });
      continue;
    }
    const mapped = mapEntry(item as Record<string, unknown>);
    if ('skip' in mapped) {
      skipped.push(mapped.skip);
    } else if (!seen.has(mapped.game.sourceId)) {
      seen.add(mapped.game.sourceId);
      games.push(mapped.game);
    }
  }
  return { games, skipped };
}

// The same address with page=N. Other parts of the address stay as they are.
export function pageAddress(address: string, page: number): string {
  const url = new URL(address);
  url.searchParams.set('page', String(page));
  return url.toString();
}

export async function loadGmGames(location: string, pages: number, limit = 0): Promise<AdapterResult> {
  const result: AdapterResult = { games: [], skipped: [] };
  const seen = new Set<string>();
  const last = isWebAddress(location) ? pages : 1; // a saved file is one page
  for (let page = 1; page <= last; page++) {
    if (limit > 0 && result.games.length >= limit) break; // enough games, do not ask for more pages
    const feed = await readJsonSource(isWebAddress(location) ? pageAddress(location, page) : location);
    if (Array.isArray(feed) && feed.length === 0) break; // past the last page
    const parsed = parseGmFeed(feed);
    for (const game of parsed.games) {
      if (!seen.has(game.sourceId)) {
        seen.add(game.sourceId);
        result.games.push(game);
      }
    }
    result.skipped.push(...parsed.skipped);
  }
  return result;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const location = process.env.GM_FEED_URL;
  if (!location) throw new Error('GM_FEED_URL is not set. Copy .env.example to .env and fill it in.');
  const pages = Number(args.pages ?? '1');
  if (!Number.isInteger(pages) || pages < 1 || pages > MAX_PAGES) throw new Error(`--pages must be a whole number from 1 to ${MAX_PAGES}`);
  const limit = parseLimit(args.limit);
  const result = applyLimit(await loadGmGames(location, pages, limit), limit);
  console.log(`import:gm: feed read, ${result.games.length} games${limit > 0 ? ` (limit ${limit}, --limit 0 = all)` : ''}, ${result.skipped.length} left out`);
  const report = await runImport({ source: 'gm', result, log: console.log });
  console.log(summaryLine('gm', result.skipped.length, report));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
