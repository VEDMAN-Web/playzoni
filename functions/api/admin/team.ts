// GET/POST /api/admin/team (Owner only, docs/ADMIN.md §5.16). POST: { "action": "add", "email", "role" } |
// { "action": "role", "email", "role" } | { "action": "remove", "email" }. Owners from ADMIN_OWNER_EMAILS (set in
// Cloudflare) are shown but cannot be changed here. The last Owner can never be removed or demoted. Audited.
// People also need to be on the Cloudflare Access list to sign in (docs/ADMIN-SETUP.md).
import { auditStatement } from '../_lib/audit';
import { guard, ownerEmails, ROLES, type Role } from '../_lib/auth';
import { fail, json, readJson } from '../_lib/http';
import type { PagesContext } from '../_lib/types';
import { isEmail, isObj, oneOf } from '../_lib/validate';

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'owner');
  if (user instanceof Response) return user;
  const rows = (await context.env.DB.prepare('SELECT email, role, added_by, added_at FROM team ORDER BY role, email').all()).results;
  return json({ rows, fixedOwners: ownerEmails(context.env), you: user.email });
};

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'owner');
  if (user instanceof Response) return user;
  const body = await readJson(context.request);
  if (!isObj(body)) return fail(400, 'Send a JSON object.');
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isEmail(email)) return json({ error: 'Please fix this first.', problems: ['email: write a full email address'] }, 422);
  const env = context.env;
  const db = env.DB;
  if (ownerEmails(env).includes(email)) return fail(409, 'This owner is set in Cloudflare (ADMIN_OWNER_EMAILS) and cannot be changed here.');
  const before = await db.prepare('SELECT email, role FROM team WHERE email = ?').bind(email).first<{ email: string; role: Role }>();
  const owners = async (): Promise<number> =>
    ownerEmails(env).length + ((await db.prepare("SELECT COUNT(*) AS n FROM team WHERE role = 'owner'").first<{ n: number }>())?.n ?? 0);

  if (body.action === 'add' || body.action === 'role') {
    const role = oneOf(body.role, ROLES);
    if (!role) return json({ error: 'Please fix this first.', problems: ['role: owner, editor or analyst'] }, 422);
    if (body.action === 'add' && before) return fail(409, 'This email is already on the team.');
    if (body.action === 'role' && !before) return fail(404, 'This email is not on the team.');
    if (before?.role === 'owner' && role !== 'owner' && (await owners()) <= 1) return fail(409, 'There must always be at least one Owner.');
    await db.batch([
      db
        .prepare('INSERT INTO team (email, role, added_by, added_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET role = excluded.role')
        .bind(email, role, user.email, Date.now()),
      auditStatement(db, user.email, body.action === 'add' ? 'team.add' : 'team.role', email, before, { email, role }),
    ]);
    return json({ ok: true, message: body.action === 'add' ? 'Added. Also add this email to the Cloudflare Access list so they can sign in.' : 'Role changed.' });
  }
  if (body.action === 'remove') {
    if (!before) return fail(404, 'This email is not on the team.');
    if (before.role === 'owner' && (await owners()) <= 1) return fail(409, 'There must always be at least one Owner.');
    await db.batch([db.prepare('DELETE FROM team WHERE email = ?').bind(email), auditStatement(db, user.email, 'team.remove', email, before, null)]);
    return json({ ok: true, message: 'Removed. Also remove this email from the Cloudflare Access list.' });
  }
  return fail(400, 'Unknown action.');
};
