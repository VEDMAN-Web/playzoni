// npm run unmapped:report
// Writes docs/seo-research/unmapped-genres.md: provider genres and categories that our category list does
// not have yet, with the number of staged games that carry each one (R14). Nothing is mapped here: the
// planner fills data/category-map.json.
//
// Counts come from each staged game's own provider list. Playgama games also use the full catalog file
// (data/playgama.json), which holds every genre. GameMonetize games imported before the provider list was
// recorded have no list, so they are not counted until the next GameMonetize run.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCategoryMap, mapCategories } from './import/categories';
import { parsePgCatalog } from './import/pg';
import { REPO_ROOT } from './import/paths';
import { readStagingGames } from './import/staging';
import type { SourceKey } from './import/types';

const CATALOG = join(REPO_ROOT, 'data', 'playgama.json');
const STAGING = join(REPO_ROOT, 'data', 'staging');
const OUT = join(REPO_ROOT, 'docs', 'seo-research', 'unmapped-genres.md');
const PROVIDER_NAME: Record<string, string> = { pg: 'Playgama', gm: 'GameMonetize', gd: 'GameDistribution', gp: 'GamePix', own: 'Own' };

export interface UnmappedRow {
  source: SourceKey;
  genre: string;
  games: number;
}

export function unmappedRows(): UnmappedRow[] {
  const categories = JSON.parse(readFileSync(join(REPO_ROOT, 'data', 'categories.json'), 'utf8')) as { slug: string }[];
  const map = loadCategoryMap(join(REPO_ROOT, 'data', 'category-map.json'), new Set(categories.map((c) => c.slug)));
  const catalogGenres = new Map<string, string[]>();
  if (existsSync(CATALOG)) {
    for (const game of parsePgCatalog(JSON.parse(readFileSync(CATALOG, 'utf8'))).games) catalogGenres.set(game.sourceId, game.providerCategories);
  }
  const counts = new Map<string, UnmappedRow>();
  for (const { game } of readStagingGames(STAGING)) {
    const names = game.providerCategories ?? (game.source === 'pg' ? catalogGenres.get(game.sourceId) : undefined) ?? [];
    const unmapped = new Set(mapCategories(game.source, names, map).unmapped);
    for (const name of unmapped) {
      const key = `${game.source}\t${name.toLowerCase()}`;
      const row = counts.get(key) ?? { source: game.source, genre: name, games: 0 };
      row.games++;
      counts.set(key, row);
    }
  }
  return [...counts.values()].sort((a, b) => b.games - a.games || a.source.localeCompare(b.source) || a.genre.localeCompare(b.genre));
}

export function reportMarkdown(rows: UnmappedRow[], generated: string): string {
  const lines = [
    '# Unmapped provider genres',
    '',
    `Generated ${generated} by \`npm run unmapped:report\` from the staged games. The planner maps these in \`data/category-map.json\`.`,
    '',
    'Counts are staged games that carry the genre. GameMonetize games imported before the provider list was recorded are not counted until the next GameMonetize run.',
    '',
    '| provider | genre | number of staged games |',
    '| --- | --- | ---: |',
    ...rows.map((r) => `| ${PROVIDER_NAME[r.source] ?? r.source} | ${r.genre.replace(/\|/g, '\\|')} | ${r.games} |`),
    '',
  ];
  return lines.join('\n');
}

function main(): void {
  const rows = unmappedRows();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, reportMarkdown(rows, new Date().toISOString().slice(0, 10)));
  console.log(`unmapped:report: ${rows.length} unmapped genre(s) written to docs/seo-research/unmapped-genres.md`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
