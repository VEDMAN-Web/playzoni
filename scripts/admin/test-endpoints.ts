// T10.13 to T10.16: admin write endpoints through their real handlers (role checks, rules, audit log).
import { onRequestPost as pushPost } from '../../functions/api/admin/push';
import { pushAllowed, WEEK_MS } from '../../functions/api/_lib/push';
import type { AdminUser } from '../../functions/api/_lib/auth';
import type { D1Database, PagesContext } from '../../functions/api/_lib/types';
import { expect, finish, same } from '../test-kit';
import { openDb } from './d1-shim';

export const OWNER: AdminUser = { email: 'owner@example.com', role: 'owner' };
export const EDITOR: AdminUser = { email: 'editor@example.com', role: 'editor' };
export const ANALYST: AdminUser = { email: 'analyst@example.com', role: 'analyst' };

export function ctx(db: D1Database, user: AdminUser, body: unknown, method = 'POST'): PagesContext {
  const request = new Request('https://playzoni.com/api/admin/x', {
    method,
    headers: { origin: 'https://playzoni.com', 'content-type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
  return { request, env: { DB: db }, params: {}, data: { user }, next: async () => new Response(), waitUntil: () => undefined };
}

// Push: at most 2 alerts in any 7 days.
const day = 86400000;
const t = Date.UTC(2027, 0, 10, 12);
expect(pushAllowed([], t), 'first alert ok');
expect(pushAllowed([t - 3 * day], t), 'second alert in a week ok');
expect(!pushAllowed([t - 3 * day, t - 1 * day], t), 'third alert in a week refused');
expect(!pushAllowed([t + 2 * day, t + 5 * day], t), 'refused when the week ahead is full too');
expect(pushAllowed([t - WEEK_MS, t - 3 * day], t), 'an alert exactly 7 days ago no longer counts');
expect(pushAllowed([t - 8 * day, t + 8 * day], t), 'alerts more than a week away are fine');

const db = openDb();
const at = (d: number): string => new Date(Date.now() + d * day).toISOString();
const send = async (user: AdminUser, d: number): Promise<number> => (await pushPost(ctx(db, user, { action: 'schedule', title: 'New game', body: 'Try it now', scheduled_at: at(d) }))).status;
same(await send(EDITOR, 1), 403, 'editors cannot send push alerts');
same(await send(OWNER, 1), 200, 'owner schedules alert 1');
same(await send(OWNER, 2), 200, 'owner schedules alert 2');
same(await send(OWNER, 3), 409, 'a third alert in one week is refused');
same(await send(OWNER, 20), 200, 'an alert two weeks later is fine');
same((await pushPost(ctx(db, OWNER, { action: 'schedule', title: '', body: '', scheduled_at: 'soon' }))).status, 422, 'empty alert refused');
same((await db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'push.schedule'").first<{ n: number }>())?.n, 3, 'every scheduled alert is in the audit log');

finish('test-endpoints');
