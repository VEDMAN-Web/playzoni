// Content checks (docs/SEO-PLAN.md §Content "Validate checks"). Returns one line per problem:
// "<file>: <rule>: <detail>". Sample games are exempt from the QA-file, word-count and feed-overlap
// checks only (docs/TASKS.md T3.3).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { buildGameTitle } from '../../src/lib/seo';
import { qaProblems } from '../qa/schema';
import { parseFrontmatter, type FrontmatterValue } from './frontmatter';
import {
  CATEGORY_FAQ,
  CATEGORY_SECTIONS,
  CATEGORY_TEXT_WORDS,
  DESCRIPTION_RANGE,
  GAME_BODY_WORDS,
  GAME_FAQ,
  GAME_SECTIONS,
  INTRO_SENTENCES,
  TITLE_MAX,
  bannedWordsIn,
  countSentences,
  countWords,
  normalise,
  sharedRun,
} from './rules';

export interface ContentPaths {
  root: string; // shown paths are relative to this
  gamesDir: string;
  categoryTextDir: string;
  categoriesJson: string;
  qaDir: string;
  stagingDir: string;
}

const asString = (v: FrontmatterValue | undefined): string => (typeof v === 'string' ? v : '');
const asList = (v: FrontmatterValue | undefined): FrontmatterValue[] => (Array.isArray(v) ? v : []);
const asObject = (v: FrontmatterValue | undefined): Record<string, FrontmatterValue> =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};

function mdFiles(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => join(dir, f)) : [];
}

export function validateContent(paths: ContentPaths): string[] {
  const errors: string[] = [];
  const add = (file: string, rule: string, detail: string): void => {
    errors.push(`${relative(paths.root, file).split(sep).join('/')}: ${rule}: ${detail}`);
  };
  const seenDescriptions = new Map<string, string>();
  const seenIntros = new Map<string, string>();
  const noteUnique = (file: string, kind: 'description' | 'intro', text: string): void => {
    const seen = kind === 'description' ? seenDescriptions : seenIntros;
    const key = normalise(text);
    if (key === '') return;
    const first = seen.get(key);
    if (first) add(file, `duplicate-${kind}`, `same ${kind} as ${relative(paths.root, first).split(sep).join('/')}`);
    else seen.set(key, file);
  };
  const checkRange = (file: string, rule: string, label: string, n: number, r: { min: number; max: number }): void => {
    if (n < r.min || n > r.max) add(file, rule, `${label} is ${n}, must be ${r.min}–${r.max}`);
  };
  const checkBanned = (file: string, text: string): void => {
    for (const word of bannedWordsIn(text)) add(file, 'banned-word', `"${word}" must not appear`);
  };

  // ---- categories.json ----
  const categorySlugs = new Set<string>();
  let categoryList: Record<string, FrontmatterValue>[] = [];
  try {
    categoryList = JSON.parse(readFileSync(paths.categoriesJson, 'utf8')) as Record<string, FrontmatterValue>[];
  } catch (error) {
    add(paths.categoriesJson, 'unreadable', String(error));
  }
  for (const c of categoryList) categorySlugs.add(asString(c.slug));
  for (const c of categoryList) {
    const slug = asString(c.slug);
    const file = paths.categoriesJson;
    checkRange(file, 'description-length', `${slug} description`, asString(c.description).length, DESCRIPTION_RANGE);
    if (asString(c.emoji) === '') add(file, 'missing-field', `${slug} has no emoji`);
    const parent = c.parent;
    if (typeof parent === 'string' && !categorySlugs.has(parent)) add(file, 'unknown-parent', `${slug} has parent "${parent}"`);
    noteUnique(file, 'description', asString(c.description));
    noteUnique(file, 'intro', asString(c.intro));
    checkBanned(file, `${asString(c.name)} ${asString(c.description)} ${asString(c.intro)}`);
  }

  // ---- games ----
  for (const file of mdFiles(paths.gamesDir)) {
    const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'));
    const slug = asString(data.slug);
    const fileSlug = file.split(sep).pop()!.replace(/\.md$/, '');
    const sample = data.sample === true;
    const published = data.status === 'published';
    if (slug !== fileSlug) add(file, 'slug-mismatch', `slug "${slug}" does not match the file name`);

    const categories = asList(data.categories).map(String);
    if (categories.length < 1 || categories.length > 4) add(file, 'categories-count', `has ${categories.length}, must be 1–4`);
    for (const c of categories) if (!categorySlugs.has(c)) add(file, 'unknown-category', `"${c}" is not in data/categories.json`);

    const description = asString(data.description);
    const intro = asString(data.intro);
    // Quick pages (owner, 11 Nov 2026) share a generated text pattern and are noindex, so they skip the duplicate,
    // FAQ, section, controls, play-mode, word-count, QA and feed checks. Title, description, intro and banned words still apply.
    const quick = data.quick === true;
    if (!quick) {
      noteUnique(file, 'description', description);
      noteUnique(file, 'intro', intro);
    }
    if (!published) continue; // drafts only get the structural checks above and the duplicate check

    const title = asString(data.title);
    if (buildGameTitle(title).length > TITLE_MAX) add(file, 'title-length', `page title is ${buildGameTitle(title).length}, max ${TITLE_MAX}`);
    checkRange(file, 'description-length', 'description', description.length, DESCRIPTION_RANGE);
    checkRange(file, 'intro-sentences', 'intro sentence count', countSentences(intro), INTRO_SENTENCES);
    const faq = asList(data.faq);
    const controls = asObject(data.controls);
    if (!quick) {
      checkRange(file, 'faq-count', 'FAQ item count', faq.length, GAME_FAQ);
      for (const section of GAME_SECTIONS) {
        if (!section.pattern.test(body)) add(file, 'missing-section', `body has no "${section.label}" heading`);
      }
      if (asString(controls.desktop).trim() === '') add(file, 'missing-field', 'controls.desktop is empty');
      if (asString(controls.mobile).trim() === '') add(file, 'missing-field', 'controls.mobile is empty');
    }
    const text = [title, description, intro, asString(controls.desktop), asString(controls.mobile), body]
      .concat(faq.map((f) => `${asString(asObject(f).q)} ${asString(asObject(f).a)}`))
      .join('\n');
    checkBanned(file, text);

    if (sample || quick) continue; // samples and quick pages skip the QA, word-count, play-mode and feed-overlap checks

    // T5.1b: 2-player and multiplayer categories must match the tested play modes.
    const modes = asObject(data.playModes);
    const hasModes = data.playModes !== undefined;
    const twoPlayerOk = modes.localTwoPlayer === true || modes.inviteLink === true;
    const onlineOk = modes.onlineMultiplayer === true;
    if (categories.includes('two-player-games') && !twoPlayerOk) {
      add(file, 'play-mode-category', hasModes ? 'in two-player-games but playModes has no local 2-player or invite link' : 'in two-player-games but has no playModes');
    }
    for (const c of ['multiplayer-games', 'io-games']) {
      if (categories.includes(c) && !onlineOk) {
        add(file, 'play-mode-category', hasModes ? `in ${c} but playModes.onlineMultiplayer is not true` : `in ${c} but has no playModes`);
      }
    }

    checkRange(file, 'word-count', 'body word count', countWords(body), GAME_BODY_WORDS);
    const qaFile = join(paths.qaDir, `${slug}.json`);
    if (!existsSync(qaFile)) {
      add(file, 'qa-missing', `no play-test file data/qa/${slug}.json`);
    } else {
      try {
        const qa = JSON.parse(readFileSync(qaFile, 'utf8')) as Record<string, unknown>;
        const problems = qaProblems(qa);
        for (const problem of problems) add(qaFile, 'qa-fields', problem);
        if (problems.length === 0 && qa.verdict !== 'publish') add(qaFile, 'qa-verdict', `verdict is "${String(qa.verdict)}"; a game can only be published with "publish"`);
      } catch {
        add(qaFile, 'qa-invalid', 'not valid JSON');
      }
    }
    if (existsSync(paths.stagingDir)) {
      for (const source of readdirSync(paths.stagingDir)) {
        const staged = join(paths.stagingDir, source, `${slug}.json`);
        if (!existsSync(staged)) continue;
        const feedText = asString((JSON.parse(readFileSync(staged, 'utf8')) as Record<string, FrontmatterValue>).feedText);
        const run = sharedRun(`${description} ${intro} ${body} ${text}`, feedText);
        if (run) add(file, 'feed-overlap', `8 words copied from the provider text: "${run}"`);
      }
    }
  }

  // ---- category texts ----
  for (const file of mdFiles(paths.categoryTextDir)) {
    const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'));
    const slug = file.split(sep).pop()!.replace(/\.md$/, '');
    if (!categorySlugs.has(slug)) add(file, 'unknown-category', `"${slug}" is not in data/categories.json`);
    for (const section of CATEGORY_SECTIONS) {
      if (!section.pattern.test(body)) add(file, 'missing-section', `text has no "${section.label}" heading`);
    }
    checkRange(file, 'word-count', 'text word count', countWords(body), CATEGORY_TEXT_WORDS);
    const faq = asList(data.faq);
    checkRange(file, 'faq-count', 'FAQ item count', faq.length, CATEGORY_FAQ);
    checkBanned(file, `${body}\n${faq.map((f) => `${asString(asObject(f).q)} ${asString(asObject(f).a)}`).join('\n')}`);
  }

  return errors;
}
