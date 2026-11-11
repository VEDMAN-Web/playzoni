// T10.8: admin content edits use the build's checks, keep files tidy, and become exactly one commit on `dev`
// (or wait in the outbox when GitHub is not connected).
import { generateKeyPairSync } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { commitChange, submitChange } from '../../functions/api/_lib/changes';
import { applyCategoryPatch, applyGamePatch, serializeFrontmatter } from '../../functions/api/_lib/content-edit';
import { pemToPkcs8 } from '../../functions/api/_lib/github';
import type { Env } from '../../functions/api/_lib/types';
import { parseFrontmatter } from '../validate/frontmatter';
import { expect, finish, same } from '../test-kit';
import { openDb } from './d1-shim';

const ROOT = join(import.meta.dirname, '..', '..');

// 1. The admin's copy of the games schema matches content.config.ts line for line.
const block = (text: string, start: string): string => {
  const a = text.indexOf(start);
  const b = text.indexOf('\n  }),', a) >= 0 && start.startsWith('  schema') ? text.indexOf('\n  }),', a) : text.indexOf('\n});', a);
  return text
    .slice(a + start.length, b)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
};
const config = readFileSync(join(ROOT, 'src', 'content.config.ts'), 'utf8');
const copy = readFileSync(join(ROOT, 'src', 'lib', 'game-schema.ts'), 'utf8');
const gamesPart = config.slice(config.indexOf('const games'));
same(block(copy, 'export const gameSchema = z.object({'), block(gamesPart, '  schema: z.object({'), 'src/lib/game-schema.ts matches the games schema in content.config.ts (copy the lines when the schema changes)');

// 2. Saving a game without changes only moves updatedDate.
const gamesDir = join(ROOT, 'src', 'content', 'games');
const file = readdirSync(gamesDir).find((f) => f.endsWith('.md')) as string;
const text = readFileSync(join(gamesDir, file), 'utf8');
const cats = (JSON.parse(readFileSync(join(ROOT, 'data', 'categories.json'), 'utf8')) as { slug: string }[]).map((c) => c.slug);
const same1 = applyGamePatch(text, {}, '2030-01-02', cats);
same(same1.errors, [], 'unchanged game passes the checks');
const diff = same1.text.split('\n').filter((line, i) => line !== text.split('\n')[i]);
same(diff, ['updatedDate: 2030-01-02'], 'only updatedDate changes');

// 3. Edits are checked like the build.
const original = parseFrontmatter(text).data;
const edit = applyGamePatch(text, { title: 'New title', tags: ['a', 'b'] }, '2030-01-02', cats);
same(edit.errors, [], 'valid edit');
same(parseFrontmatter(edit.text).data.title, 'New title', 'title changed');
same(edit.before.title, original.title, 'before value kept for the audit log');
expect(applyGamePatch(text, { description: 'x'.repeat(156) }, '2030-01-02', cats).errors.some((e) => e.startsWith('description')), 'description over 155 refused');
expect(applyGamePatch(text, { categories: ['not-a-category'] }, '2030-01-02', cats).errors.some((e) => e.includes('not a category')), 'unknown category refused');
expect(applyGamePatch(text, { categories: [] }, '2030-01-02', cats).errors.length > 0, 'no category refused');
expect(applyGamePatch(text, { status: 'published', description: '', intro: '' }, '2030-01-02', cats).errors.some((e) => e.includes('published game')), 'publishing an empty game refused');
expect(applyGamePatch(text, { title: 'Poki style game' }, '2030-01-02', cats).errors.length === 0, 'drafts are not checked for banned words');
expect(applyGamePatch(text, { faq: Array.from({ length: 6 }, () => ({ q: 'q', a: 'a' })) }, '2030-01-02', cats).errors.length > 0, 'more than 5 FAQ refused');

// 4. Categories.
const catsText = readFileSync(join(ROOT, 'data', 'categories.json'), 'utf8');
const moved = applyCategoryPatch(catsText, 'car-games', { shortName: 'Cars', position: 0 });
same(moved.errors, [], 'category edit ok');
const movedList = JSON.parse(moved.text) as { slug: string; shortName: string }[];
same([movedList[0].slug, movedList[0].shortName, movedList.length], ['car-games', 'Cars', cats.length], 'category renamed and moved first');
expect(applyCategoryPatch(catsText, 'car-games', { description: 'too short' }).errors.length > 0, 'category description length checked');
expect(applyCategoryPatch(catsText, 'car-games', { parent: 'nope' }).errors.length > 0, 'unknown parent refused');
same(applyCategoryPatch(catsText, 'car-games', {}).text, catsText, 'unchanged categories.json is byte-identical');

// 5. One commit on dev through the GitHub App (fake GitHub).
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs1', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
expect(pemToPkcs8(privateKey).length > 1000, 'PKCS#1 key wrapped');
const calls: { method: string; url: string; body?: Record<string, unknown> }[] = [];
const files: Record<string, string> = { [`src/content/games/${file}`]: text, 'data/categories.json': catsText };
const fakeGitHub = async (url: string, init?: RequestInit): Promise<Response> => {
  const method = init?.method ?? 'GET';
  const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
  calls.push({ method, url, body });
  if (url.includes('/access_tokens')) return Response.json({ token: 'test-token' });
  const path = decodeURIComponent(url.split('/contents/')[1]?.split('?')[0] ?? '');
  if (method === 'GET') return files[path] ? Response.json({ content: Buffer.from(files[path]).toString('base64'), sha: 'sha-1' }) : new Response('', { status: 404 });
  return Response.json({ commit: { sha: 'abc123' } });
};
const env: Env = { DB: openDb(), GITHUB_APP_ID: '1', GITHUB_APP_INSTALLATION_ID: '2', GITHUB_APP_PRIVATE_KEY: privateKey };
const slug = file.replace(/\.md$/, '');
const done = await commitChange(env, { kind: 'game', slug, patch: { title: 'Edited in admin' } }, fakeGitHub);
const puts = calls.filter((c) => c.method === 'PUT');
same(puts.length, 1, 'one game edit = one commit');
same(puts[0]?.body?.branch, 'dev', 'commit goes to dev');
expect(!calls.some((c) => JSON.stringify(c).includes('"main"')), 'never main');
same(done.commits, ['abc123'], 'commit sha returned');
const committed = Buffer.from(String(puts[0]?.body?.content), 'base64').toString('utf8');
same(parseFrontmatter(committed).data.title, 'Edited in admin', 'committed file has the edit');
expect(String(calls[0].url).endsWith('/app/installations/2/access_tokens'), 'installation token requested');

// 6. Without GitHub: checked against the build data and queued in the outbox.
const gameData = { ...original, qa: 'none' };
const assets = { fetch: async (input: Request | string): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.url;
  if (url.endsWith('/admin/data/games.json')) return Response.json([gameData]);
  if (url.endsWith('/admin/data/categories.json')) return Response.json(JSON.parse(catsText));
  return new Response('', { status: 404 });
} };
const env2: Env = { DB: openDb(), ASSETS: assets };
const queued = await submitChange(env2, { kind: 'game', slug, patch: { title: 'Queued title' } }, 'ed@example.com');
same(queued.status, 'queued', 'queued without GitHub');
const row = await env2.DB.prepare('SELECT kind, path, status, email FROM outbox').first<Record<string, string>>();
same([row?.kind, row?.status, row?.email, /^data\/admin-outbox\/.+\.json$/.test(row?.path ?? '')], ['game', 'pending', 'ed@example.com', true], 'outbox row');
let refused = false;
try {
  await submitChange(env2, { kind: 'game', slug, patch: { description: 'y'.repeat(200) } }, 'ed@example.com');
} catch {
  refused = true;
}
expect(refused, 'bad edit refused even without GitHub');
const syn = await submitChange(env2, { kind: 'synonym', word: 'Cars', category: 'car-games' }, 'ed@example.com');
same(syn.result.after, { word: 'cars', category: 'car-games', proposed: new Date().toISOString().slice(0, 10) }, 'synonym proposal checked and queued');

// serializeFrontmatter writes lists of objects like the import does.
same(serializeFrontmatter({ faq: [{ q: 'A?', a: 'B.' }] }, ''), '---\nfaq:\n  - q: "A?"\n    a: "B."\n---\n', 'faq shape');
finish('test-content-edit');
