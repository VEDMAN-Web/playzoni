// "Rebuild" changes (docs/ADMIN.md §2): game text, categories and search-synonym proposals. Each change is checked
// first. With the GitHub App connected it becomes a commit on `dev`; without it, it waits in the `outbox` table
// (shown as "will be committed when GitHub is connected") and is committed later from the admin.
import { applyCategoryPatch, applyCategoryText, applyGamePatch, serializeFrontmatter, type CategoryPatch, type EditResult, type GamePatch } from './content-edit';
import { getFile, githubReady, installationToken, putFile, repoOf, type Fetcher } from './github';
import type { Env } from './types';
import { dayOf } from './validate';
import type { FrontmatterValue } from '../../../scripts/validate/frontmatter';

export type Change =
  | { kind: 'game'; slug: string; patch: GamePatch }
  | { kind: 'category'; slug: string; patch: CategoryPatch }
  | { kind: 'synonym'; word: string; category: string };

export const gamePath = (slug: string): string => `src/content/games/${slug}.md`;
export const CATEGORIES_PATH = 'data/categories.json';
export const categoryTextPath = (slug: string): string => `src/content/categories/${slug}.md`;
export const SYNONYMS_PATH = 'data/admin-proposals/synonyms.json';

export class ChangeError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join('; '));
  }
}

const describe = (c: Change): string => (c.kind === 'synonym' ? `Admin: propose search word "${c.word}" -> ${c.category}` : `Admin: edit ${c.kind} ${c.slug}`);

/** Reads a build data file (/admin/data/*.json) through the static assets, for checks when GitHub is not connected. */
async function buildData<T>(env: Env, name: string): Promise<T | null> {
  if (!env.ASSETS) return null;
  try {
    const r = await env.ASSETS.fetch(new Request(`https://assets.local/admin/data/${name}.json`));
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

interface Files {
  read(path: string): Promise<string | null>;
}

/** Checks a change against the given files; returns the new file texts and the before/after for the audit log. */
export async function prepare(change: Change, files: Files, categorySlugs: string[], now = Date.now()): Promise<{ writes: { path: string; text: string }[]; result: EditResult }> {
  const today = dayOf(now);
  if (change.kind === 'game') {
    const text = await files.read(gamePath(change.slug));
    if (text === null) throw new ChangeError([`game "${change.slug}" was not found`]);
    const result = applyGamePatch(text, change.patch, today, categorySlugs);
    if (result.errors.length) throw new ChangeError(result.errors);
    return { writes: [{ path: gamePath(change.slug), text: result.text }], result };
  }
  if (change.kind === 'category') {
    const json = await files.read(CATEGORIES_PATH);
    if (json === null) throw new ChangeError(['data/categories.json was not found']);
    const { faq, body, ...rest } = change.patch;
    const result = applyCategoryPatch(json, change.slug, rest);
    const writes = result.errors.length ? [] : [{ path: CATEGORIES_PATH, text: result.text }];
    const errors = [...result.errors];
    if (faq !== undefined || body !== undefined) {
      const textResult = applyCategoryText(await files.read(categoryTextPath(change.slug)), faq, body);
      errors.push(...textResult.errors);
      Object.assign(result.before, textResult.before);
      Object.assign(result.after, textResult.after);
      if (!textResult.errors.length) writes.push({ path: categoryTextPath(change.slug), text: textResult.text });
    }
    if (errors.length) throw new ChangeError(errors);
    return { writes, result };
  }
  const word = change.word.trim().toLowerCase();
  const problems: string[] = [];
  if (!/^[a-z0-9][a-z0-9 ]{0,28}[a-z0-9]$/.test(word)) problems.push('word: 2 to 30 letters, digits or spaces');
  if (!categorySlugs.includes(change.category)) problems.push(`category: "${change.category}" is not a category`);
  if (problems.length) throw new ChangeError(problems);
  const current = await files.read(SYNONYMS_PATH);
  const list = current ? (JSON.parse(current) as unknown[]) : [];
  const entry = { word, category: change.category, proposed: today };
  return {
    writes: [{ path: SYNONYMS_PATH, text: `${JSON.stringify([...list, entry], null, 2)}\n` }],
    result: { text: '', errors: [], before: {}, after: entry },
  };
}

/** Files rebuilt from the build data, so a change can be checked before GitHub is connected. */
async function buildDataFiles(env: Env): Promise<{ files: Files; categorySlugs: string[] }> {
  const games = (await buildData<Record<string, unknown>[]>(env, 'games')) ?? [];
  const cats = (await buildData<Record<string, unknown>[]>(env, 'categories')) ?? [];
  const files: Files = {
    async read(path) {
      const game = path.match(/^src\/content\/games\/([a-z0-9-]+)\.md$/);
      if (game) {
        const g = games.find((x) => x.slug === game[1]);
        if (!g) return null;
        const data = JSON.parse(JSON.stringify(g)) as Record<string, FrontmatterValue>;
        delete data.qa;
        return serializeFrontmatter(data, '\n');
      }
      if (path === CATEGORIES_PATH) {
        const plain = cats.map((c) => {
          const o = { ...c };
          for (const k of ['body', 'faq', 'published', 'drafts']) delete o[k];
          return o;
        });
        return plain.length ? JSON.stringify(plain) : null;
      }
      const text = path.match(/^src\/content\/categories\/([a-z0-9-]+)\.md$/);
      if (text) {
        const c = cats.find((x) => x.slug === text[1]);
        return c ? serializeFrontmatter({ faq: (c.faq ?? []) as FrontmatterValue }, String(c.body ?? '')) : null;
      }
      return null;
    },
  };
  return { files, categorySlugs: cats.map((c) => String(c.slug)) };
}

export type Submitted = { status: 'committed'; commits: string[]; result: EditResult } | { status: 'queued'; result: EditResult };

/** Commits a change to `dev` with the GitHub App. Throws ChangeError for bad input, Error for GitHub trouble. */
export async function commitChange(env: Env, change: Change, fetcher: Fetcher = fetch, now = Date.now()): Promise<{ commits: string[]; result: EditResult }> {
  const token = await installationToken(env, fetcher);
  const repo = repoOf(env);
  const shas = new Map<string, string | null>();
  const files: Files = {
    async read(path) {
      const f = await getFile(token, repo, path, fetcher);
      shas.set(path, f?.sha ?? null);
      return f?.text ?? null;
    },
  };
  const cats = await files.read(CATEGORIES_PATH);
  const categorySlugs = cats ? (JSON.parse(cats) as { slug: string }[]).map((c) => c.slug) : [];
  const { writes, result } = await prepare(change, files, categorySlugs, now);
  const commits: string[] = [];
  for (const w of writes) {
    if (!shas.has(w.path)) await files.read(w.path);
    commits.push(await putFile(token, repo, w.path, w.text, shas.get(w.path) ?? null, describe(change), fetcher));
  }
  return { commits, result };
}

/** Checks the change; commits it when GitHub is connected, otherwise queues it in the outbox. */
export async function submitChange(env: Env, change: Change, email: string, fetcher: Fetcher = fetch, now = Date.now()): Promise<Submitted> {
  if (githubReady(env)) {
    const { commits, result } = await commitChange(env, change, fetcher, now);
    return { status: 'committed', commits, result };
  }
  const { files, categorySlugs } = await buildDataFiles(env);
  const { result } = await prepare(change, files, categorySlugs, now);
  const stamp = new Date(now).toISOString().replace(/[:.]/g, '-');
  await env.DB.prepare('INSERT INTO outbox (ts, email, kind, path, payload, status) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(now, email, change.kind, `data/admin-outbox/${stamp}.json`, JSON.stringify(change), 'pending')
    .run();
  return { status: 'queued', result };
}
