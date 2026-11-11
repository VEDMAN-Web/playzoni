// GET /api/admin/audit (Analyst and up, docs/ADMIN.md §5.17): every admin change, newest first, with filters
// ?email=&action=&from=YYYY-MM-DD&to=YYYY-MM-DD&before=<id> (100 at a time).
import { guard } from '../_lib/auth';
import { json } from '../_lib/http';
import type { PagesContext } from '../_lib/types';
import { day, int } from '../_lib/validate';

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'analyst');
  if (user instanceof Response) return user;
  const p = new URL(context.request.url).searchParams;
  const where: string[] = [];
  const args: unknown[] = [];
  const email = (p.get('email') ?? '').trim().toLowerCase();
  if (email) {
    where.push('email LIKE ?');
    args.push(`%${email.replace(/[%_]/g, '')}%`);
  }
  const action = (p.get('action') ?? '').trim();
  if (/^[a-z.-]{1,40}$/.test(action)) {
    where.push('action LIKE ?');
    args.push(`${action}%`);
  }
  const from = day(p.get('from'));
  if (from) {
    where.push('ts >= ?');
    args.push(Date.parse(`${from}T00:00:00Z`));
  }
  const to = day(p.get('to'));
  if (to) {
    where.push('ts < ?');
    args.push(Date.parse(`${to}T00:00:00Z`) + 86400000);
  }
  const before = int(p.get('before'), 1, Number.MAX_SAFE_INTEGER);
  if (before) {
    where.push('id < ?');
    args.push(before);
  }
  const sql = `SELECT id, ts, email, action, target, before, after FROM audit_log${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 100`;
  const rows = (await context.env.DB.prepare(sql).bind(...args).all()).results;
  return json({ rows });
};
