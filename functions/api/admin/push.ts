// GET /api/admin/push (Analyst and up): alerts and whether OneSignal is connected. POST (Owner):
// { "action": "schedule", "title", "body", "slug"?, "scheduled_at": ISO time } or { "action": "cancel", "id" }.
// Hard limit: 2 alerts in any 7 days (a third is refused). Sending happens through OneSignal once its keys exist (T9.9).
import { auditStatement } from '../_lib/audit';
import { guard } from '../_lib/auth';
import { fail, json, readJson } from '../_lib/http';
import { pushAllowed, WEEK_MS } from '../_lib/push';
import type { PagesContext } from '../_lib/types';
import { int, isObj, slug, str } from '../_lib/validate';

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'analyst');
  if (user instanceof Response) return user;
  const db = context.env.DB;
  const rows = (await db.prepare('SELECT id, title, body, slug, image, scheduled_at, status, created_by, created_at FROM push_messages ORDER BY scheduled_at DESC LIMIT 100').all()).results;
  const now = Date.now();
  const week = (await db.prepare("SELECT COUNT(*) AS n FROM push_messages WHERE status IN ('scheduled', 'sent') AND scheduled_at > ? AND scheduled_at <= ?").bind(now - WEEK_MS, now + WEEK_MS).first<{ n: number }>())?.n ?? 0;
  return json({ connected: Boolean(context.env.ONESIGNAL_APP_ID && context.env.ONESIGNAL_REST_API_KEY), subscribers: null, rows, near: week });
};

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'owner');
  if (user instanceof Response) return user;
  const body = await readJson(context.request);
  if (!isObj(body)) return fail(400, 'Send a JSON object.');
  const db = context.env.DB;
  if (body.action === 'cancel') {
    const id = int(body.id, 1, 1e9);
    const before = id ? await db.prepare('SELECT * FROM push_messages WHERE id = ?').bind(id).first() : null;
    if (!id || !before) return fail(404, 'No such alert.');
    await db.batch([
      db.prepare("UPDATE push_messages SET status = 'cancelled' WHERE id = ? AND status = 'scheduled'").bind(id),
      auditStatement(db, user.email, 'push.cancel', String(id), before, { ...before, status: 'cancelled' }),
    ]);
    return json({ ok: true, message: 'Cancelled.' });
  }
  if (body.action !== 'schedule') return fail(400, 'Unknown action.');
  const problems: string[] = [];
  const title = (str(body.title, 50) ?? '').replace(/[–—]/g, ',');
  const text = (str(body.body, 120) ?? '').replace(/[–—]/g, ',');
  const game = body.slug ? slug(body.slug) : null;
  const when = typeof body.scheduled_at === 'string' ? Date.parse(body.scheduled_at) : NaN;
  if (!title) problems.push('title: write a short title (at most 50 characters)');
  if (!text) problems.push('text: write the message (at most 120 characters)');
  if (body.slug && !game) problems.push('game: unknown game');
  if (!Number.isFinite(when)) problems.push('time: choose when to send it');
  else if (when < Date.now() - 60000) problems.push('time: choose a time in the future');
  if (problems.length) return json({ error: 'Please fix these first.', problems }, 422);
  const others = (await db.prepare("SELECT scheduled_at FROM push_messages WHERE status IN ('scheduled', 'sent') AND scheduled_at BETWEEN ? AND ?").bind(when - WEEK_MS, when + WEEK_MS).all<{ scheduled_at: number }>()).results.map((r) => r.scheduled_at);
  if (!pushAllowed(others, when)) return json({ error: 'Not sent: at most 2 alerts in any 7 days. Choose another day or cancel one.', problems: ['limit: 2 alerts per week'] }, 409);
  const image = game ? `/thumbs/${game}/push.jpg` : null;
  const now = Date.now();
  await db.prepare('INSERT INTO push_messages (title, body, slug, image, scheduled_at, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(title, text, game, image, when, 'scheduled', user.email, now).run();
  await auditStatement(db, user.email, 'push.schedule', title, null, { title, body: text, slug: game, scheduled_at: when }).run();
  const connected = Boolean(context.env.ONESIGNAL_APP_ID && context.env.ONESIGNAL_REST_API_KEY);
  return json({ ok: true, message: connected ? 'Scheduled.' : 'Scheduled. It is sent only after OneSignal is connected (task T9.9).' });
};
