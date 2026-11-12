// T10.13 to T10.16: admin write endpoints through their real handlers (role checks, rules, audit log).
import { onRequestGet as auditGet } from '../../functions/api/admin/audit';
import { onRequestPost as expPost } from '../../functions/api/admin/experiments';
import { onRequestGet as teamGet, onRequestPost as teamPost } from '../../functions/api/admin/team';
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

// Experiments: one at a time, Owner only.
const exp = async (user: AdminUser, body: unknown): Promise<number> => (await expPost(ctx(db, user, body))).status;
same(await exp(EDITOR, { action: 'create', name: 'Rows', variants: ['A', 'B'], traffic: 50 }), 403, 'editors cannot create tests');
same(await exp(OWNER, { action: 'create', name: 'Rows order', variants: ['A', 'B'], traffic: 50 }), 200, 'create test 1');
same(await exp(OWNER, { action: 'create', name: 'Hot badges', variants: ['A', 'B', 'C'], traffic: 20 }), 200, 'create test 2');
same(await exp(OWNER, { action: 'create', name: 'Bad', variants: ['A'], traffic: 0 }), 422, 'one variant and 0% refused');
same(await exp(OWNER, { action: 'start', id: 'rows-order' }), 200, 'start test 1');
same(await exp(OWNER, { action: 'start', id: 'hot-badges' }), 409, 'second running test refused');
same(await exp(OWNER, { action: 'stop', id: 'rows-order' }), 200, 'stop test 1');
same(await exp(OWNER, { action: 'start', id: 'hot-badges' }), 200, 'now test 2 can start');
same((await db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action LIKE 'experiment.%'").first<{ n: number }>())?.n, 5, 'experiment changes audited');

// Team: Owner only; the last Owner stays.
const team = async (user: AdminUser, body: unknown): Promise<number> => (await teamPost(ctx(db, user, body))).status;
same((await teamGet(ctx(db, EDITOR, null, 'GET'))).status, 403, 'editors cannot see the team');
same(await team(EDITOR, { action: 'add', email: 'x@example.com', role: 'owner' }), 403, 'editors cannot add people');
same(await team(OWNER, { action: 'add', email: 'Boss@Example.com', role: 'owner' }), 200, 'owner adds an owner');
same(await team(OWNER, { action: 'add', email: 'boss@example.com', role: 'editor' }), 409, 'no duplicates');
same(await team(OWNER, { action: 'add', email: 'not-an-email', role: 'editor' }), 422, 'bad email refused');
same(await team(OWNER, { action: 'add', email: 'a@example.com', role: 'god' }), 422, 'bad role refused');
same(await team(OWNER, { action: 'remove', email: 'boss@example.com' }), 409, 'the last owner cannot be removed');
same(await team(OWNER, { action: 'role', email: 'boss@example.com', role: 'analyst' }), 409, 'the last owner cannot be demoted');
same(await team(OWNER, { action: 'add', email: 'second@example.com', role: 'owner' }), 200, 'second owner');
same(await team(OWNER, { action: 'role', email: 'boss@example.com', role: 'analyst' }), 200, 'now demoting works');

// Audit log: every write above is there with before/after, filterable.
const audit = async (q: string): Promise<{ rows: { action: string; before: string | null; after: string | null }[] }> => {
  const c = ctx(db, ANALYST, null, 'GET');
  const req = new Request(`https://playzoni.com/api/admin/audit?${q}`, { headers: c.request.headers });
  return (await (await auditGet({ ...c, request: req })).json()) as { rows: { action: string; before: string | null; after: string | null }[] };
};
const all = await audit('');
same(all.rows.length, 11, 'all writes logged (3 push, 5 experiments, 2 team adds, 1 role change)');
const roleRow = (await audit('action=team.role')).rows[0];
same([JSON.parse(roleRow.before ?? 'null').role, JSON.parse(roleRow.after ?? 'null').role], ['owner', 'analyst'], 'before and after recorded');
same((await audit('email=nobody')).rows.length, 0, 'email filter');

finish('test-endpoints');
