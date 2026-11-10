// npm run publish -- --slugs a,b [--date 2026-11-11] [--staging data/staging] [--games-dir src/content/games]
// Copies staged games into src/content/games as status: draft, with empty text fields for a human to fill.
// Never overwrites a game page and never publishes: a draft builds no page (docs/PRD.md §10).

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readStagingGames, type StagedFile } from './import/staging';
import type { StagingGame } from './import/types';

const ROOT = join(import.meta.dirname, '..');

export interface PublishOptions {
  slugs: string[];
  stagingRoot: string;
  gamesDir: string;
  /** YYYY-MM-DD used for addedDate and updatedDate. */
  date: string;
  includeTestFolders?: boolean;
}

export interface PublishResult {
  written: string[];
  problems: string[];
}

// YAML double-quoted strings are JSON strings, so JSON.stringify gives a safe value.
const quote = (value: string): string => JSON.stringify(value);

export function draftMarkdown(game: StagingGame, date: string): string {
  const lines: string[] = [
    '---',
    `title: ${quote(game.title)}`,
    `slug: ${quote(game.slug)}`,
    `source: ${quote(game.source)}`,
    `sourceId: ${quote(game.sourceId)}`,
    `embedUrl: ${quote(game.embedUrl)}`,
    `aspect: ${quote(game.aspect)}`,
    `width: ${game.width}`,
    `height: ${game.height}`,
    `mobile: ${game.mobile}`,
    'categories:',
    ...game.categories.map((c) => `  - ${quote(c)}`),
    game.tags.length > 0 ? 'tags:' : 'tags: []',
    ...game.tags.map((t) => `  - ${quote(t)}`),
  ];
  if (game.developer) lines.push(`developer: ${quote(game.developer)}`);
  if (game.releaseDate) lines.push(`releaseDate: ${quote(game.releaseDate)}`);
  lines.push(
    `addedDate: ${date}`,
    `updatedDate: ${date}`,
    `description: ${quote('')}`,
    `intro: ${quote('')}`,
    'controls:',
    `  desktop: ${quote('')}`,
    `  mobile: ${quote('')}`,
    'featured: false',
    `popularity: ${game.popularity}`,
    'status: "draft"',
    'faq: []',
    '---',
    '',
    `## How to play ${game.title}`,
    '',
    '',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function problemsFor(slug: string, matches: StagedFile[], gamesDir: string): string | null {
  if (matches.length === 0) return `${slug}: not in staging (run an import first)`;
  if (matches.length > 1) return `${slug}: found in more than one staging folder (${matches.map((m) => m.file).join(', ')})`;
  const [{ game }] = matches;
  if (game.categories.length === 0) return `${slug}: no category could be mapped; fix data/category-map.json first`;
  if (existsSync(join(gamesDir, `${slug}.md`))) return `${slug}: a game page already exists (src/content/games/${slug}.md), not overwritten`;
  return null;
}

export function publishDrafts(options: PublishOptions): PublishResult {
  const staged = readStagingGames(options.stagingRoot, options.includeTestFolders);
  const written: string[] = [];
  const problems: string[] = [];
  mkdirSync(options.gamesDir, { recursive: true });
  for (const slug of [...new Set(options.slugs)]) {
    const matches = staged.filter((s) => s.game.slug === slug);
    const problem = problemsFor(slug, matches, options.gamesDir);
    if (problem) {
      problems.push(problem);
      continue;
    }
    writeFileSync(join(options.gamesDir, `${slug}.md`), draftMarkdown(matches[0].game, options.date), { flag: 'wx' });
    written.push(slug);
  }
  return { written, problems };
}

export function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    if (!name.startsWith('--')) throw new Error(`unexpected argument "${name}"`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${name} needs a value`);
    args[name.slice(2)] = value;
    i++;
  }
  return args;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const slugs = (args.slugs ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  if (slugs.length === 0) throw new Error('usage: npm run publish -- --slugs a,b');
  const result = publishDrafts({
    slugs,
    stagingRoot: resolve(ROOT, args.staging ?? join('data', 'staging')),
    gamesDir: resolve(ROOT, args['games-dir'] ?? join('src', 'content', 'games')),
    date: args.date ?? todayIso(),
  });
  for (const slug of result.written) console.log(`draft written: src/content/games/${slug}.md`);
  for (const problem of result.problems) console.error(`not written: ${problem}`);
  console.log(`publish: ${result.written.length} written, ${result.problems.length} not written`);
  if (result.problems.length > 0) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
