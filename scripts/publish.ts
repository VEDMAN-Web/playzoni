// npm run publish -- --slugs a,b [--date 2026-11-11] [--staging data/staging] [--games-dir src/content/games] [--public-thumbs public/thumbs]
// Copies staged games into src/content/games as status: draft, with empty text fields for a human to fill,
// and copies each game's images from <staging>/thumbs/<slug>/ into public/thumbs/<slug>/ (docs/TASKS.md T4.5, Q13).
// Never overwrites a game page or an image folder, and never publishes: a draft builds no page (docs/PRD.md §10).

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readStagingGames, thumbsDirFor, type StagedFile } from './import/staging';
import type { StagingGame } from './import/types';

const ROOT = join(import.meta.dirname, '..');

export interface PublishOptions {
  slugs: string[];
  stagingRoot: string;
  gamesDir: string;
  /** Receives public/thumbs/<slug>/ for published games. */
  publicThumbsRoot: string;
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

// The four images the import makes for every game (docs/SEO-PLAN.md §Technical).
export const IMAGE_FILES = ['s.webp', 'm.webp', 'l.webp', 'og.png'] as const;

function problemsFor(slug: string, matches: StagedFile[], options: PublishOptions): string | null {
  if (matches.length === 0) return `${slug}: not in staging (run an import first)`;
  if (matches.length > 1) return `${slug}: found in more than one staging folder (${matches.map((m) => m.file).join(', ')})`;
  const [{ game }] = matches;
  if (game.categories.length === 0) return `${slug}: no category could be mapped; fix data/category-map.json first`;
  if (existsSync(join(options.gamesDir, `${slug}.md`))) return `${slug}: a game page already exists (src/content/games/${slug}.md), not overwritten`;
  const source = join(thumbsDirFor(options.stagingRoot), slug);
  const missing = IMAGE_FILES.filter((f) => !existsSync(join(source, f)));
  if (missing.length > 0) return `${slug}: images missing in ${source} (${missing.join(', ')}); run the import again`;
  if (existsSync(join(options.publicThumbsRoot, slug))) return `${slug}: public/thumbs/${slug} already exists, not overwritten`;
  return null;
}

export function publishDrafts(options: PublishOptions): PublishResult {
  const staged = readStagingGames(options.stagingRoot, options.includeTestFolders);
  const written: string[] = [];
  const problems: string[] = [];
  mkdirSync(options.gamesDir, { recursive: true });
  for (const slug of [...new Set(options.slugs)]) {
    const matches = staged.filter((s) => s.game.slug === slug);
    const problem = problemsFor(slug, matches, options);
    if (problem) {
      problems.push(problem);
      continue;
    }
    const imageSource = join(thumbsDirFor(options.stagingRoot), slug);
    const imageTarget = join(options.publicThumbsRoot, slug);
    mkdirSync(imageTarget, { recursive: true });
    for (const file of IMAGE_FILES) copyFileSync(join(imageSource, file), join(imageTarget, file));
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
    publicThumbsRoot: resolve(ROOT, args['public-thumbs'] ?? join('public', 'thumbs')),
    date: args.date ?? todayIso(),
  });
  for (const slug of result.written) console.log(`draft written: src/content/games/${slug}.md, images in public/thumbs/${slug}/`);
  for (const problem of result.problems) console.error(`not written: ${problem}`);
  console.log(`publish: ${result.written.length} written, ${result.problems.length} not written`);
  if (result.problems.length > 0) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
