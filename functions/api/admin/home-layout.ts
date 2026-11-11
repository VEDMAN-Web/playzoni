// GET /api/admin/home-layout?lang=* (Analyst and up): hero order and rows for one language.
// POST (Editor and up): { "lang": "*", "hero": ["slug", ...], "rows": [{ "id": "popular-games", "active": true }, ...] }
// Instant (docs/ADMIN.md §5.6): the site reads it from /api/config. Audited with before/after.
import { auditStatement } from '../_lib/audit';
import { guard } from '../_lib/auth';
import { heroList, heroStatements } from '../_lib/flags';
import { fail, json, readJson } from '../_lib/http';
import type { D1Database, PagesContext } from '../_lib/types';
import { isObj, slug } from '../_lib/validate';

const langOf = (v: unknown): string | null => (v === '*' || (typeof v === 'string' && /^[a-z]{2}$/.test(v)) ? (v as string) : null);

async function rowsOf(db: D1Database, lang: string): Promise<{ id: string; active: boolean }[]> {
  const r = await db.prepare("SELECT ref, active FROM home_layout WHERE lang = ? AND item_type = 'row' ORDER BY position").bind(lang).all<{ ref: string; active: number }>();
  return r.results.map((x) => ({ id: x.ref, active: x.active === 1 }));
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'analyst');
  if (user instanceof Response) return user;
  const lang = langOf(new URL(context.request.url).searchParams.get('lang') ?? '*') ?? '*';
  const db = context.env.DB;
  return json({ lang, hero: await heroList(db, lang), rows: await rowsOf(db, lang) });
};

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'editor');
  if (user instanceof Response) return user;
  const body = await readJson(context.request);
  if (!isObj(body)) return fail(400, 'Send a JSON object.');
  const lang = langOf(body.lang);
  if (!lang) return fail(400, 'Choose a language.');
  const hero = Array.isArray(body.hero) ? [...new Set(body.hero.map(slug).filter((s): s is string => s !== null))].slice(0, 30) : null;
  const rows = Array.isArray(body.rows)
    ? body.rows.filter(isObj).map((r) => ({ id: slug(r.id), active: r.active !== false })).filter((r): r is { id: string; active: boolean } => r.id !== null).slice(0, 60)
    : null;
  if (!hero && !rows) return fail(400, 'Nothing to save.');
  const db = context.env.DB;
  const before = { hero: await heroList(db, lang), rows: await rowsOf(db, lang) };
  const statements = hero ? heroStatements(db, lang, hero) : [];
  if (rows) {
    statements.push(db.prepare("DELETE FROM home_layout WHERE lang = ? AND item_type = 'row'").bind(lang));
    rows.forEach((r, i) => statements.push(db.prepare("INSERT INTO home_layout (lang, item_type, ref, position, active) VALUES (?, 'row', ?, ?, ?)").bind(lang, r.id, i + 1, r.active ? 1 : 0)));
  }
  const after = { hero: hero ?? before.hero, rows: rows ?? before.rows };
  statements.push(auditStatement(db, user.email, 'home.layout', lang, before, after));
  await db.batch(statements);
  return json({ ok: true, message: 'Saved. The home page shows the new order within about a minute.' });
};
