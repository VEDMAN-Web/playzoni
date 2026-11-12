// Self-test for npm run publish and npm run shortlist (T4.5). Runs in temp folders; no repo files change.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFrontmatter } from './validate/frontmatter';
import { validateContent, type ContentPaths } from './validate/content';
import { draftMarkdown, IMAGE_FILES, parseArgs, publishDrafts } from './publish';
import { readStagingGames, thumbsDirFor } from './import/staging';
import { csvCell, shortlistCsv, writeShortlist, HEADER } from './shortlist';
import type { StagingGame } from './import/types';

const ROOT = join(import.meta.dirname, '..');
const failures: string[] = [];
const same = (actual: unknown, wanted: unknown, message: string): void => {
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures.push(`${message}: got ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`);
  }
};
const expect = (ok: boolean, message: string): void => {
  if (!ok) failures.push(message);
};

function staged(overrides: Partial<StagingGame>): StagingGame {
  return {
    slug: 'zorp-blaster', title: 'Zorp Blaster', source: 'gd', sourceId: 'z1',
    embedUrl: 'https://example.com/embed/z1', aspect: 'landscape', width: 1280, height: 720, mobile: true,
    categories: ['action-games', 'shooting-games'], tags: ['space', 'shooter'], developer: 'Fake Studio',
    releaseDate: '2024-03-02', popularity: 90, feedText: 'Raw text.', ...overrides,
  };
}

function writeStaged(stagingRoot: string, game: StagingGame): void {
  mkdirSync(join(stagingRoot, game.source), { recursive: true });
  writeFileSync(join(stagingRoot, game.source, `${game.slug}.json`), JSON.stringify(game, null, 2));
}

// Placeholder images in the staging folder, one bytes-per-file so the copy can be checked.
function writeImages(stagingRoot: string, slug: string): void {
  const dir = join(thumbsDirFor(stagingRoot), slug);
  mkdirSync(dir, { recursive: true });
  for (const file of IMAGE_FILES) writeFileSync(join(dir, file), `${slug}-${file}`);
}

function testPublish(tmp: string): void {
  const staging = join(tmp, 'staging');
  const games = join(tmp, 'games');
  const publicThumbs = join(tmp, 'public-thumbs');
  mkdirSync(games, { recursive: true });
  writeStaged(staging, staged({}));
  writeStaged(staging, staged({ slug: 'no-cats', title: 'No Cats', sourceId: 'n1', categories: [] }));
  writeStaged(staging, staged({ slug: 'exists-already', title: 'Exists', sourceId: 'e1' }));
  writeStaged(staging, staged({ slug: 'bare', title: 'Bare', sourceId: 'b1' }));
  writeStaged(staging, staged({ slug: 'exists-img', title: 'Exists Img', sourceId: 'i1' }));
  writeImages(staging, 'zorp-blaster');
  writeImages(staging, 'exists-img');
  mkdirSync(join(publicThumbs, 'exists-img'), { recursive: true });
  writeFileSync(join(games, 'exists-already.md'), '---\ntitle: "Old"\n---\n');
  mkdirSync(join(staging, '_sample'));
  writeStaged(join(staging, '_sample'), staged({ slug: 'test-only', title: 'Test Only', sourceId: 't1', source: 'own' }));

  const result = publishDrafts({ slugs: ['zorp-blaster', 'no-cats', 'exists-already', 'missing', 'test-only', 'bare', 'exists-img'], stagingRoot: staging, gamesDir: games, publicThumbsRoot: publicThumbs, date: '2026-11-11' });
  same(result.written, ['zorp-blaster'], 'only the clean game is written');
  expect(result.problems.some((p) => p.startsWith('no-cats: no category')), `no-category game is refused: ${result.problems.join(' | ')}`);
  expect(result.problems.some((p) => p.startsWith('exists-already: a game page already exists')), 'existing game page is not overwritten');
  expect(result.skipped.some((p) => p.startsWith('missing: not in staging')), 'an unknown slug is skipped and logged');
  expect(!result.problems.some((p) => p.startsWith('missing:')), 'an unknown slug is not an error');
  expect(result.problems.some((p) => p.startsWith('bare: images missing') && p.includes('s.webp')), `a game with no images is refused: ${result.problems.join(' | ')}`);
  expect(result.problems.some((p) => p.startsWith('exists-img: public/thumbs/exists-img already exists')), 'an existing public image folder is not overwritten');
  expect(!existsSync(join(games, 'bare.md')) && !existsSync(join(publicThumbs, 'bare')), 'a refused game leaves no page and no images');
  expect(readFileSync(join(games, 'exists-already.md'), 'utf8').includes('"Old"'), 'the existing page is unchanged');

  for (const file of IMAGE_FILES) same(readFileSync(join(publicThumbs, 'zorp-blaster', file), 'utf8'), `zorp-blaster-${file}`, `image ${file} copied to public/thumbs`);
  const again = publishDrafts({ slugs: ['zorp-blaster'], stagingRoot: staging, gamesDir: games, publicThumbsRoot: publicThumbs, date: '2026-11-11' });
  same(again.written, [], 'publishing the same slug twice writes nothing the second time');

  const markdown = readFileSync(join(games, 'zorp-blaster.md'), 'utf8');
  const { data, body } = parseFrontmatter(markdown);
  same([data.title, data.slug, data.source, data.status, data.featured, data.popularity], ['Zorp Blaster', 'zorp-blaster', 'gd', 'draft', false, 90], 'draft fields');
  same(data.categories, ['action-games', 'shooting-games'], 'draft categories');
  same(data.tags, ['space', 'shooter'], 'draft tags');
  same([data.addedDate, data.updatedDate, data.releaseDate, data.developer], ['2026-11-11', '2026-11-11', '2024-03-02', 'Fake Studio'], 'draft dates and developer');
  same([data.description, data.intro, data.controls, data.faq], ['', '', { desktop: '', mobile: '' }, []], 'text fields are empty');
  expect(body.includes('## How to play Zorp Blaster'), 'draft body has the How to play heading');

  // The draft passes the content validator; the same game marked published fails until its text is written.
  const paths: ContentPaths = {
    root: tmp, gamesDir: games, categoryTextDir: join(tmp, 'no-text'), categoriesJson: join(ROOT, 'data', 'categories.json'),
    qaDir: join(tmp, 'qa'), stagingDir: join(tmp, 'no-staging'),
  };
  const draftErrors = validateContent(paths).filter((e) => e.startsWith('games/zorp-blaster.md'));
  same(draftErrors, [], 'a draft passes the content validator');
  writeFileSync(join(games, 'zorp-blaster.md'), markdown.replace('status: "draft"', 'status: "published"'));
  const publishedErrors = validateContent(paths).filter((e) => e.startsWith('games/zorp-blaster.md')).join(' | ');
  expect(publishedErrors.includes('description-length') && publishedErrors.includes('intro-sentences') && publishedErrors.includes('controls.desktop'), `a published empty game is caught: ${publishedErrors}`);

  // --quick true (owner, 11 Nov 2026): published, quick, generated text that passes the validator without a QA file.
  const zorp = readStagingGames(staging).find((s) => s.game.slug === 'zorp-blaster');
  if (zorp) {
    const quickMd = draftMarkdown(zorp.game, '2026-11-11', { 'action-games': 'Action Games' });
    const q = parseFrontmatter(quickMd).data;
    same([q.status, q.quick], ['published', true], 'quick page is published and flagged');
    expect(String(q.description).length >= 120 && String(q.description).length <= 155, `quick description fits 120 to 155: ${String(q.description)}`);
    writeFileSync(join(games, 'zorp-blaster.md'), quickMd);
    const quickErrors = validateContent(paths).filter((e) => e.startsWith('games/zorp-blaster.md'));
    same(quickErrors, [], 'a quick page passes the content validator without a QA file');
  } else {
    expect(false, 'staging fixture zorp-blaster not found for the quick test');
  }
}

function testStagingReader(tmp: string): void {
  const staging = join(tmp, 'reader');
  writeStaged(staging, staged({ slug: 'a-game' }));
  mkdirSync(join(staging, '_sample'), { recursive: true });
  writeFileSync(join(staging, '_sample', 'hidden.json'), JSON.stringify(staged({ slug: 'hidden', source: 'own' })));
  same(readStagingGames(staging).map((s) => s.game.slug), ['a-game'], 'reader skips _ folders');
  same(readStagingGames(staging, true).map((s) => s.game.slug).sort(), ['a-game', 'hidden'], 'reader includes _ folders when asked');
  same(readStagingGames(join(tmp, 'nothing-here')), [], 'a missing staging folder is empty, not an error');
}

function testShortlist(tmp: string): void {
  same(csvCell('plain'), 'plain', 'csvCell leaves plain text alone');
  same(csvCell('Fish, Chips'), '"Fish, Chips"', 'csvCell quotes commas');
  same(csvCell('say "hi"'), '"say ""hi"""', 'csvCell doubles quotes');
  const games = [
    staged({ slug: 'x-desktop', title: 'Desktop Only', mobile: false, popularity: 100 }),
    staged({ slug: 'z-phone', title: 'Phone, Ready', mobile: true, popularity: 80 }),
    staged({ slug: 'y-other', title: 'Other Phone', source: 'gm', sourceId: 'y1', mobile: true, popularity: 50 }),
  ];
  const lines = shortlistCsv(games).trim().split('\n');
  same(lines[0], HEADER.join(','), 'shortlist header');
  same(lines.map((l) => l.split(',')[0]), ['slug', 'y-other', 'z-phone', 'x-desktop'], 'mobile first, then provider rank');
  expect(lines[2].startsWith('z-phone,"Phone, Ready",gd,true,action-games|shooting-games,2,'), `shortlist row for z-phone: ${lines[2]}`);
  expect(lines[1].endsWith(',1,'), `y-other is rank 1 within gm: ${lines[1]}`);
  expect(lines.slice(1).every((l) => l.endsWith(',')), 'volume column is empty');

  const out = join(tmp, 'seo', 'game-candidates.csv');
  mkdirSync(join(tmp, 'staging-for-csv'), { recursive: true });
  writeStaged(join(tmp, 'staging-for-csv'), games[0]);
  same(writeShortlist(join(tmp, 'staging-for-csv'), out), 1, 'writeShortlist counts games');
  same(readFileSync(out, 'utf8').trim().split('\n').length, 2, 'writeShortlist writes a header and one row');
  same(shortlistCsv([]).trim(), HEADER.join(','), 'an empty staging folder gives a header-only file');
}

function testArgsAndDraft(): void {
  same(parseArgs(['--slugs', 'a,b', '--date', '2026-01-02']), { slugs: 'a,b', date: '2026-01-02' }, 'parseArgs reads pairs');
  let threw = false;
  try {
    parseArgs(['--slugs']);
  } catch {
    threw = true;
  }
  expect(threw, 'parseArgs rejects a flag with no value');
  const md = draftMarkdown(staged({ tags: [], developer: undefined, releaseDate: undefined }), '2026-11-11');
  expect(md.includes('tags: []') && !md.includes('developer:') && !md.includes('releaseDate:'), 'empty tags, no developer or release date, when they are missing');
  same(parseFrontmatter(md).data.tags, [], 'an empty tags list reads back as an empty list');
}

function main(): void {
  const tmp = mkdtempSync(join(tmpdir(), 'playzoni-publish-test-'));
  try {
    testPublish(join(tmp, 'p'));
    testStagingReader(join(tmp, 'r'));
    testShortlist(join(tmp, 's'));
    testArgsAndDraft();
  } finally {
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  if (failures.length > 0) {
    for (const failure of failures) console.error(`test-publish: FAIL: ${failure}`);
    process.exit(1);
  }
  console.log('test-publish: ok');
}

main();
