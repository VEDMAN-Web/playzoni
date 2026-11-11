// Content edits from the admin (docs/ADMIN.md §2 "rebuild", §5.4, §5.5): turns a form change into new file text with
// the same checks as the build. Pure functions (no network): the GitHub commit or the outbox happens elsewhere.
import { parseFrontmatter, type FrontmatterValue } from '../../../scripts/validate/frontmatter';
import { bannedWordsIn, DESCRIPTION_RANGE } from '../../../scripts/validate/rules';
import { categorySchema } from '../../../src/lib/categories';
import { gameSchema } from '../../../src/lib/game-schema';
import { isObj } from './validate';

export const GAME_EDITABLE = ['title', 'categories', 'tags', 'controls', 'description', 'intro', 'faq', 'featured', 'popularity', 'status', 'previewVideo', 'screenshots'] as const;
export type GamePatch = Partial<Record<(typeof GAME_EDITABLE)[number], unknown>>;

export const CATEGORY_EDITABLE = ['name', 'h1', 'shortName', 'emoji', 'parent', 'navOrder', 'description', 'intro'] as const;
export type CategoryPatch = Partial<Record<(typeof CATEGORY_EDITABLE)[number], unknown>> & { position?: unknown; faq?: unknown; body?: unknown };

const DATE_KEY = /Date$/;
const quote = (v: string): string => JSON.stringify(v);

function scalar(key: string, v: FrontmatterValue): string {
  if (typeof v === 'string') return DATE_KEY.test(key) && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : quote(v);
  return String(v);
}

/** Writes frontmatter in the style of scripts/publish.ts (double-quoted strings, 2-space lists). */
export function serializeFrontmatter(data: Record<string, FrontmatterValue>, body: string): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
        continue;
      }
      lines.push(`${key}:`);
      for (const item of value) {
        if (isObj(item)) {
          Object.entries(item as Record<string, FrontmatterValue>).forEach(([k, v], i) => lines.push(`${i === 0 ? '  - ' : '    '}${k}: ${scalar(k, v)}`));
        } else lines.push(`  - ${scalar(key, item)}`);
      }
    } else if (isObj(value)) {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value as Record<string, FrontmatterValue>)) lines.push(`  ${k}: ${scalar(k, v)}`);
    } else {
      lines.push(`${key}: ${scalar(key, value)}`);
    }
  }
  lines.push('---', '');
  return `${lines.join('\n')}${body}`;
}

/** Keeps only the editable fields, with plain types. */
export function cleanGamePatch(input: unknown): GamePatch {
  const out: GamePatch = {};
  if (!isObj(input)) return out;
  for (const key of GAME_EDITABLE) if (key in input) out[key] = input[key];
  return out;
}

function issues(error: { issues: { path: PropertyKey[]; message: string }[] }): string[] {
  return error.issues.map((i) => `${i.path.map(String).join('.') || 'game'}: ${i.message}`);
}

/** Extra rules the build applies to published games (docs/SEO-PLAN.md §Content). */
export function publishProblems(data: Record<string, unknown>): string[] {
  if (data.status !== 'published') return [];
  const out: string[] = [];
  const description = String(data.description ?? '');
  if (description.length < DESCRIPTION_RANGE.min || description.length > DESCRIPTION_RANGE.max) {
    out.push(`description: must be ${DESCRIPTION_RANGE.min} to ${DESCRIPTION_RANGE.max} characters for a published game (now ${description.length})`);
  }
  if (!String(data.intro ?? '').trim()) out.push('intro: a published game needs an intro');
  const controls = (data.controls ?? {}) as { desktop?: string; mobile?: string };
  if (!controls.desktop?.trim() || !controls.mobile?.trim()) out.push('controls: a published game needs desktop and mobile controls');
  const faq = Array.isArray(data.faq) ? data.faq : [];
  if (faq.length < 2) out.push('faq: a published game needs at least 2 questions');
  const text = [data.title, description, data.intro, ...faq.map((f) => (isObj(f) ? `${String(f.q)} ${String(f.a)}` : ''))].join(' ');
  for (const word of bannedWordsIn(text)) out.push(`text: "${word}" is not allowed`);
  return out;
}

export interface EditResult {
  text: string;
  errors: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

/** Applies a patch to a game file (src/content/games/<slug>.md) and checks it like the build does. */
export function applyGamePatch(fileText: string, patch: GamePatch, today: string, categorySlugs: string[]): EditResult {
  const { data, body } = parseFrontmatter(fileText);
  const before: Record<string, unknown> = {};
  const merged: Record<string, FrontmatterValue> = { ...data };
  for (const [key, value] of Object.entries(patch)) {
    before[key] = data[key];
    if (value === null || value === undefined || (Array.isArray(value) && value.length === 0 && (key === 'screenshots'))) delete merged[key];
    else if (key === 'previewVideo' && value === '') delete merged[key];
    else merged[key] = value as FrontmatterValue;
  }
  merged.updatedDate = today;
  const errors: string[] = [];
  const parsed = gameSchema.safeParse(merged);
  if (!parsed.success) errors.push(...issues(parsed.error));
  if (Array.isArray(merged.categories)) {
    for (const c of merged.categories) if (!categorySlugs.includes(String(c))) errors.push(`categories: "${String(c)}" is not a category`);
  }
  errors.push(...publishProblems(merged));
  const after: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) after[key] = merged[key];
  return { text: errors.length ? '' : serializeFrontmatter(merged, body), errors, before, after };
}

/** Applies a patch to one category in data/categories.json (and optionally moves it to `position`). */
export function applyCategoryPatch(jsonText: string, slug: string, patch: CategoryPatch): EditResult {
  const list = JSON.parse(jsonText) as Record<string, unknown>[];
  const index = list.findIndex((c) => c.slug === slug);
  if (index === -1) return { text: '', errors: [`category "${slug}" does not exist`], before: {}, after: {} };
  const current = list[index];
  const next: Record<string, unknown> = { ...current };
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const key of CATEGORY_EDITABLE) {
    if (!(key in patch)) continue;
    before[key] = current[key];
    next[key] = patch[key] === '' && key === 'parent' ? null : patch[key];
    after[key] = next[key];
  }
  const errors: string[] = [];
  const parsed = categorySchema.safeParse(next);
  if (!parsed.success) errors.push(...issues(parsed.error));
  if (next.parent !== null && !list.some((c) => c.slug === next.parent)) errors.push(`parent: "${String(next.parent)}" is not a category`);
  if (next.parent === slug) errors.push('parent: a category cannot be its own parent');
  const out = [...list];
  out[index] = next;
  if (patch.position !== undefined) {
    const pos = Math.max(0, Math.min(out.length - 1, Math.round(Number(patch.position))));
    if (Number.isFinite(pos) && pos !== index) {
      before.position = index;
      after.position = pos;
      const [item] = out.splice(index, 1);
      out.splice(pos, 0, item);
    }
  }
  return { text: errors.length ? '' : `${JSON.stringify(out, null, 2)}\n`, errors, before, after };
}

/** New text for src/content/categories/<slug>.md (FAQ + page text). */
export function applyCategoryText(fileText: string | null, faq: unknown, body: unknown): EditResult {
  const parsed = fileText ? parseFrontmatter(fileText) : { data: {} as Record<string, FrontmatterValue>, body: '' };
  const errors: string[] = [];
  const list = Array.isArray(faq) ? faq : (parsed.data.faq ?? []);
  const items = (Array.isArray(list) ? list : []).filter(isObj).map((f) => ({ q: String(f.q ?? '').trim(), a: String(f.a ?? '').trim() }));
  if (items.length > 5) errors.push('faq: at most 5 questions');
  if (items.some((f) => !f.q || !f.a)) errors.push('faq: every question needs a question and an answer');
  const text = typeof body === 'string' ? body.replace(/\r\n/g, '\n') : parsed.body;
  for (const word of bannedWordsIn(`${text} ${items.map((f) => `${f.q} ${f.a}`).join(' ')}`)) errors.push(`text: "${word}" is not allowed`);
  const data = { ...parsed.data, faq: items as unknown as FrontmatterValue };
  return {
    text: errors.length ? '' : serializeFrontmatter(data, text.endsWith('\n') ? text : `${text}\n`),
    errors,
    before: { faq: parsed.data.faq ?? [], body: parsed.body },
    after: { faq: items, body: text },
  };
}
