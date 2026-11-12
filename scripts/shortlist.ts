// npm run shortlist [--staging data/staging] [--out docs/seo-research/game-candidates.csv]
// Lists every staged game for the owner to pick the launch set (docs/TASKS.md T4.5).
// Mobile-ready games come first, then the provider's own popularity order. The volume column is
// left empty: the owner's SEO team fills it from Google Keyword Planner.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from './publish';
import { readStagingGames } from './import/staging';
import type { StagingGame } from './import/types';

const ROOT = join(import.meta.dirname, '..');
export const HEADER = ['slug', 'title', 'source', 'mobile', 'categories', 'providerRank', 'volume'];

// Quotes a value when it has a comma, quote or line break (RFC 4180).
export function csvCell(value: string | number | boolean): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// providerRank is the game's place among its own source's games (1 = most popular there).
export function rankWithinSource(games: StagingGame[]): Map<string, number> {
  const ranks = new Map<string, number>();
  const sources = [...new Set(games.map((g) => g.source))];
  for (const source of sources) {
    const ordered = games
      .filter((g) => g.source === source)
      .sort((a, b) => b.popularity - a.popularity || a.slug.localeCompare(b.slug));
    ordered.forEach((g, index) => ranks.set(`${g.source}:${g.slug}`, index + 1));
  }
  return ranks;
}

export function shortlistCsv(games: StagingGame[]): string {
  const ranks = rankWithinSource(games);
  const sorted = [...games].sort(
    (a, b) =>
      Number(b.mobile) - Number(a.mobile) ||
      (ranks.get(`${a.source}:${a.slug}`) ?? 0) - (ranks.get(`${b.source}:${b.slug}`) ?? 0) ||
      a.slug.localeCompare(b.slug),
  );
  const rows = sorted.map((g) =>
    [g.slug, g.title, g.source, g.mobile, g.categories.join('|'), ranks.get(`${g.source}:${g.slug}`) ?? 0, ''].map(csvCell).join(','),
  );
  return `${[HEADER.join(','), ...rows].join('\n')}\n`;
}

export function writeShortlist(stagingRoot: string, outFile: string): number {
  const games = readStagingGames(stagingRoot).map((s) => s.game);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, shortlistCsv(games));
  return games.length;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const count = writeShortlist(
    resolve(ROOT, args.staging ?? join('data', 'staging')),
    resolve(ROOT, args.out ?? join('docs', 'seo-research', 'game-candidates.csv')),
  );
  console.log(`shortlist: ${count} candidate(s) written`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
