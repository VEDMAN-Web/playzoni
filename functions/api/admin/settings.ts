// GET /api/admin/settings (Analyst and up): every instant setting. POST: { "key": "...", "value": {...} }. Feature
// flags, measurement, retention, languages and ads need the Owner; notice and maintenance need an Editor. Audited.
import { auditStatement } from '../_lib/audit';
import { guard, roleAllows } from '../_lib/auth';
import { fail, json, readJson } from '../_lib/http';
import { readSetting, readSettings, SETTINGS } from '../_lib/settings';
import type { PagesContext } from '../_lib/types';
import { isObj } from '../_lib/validate';

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'analyst');
  if (user instanceof Response) return user;
  const values = await readSettings(context.env.DB);
  const specs = Object.fromEntries(Object.entries(SETTINGS).map(([k, s]) => [k, { label: s.label, role: s.role }]));
  return json({ values, specs, role: user.role });
};

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'editor');
  if (user instanceof Response) return user;
  const body = await readJson(context.request);
  const key = isObj(body) && typeof body.key === 'string' ? body.key : '';
  const spec = SETTINGS[key];
  if (!spec || !isObj(body)) return fail(400, 'Unknown setting.');
  if (!roleAllows(user.role, spec.role)) return fail(403, `Changing "${spec.label}" needs the ${spec.role} role.`);
  const value = spec.check(body.value);
  if (typeof value === 'string') return json({ error: 'Please fix this first.', problems: [value] }, 422);
  const db = context.env.DB;
  const before = await readSetting(db, key);
  await db.batch([
    db
      .prepare('INSERT INTO settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at')
      .bind(key, JSON.stringify(value), user.email, Date.now()),
    auditStatement(db, user.email, `settings.${key}`, key, before, value),
  ]);
  return json({ ok: true, value, message: 'Saved. The site shows it within about a minute.' });
};
