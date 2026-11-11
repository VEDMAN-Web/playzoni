// T10.17: the home feed pins through the real admin handler and the public config: roles, validation, audit, hero migration.
import { onRequestGet, onRequestPost } from '../../functions/api/admin/home-layout';
import { buildConfig } from '../../functions/api/_lib/config';
import { heroList, heroStatements } from '../../functions/api/_lib/flags';
import type { AdminUser } from '../../functions/api/_lib/auth';
import type { D1Database, PagesContext } from '../../functions/api/_lib/types';
import { expect, finish, same } from '../test-kit';
import { openDb } from './d1-shim';

const EDITOR: AdminUser = { email: 'editor@example.com', role: 'editor' };
const ANALYST: AdminUser = { email: 'analyst@example.com', role: 'analyst' };

function ctx(db: D1Database, user: AdminUser, body: unknown, method = 'POST', query = ''): PagesContext {
  const request = new Request(`https://playzoni.com/api/admin/home-layout${query}`, {
    method,
    headers: { origin: 'https://playzoni.com', 'content-type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
  return { request, env: { DB: db }, params: {}, data: { user }, next: async () => new Response(), waitUntil: () => undefined };
}
const post = async (db: D1Database, user: AdminUser, body: unknown): Promise<number> => (await onRequestPost(ctx(db, user, body))).status;
const read = async (db: D1Database, lang = '*'): Promise<{ hero: string[]; slots: { i: number; slug: string }[]; rows: unknown[] }> =>
  (await (await onRequestGet(ctx(db, EDITOR, null, 'GET', `?lang=${lang}`))).json()) as { hero: string[]; slots: { i: number; slug: string }[]; rows: unknown[] };

const db = openDb();

same(await post(db, ANALYST, { lang: '*', slots: [{ i: 3, slug: 'a' }] }), 403, 'analysts cannot pin games');
same(await post(db, EDITOR, { lang: '*', slots: [{ i: 14, slug: 'game-x' }, { i: 0, slug: 'game-y' }] }), 200, 'an editor pins two games');
same((await read(db)).slots, [{ i: 0, slug: 'game-y' }, { i: 14, slug: 'game-x' }], 'pins come back in slot order');

// The public site gets the pins per language, without anything about the team.
const cfg = await buildConfig(db, Date.parse('2026-11-12T12:00:00Z'));
same(cfg.slots['*'], [{ i: 0, slug: 'game-y' }, { i: 14, slug: 'game-x' }], 'the public config carries the pins');

// Bad pins are dropped: wrong slot numbers, bad slugs, a game twice, two games in one slot.
same(await post(db, EDITOR, { lang: '*', slots: [{ i: 2, slug: 'ok' }, { i: 2, slug: 'other' }, { i: 3, slug: 'ok' }, { i: -1, slug: 'neg' }, { i: 4, slug: 'Bad Slug' }] }), 200, 'bad pins do not break saving');
same((await read(db)).slots, [{ i: 2, slug: 'ok' }], 'only the first valid pin per slot and per game is kept');

// Languages are separate.
await post(db, EDITOR, { lang: 'pl', slots: [{ i: 5, slug: 'pl-game' }] });
same((await read(db, 'pl')).slots, [{ i: 5, slug: 'pl-game' }], 'a language has its own pins');
same((await read(db, '*')).slots, [{ i: 2, slug: 'ok' }], 'other languages are untouched');

// Hero migration: the old hero list is cleared when the screen saves pins (hero: []).
await db.batch(heroStatements(db, '*', ['h1', 'h2']));
same(await heroList(db, '*'), ['h1', 'h2'], 'an old hero list exists');
same(await post(db, EDITOR, { lang: '*', hero: [], slots: [{ i: 1, slug: 'h1' }, { i: 4, slug: 'h2' }] }), 200, 'the screen saves pins and clears the hero list');
same(await heroList(db, '*'), [], 'the hero list is empty after migration');
same((await read(db)).slots, [{ i: 1, slug: 'h1' }, { i: 4, slug: 'h2' }], 'the old hero games are now pins on the big slots');

// Saving rows only keeps the pins; "slots": [] clears them.
await post(db, EDITOR, { lang: '*', rows: [{ id: 'popular-games', active: true }] });
same((await read(db)).slots.length, 2, 'saving rows leaves the pins alone');
await post(db, EDITOR, { lang: '*', slots: [] });
same((await read(db)).slots, [], 'an empty list unpins everything');

// Every save is in the audit log with before and after.
const audit = (await db.prepare("SELECT before, after FROM audit_log WHERE action = 'home.layout' ORDER BY id DESC LIMIT 1").all<{ before: string; after: string }>()).results[0];
expect(JSON.parse(audit.before).slots.length === 2 && JSON.parse(audit.after).slots.length === 0, 'the last save is audited with before and after');

finish('test-home-feed');
