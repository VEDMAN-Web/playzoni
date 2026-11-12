// GET /api/admin/banners (Analyst and up): banners. POST (Editor and up):
// { "action": "save", "banner": { id?, lang, text, link, starts_at, ends_at, pages, active } } or { "action": "delete", "id": 3 }.
// Instant (docs/ADMIN.md §5.14). Audited with before/after.
import { auditStatement } from '../_lib/audit';
import { guard } from '../_lib/auth';
import { fail, json, readJson } from '../_lib/http';
import type { PagesContext } from '../_lib/types';
import { day, int, isObj, str } from '../_lib/validate';

const PAGES = ['*', 'home', 'game', 'category', 'list'];

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'analyst');
  if (user instanceof Response) return user;
  const rows = (await context.env.DB.prepare('SELECT id, lang, text, link, starts_at, ends_at, pages, active FROM banners ORDER BY id DESC').all()).results;
  return json({ rows });
};

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'editor');
  if (user instanceof Response) return user;
  const body = await readJson(context.request);
  if (!isObj(body)) return fail(400, 'Send a JSON object.');
  const db = context.env.DB;
  if (body.action === 'delete') {
    const id = int(body.id, 1, 1e9);
    if (!id) return fail(400, 'Which banner?');
    const before = await db.prepare('SELECT * FROM banners WHERE id = ?').bind(id).first();
    await db.batch([db.prepare('DELETE FROM banners WHERE id = ?').bind(id), auditStatement(db, user.email, 'banner.delete', String(id), before, null)]);
    return json({ ok: true, message: 'Deleted.' });
  }
  const b = isObj(body.banner) ? body.banner : null;
  if (body.action !== 'save' || !b) return fail(400, 'Send { action: "save", banner }.');
  const problems: string[] = [];
  const text = (str(b.text, 140) ?? '').replace(/[–—]/g, ',');
  if (!text) problems.push('text: write the banner text (at most 140 characters)');
  const linkRaw = str(b.link, 300) ?? '';
  if (linkRaw && !/^(\/[^\s]*|https:\/\/[^\s]+)$/.test(linkRaw)) problems.push('link: start with / or https://');
  const lang = b.lang === '*' || (typeof b.lang === 'string' && /^[a-z]{2}$/.test(b.lang)) ? (b.lang as string) : '*';
  const starts = b.starts_at ? day(b.starts_at) : null;
  const ends = b.ends_at ? day(b.ends_at) : null;
  if (b.starts_at && !starts) problems.push('start: use a date');
  if (b.ends_at && !ends) problems.push('end: use a date');
  if (starts && ends && ends < starts) problems.push('end: must be on or after the start');
  const pages = (Array.isArray(b.pages) ? b.pages : String(b.pages ?? '*').split(',')).map((p) => String(p).trim()).filter((p) => PAGES.includes(p));
  if (problems.length) return json({ error: 'Please fix these first.', problems }, 422);
  const values = [lang, text, linkRaw || null, starts, ends, (pages.length ? pages : ['*']).join(','), b.active === false ? 0 : 1];
  const id = int(b.id, 1, 1e9);
  const before = id ? await db.prepare('SELECT * FROM banners WHERE id = ?').bind(id).first() : null;
  if (id && !before) return fail(404, 'That banner no longer exists.');
  if (id) {
    await db.prepare('UPDATE banners SET lang = ?, text = ?, link = ?, starts_at = ?, ends_at = ?, pages = ?, active = ? WHERE id = ?').bind(...values, id).run();
  } else {
    await db.prepare('INSERT INTO banners (lang, text, link, starts_at, ends_at, pages, active) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(...values).run();
  }
  const after = id ? await db.prepare('SELECT * FROM banners WHERE id = ?').bind(id).first() : await db.prepare('SELECT * FROM banners ORDER BY id DESC LIMIT 1').first();
  await auditStatement(db, user.email, id ? 'banner.edit' : 'banner.add', String((after as { id?: number } | null)?.id ?? ''), before, after).run();
  return json({ ok: true, message: 'Saved. The site shows it within about a minute.' });
};
