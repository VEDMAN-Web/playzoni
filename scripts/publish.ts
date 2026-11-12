// npm run publish -- --slugs a,b | --file data/launch-list.csv [--quick true] [--date 2026-11-11] [--staging data/staging] [--games-dir src/content/games] [--public-thumbs public/thumbs]
// --file reads the `slug` column of a CSV. A slug that is not in staging is logged and skipped (T4.6).
// Copies staged games into src/content/games as status: draft, with empty text fields for a human to fill,
// and copies each game's images from <staging>/thumbs/<slug>/ into public/thumbs/<slug>/ (docs/TASKS.md T4.5, Q13).
// Never overwrites a game page or an image folder, and never publishes: a draft builds no page (docs/PRD.md §10).
// --quick true (owner, 11 Nov 2026): writes the page as published with `quick: true` and a short generated text instead of
// empty fields. Quick pages are live for players and noindex until real text replaces them (src/content.config.ts).

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from './import/args';
import { columnValues } from './import/csv';
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
  /** Category slug -> display name; when set, pages are written as quick published pages. */
  quickNames?: Record<string, string>;
}

export interface PublishResult {
  written: string[];
  /** Slugs not in staging: logged and skipped, not an error. */
  skipped: string[];
  problems: string[];
}

// YAML double-quoted strings are JSON strings, so JSON.stringify gives a safe value.
const quote = (value: string): string => JSON.stringify(value);

// "Car Games" -> "car game", "IO Games" -> "IO game": the kind of game, used in the generated quick text.
export function gameKind(categoryName: string): string {
  const words = categoryName.replace(/\s*Games?$/i, '').split(' ');
  return `${words.map((w) => (w === w.toUpperCase() ? w : w.toLowerCase())).join(' ')} game`.trim();
}

// Short honest text for a quick page: no claims beyond what every game on the site has. The description takes the
// first option that fits 120 to 155 characters.
export function quickText(title: string, kind: string): { description: string; intro: string; body: string } {
  const a = /^[aeiou]/i.test(kind) ? 'an' : 'a';
  const options = [
    `Play ${title} free online at Playzoni. ${a[0].toUpperCase()}${a.slice(1)} ${kind} you can play in your browser on phone, tablet or computer, with no download.`,
    `Play ${title} free online at Playzoni. ${a[0].toUpperCase()}${a.slice(1)} ${kind} that runs in your browser on any device, no download needed.`,
    `Play ${title} free at Playzoni, ${a} ${kind} in your browser, no download.`,
  ];
  const description = options.find((d) => d.length >= 120 && d.length <= 155) ?? options[options.length - 1];
  return {
    description,
    intro: `This is a free ${kind} you can play right here in your browser. It works on phones, tablets and computers, with no download and no sign-up.`,
    body: `Press Play to start. The game shows its own controls on the first screen, so follow them to learn how to move, score and win.`,
  };
}

export function draftMarkdown(game: StagingGame, date: string, quickNames?: Record<string, string>): string {
  const quick = quickNames ? quickText(game.title, gameKind(quickNames[game.categories[0]] ?? 'Games')) : null;
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
    `description: ${quote(quick?.description ?? '')}`,
    `intro: ${quote(quick?.intro ?? '')}`,
    'controls:',
    `  desktop: ${quote(quick ? 'Shown on the first screen of the game.' : '')}`,
    `  mobile: ${quote(quick ? 'Shown on the first screen of the game.' : '')}`,
    'featured: false',
    `popularity: ${game.popularity}`,
    quick ? 'status: "published"' : 'status: "draft"',
    ...(quick ? ['quick: true'] : []),
    'faq: []',
    '---',
    '',
    `## How to play ${game.title}`,
    '',
    quick?.body ?? '',
    '',
  );
  return `${lines.join('\n')}\n`;
}

const NOT_STAGED = 'not in staging (run an import first)';

// The four images the import makes for every game (docs/SEO-PLAN.md §Technical).
export const IMAGE_FILES = ['s.webp', 'm.webp', 'l.webp', 'og.jpg'] as const;

function problemsFor(slug: string, matches: StagedFile[], options: PublishOptions): string | null {
  if (matches.length === 0) return `${slug}: ${NOT_STAGED}`;
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
  const skipped: string[] = [];
  const problems: string[] = [];
  mkdirSync(options.gamesDir, { recursive: true });
  for (const slug of [...new Set(options.slugs)]) {
    const matches = staged.filter((s) => s.game.slug === slug);
    const problem = problemsFor(slug, matches, options);
    if (problem?.endsWith(NOT_STAGED)) {
      skipped.push(`${slug}: not in staging`);
      continue;
    }
    if (problem) {
      problems.push(problem);
      continue;
    }
    const imageSource = join(thumbsDirFor(options.stagingRoot), slug);
    const imageTarget = join(options.publicThumbsRoot, slug);
    mkdirSync(imageTarget, { recursive: true });
    for (const file of IMAGE_FILES) copyFileSync(join(imageSource, file), join(imageTarget, file));
    writeFileSync(join(options.gamesDir, `${slug}.md`), draftMarkdown(matches[0].game, options.date, options.quickNames), { flag: 'wx' });
    written.push(slug);
  }
  return { written, skipped, problems };
}

export { parseArgs };

const todayIso = (): string => new Date().toISOString().slice(0, 10);

function categoryNames(): Record<string, string> {
  const list = JSON.parse(readFileSync(join(ROOT, 'data', 'categories.json'), 'utf8')) as { slug: string; name: string }[];
  return Object.fromEntries(list.map((c) => [c.slug, c.name]));
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const fromFile = args.file ? columnValues(readFileSync(resolve(ROOT, args.file), 'utf8'), 'slug') : [];
  const slugs = [...(args.slugs ?? '').split(',').map((s) => s.trim()).filter((s) => s !== ''), ...fromFile];
  if (slugs.length === 0) throw new Error('usage: npm run publish -- --slugs a,b   or   --file data/launch-list.csv');
  const result = publishDrafts({
    slugs,
    stagingRoot: resolve(ROOT, args.staging ?? join('data', 'staging')),
    gamesDir: resolve(ROOT, args['games-dir'] ?? join('src', 'content', 'games')),
    publicThumbsRoot: resolve(ROOT, args['public-thumbs'] ?? join('public', 'thumbs')),
    date: args.date ?? todayIso(),
    quickNames: args.quick === 'true' ? categoryNames() : undefined,
  });
  for (const slug of result.written) console.log(`${args.quick === 'true' ? 'quick page' : 'draft'} written: src/content/games/${slug}.md, images in public/thumbs/${slug}/`);
  for (const line of result.skipped) console.log(`skipped: ${line}`);
  for (const problem of result.problems) console.error(`not written: ${problem}`);
  console.log(`publish: ${result.written.length} written, ${result.skipped.length} skipped (not in staging), ${result.problems.length} not written`);
  if (result.problems.length > 0) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
