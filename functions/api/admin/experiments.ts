// GET /api/admin/experiments (Analyst and up). POST (Owner): { "action": "create", "name", "variants": ["A","B"],
// "traffic": 50 } | { "action": "start" | "stop", "id" }. Only one experiment runs at a time (T9.7, ADS-DATA §7).
// Results per variant need visits tagged with the variant (T9.7); until then the screen says so and shows no numbers.
import { auditStatement } from '../_lib/audit';
import { guard } from '../_lib/auth';
import { fail, json, readJson } from '../_lib/http';
import type { PagesContext } from '../_lib/types';
import { dayOf, int, isObj, str } from '../_lib/validate';

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'analyst');
  if (user instanceof Response) return user;
  const rows = (await context.env.DB.prepare('SELECT id, name, variants, traffic, status, starts_at, ends_at FROM experiments ORDER BY COALESCE(starts_at, \'9999\') DESC, id').all()).results;
  return json({ rows, results: null, resultsNote: 'Results per variant (plays per session, revenue per session) appear when visits carry the variant (task T9.7).' });
};

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'owner');
  if (user instanceof Response) return user;
  const body = await readJson(context.request);
  if (!isObj(body)) return fail(400, 'Send a JSON object.');
  const db = context.env.DB;
  const today = dayOf(Date.now());
  if (body.action === 'create') {
    const name = (str(body.name, 60) ?? '').replace(/[–—]/g, ',');
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    const variants = Array.isArray(body.variants) ? [...new Set(body.variants.map((v) => str(v, 20)).filter((v): v is string => Boolean(v)))] : [];
    const traffic = int(body.traffic, 1, 100);
    const problems: string[] = [];
    if (!name || !id) problems.push('name: give the test a name');
    if (variants.length < 2 || variants.length > 4) problems.push('variants: 2 to 4 variants, for example A, B');
    if (!traffic) problems.push('traffic: 1 to 100 percent');
    if (id && (await db.prepare('SELECT 1 AS x FROM experiments WHERE id = ?').bind(id).first())) problems.push('name: a test with this name exists');
    if (problems.length) return json({ error: 'Please fix these first.', problems }, 422);
    const row = { id, name, variants: JSON.stringify(variants), traffic, status: 'draft' };
    await db.batch([
      db.prepare('INSERT INTO experiments (id, name, variants, traffic, status) VALUES (?, ?, ?, ?, ?)').bind(id, name, row.variants, traffic, 'draft'),
      auditStatement(db, user.email, 'experiment.create', id, null, row),
    ]);
    return json({ ok: true, message: 'Created as a draft. Start it when ready.' });
  }
  const id = typeof body.id === 'string' ? body.id : '';
  const before = await db.prepare('SELECT * FROM experiments WHERE id = ?').bind(id).first<{ status: string }>();
  if (!before) return fail(404, 'No such test.');
  if (body.action === 'start') {
    if (before.status !== 'draft') return fail(409, 'Only a draft can start.');
    const running = await db.prepare("SELECT id FROM experiments WHERE status = 'running'").first<{ id: string }>();
    if (running) return json({ error: `Stop "${running.id}" first: only one test runs at a time.`, problems: ['one test at a time'] }, 409);
    await db.batch([
      db.prepare("UPDATE experiments SET status = 'running', starts_at = ? WHERE id = ?").bind(today, id),
      auditStatement(db, user.email, 'experiment.start', id, before, { ...before, status: 'running', starts_at: today }),
    ]);
    return json({ ok: true, message: 'Started.' });
  }
  if (body.action === 'stop') {
    if (before.status !== 'running') return fail(409, 'Only a running test can stop.');
    await db.batch([
      db.prepare("UPDATE experiments SET status = 'stopped', ends_at = ? WHERE id = ?").bind(today, id),
      auditStatement(db, user.email, 'experiment.stop', id, before, { ...before, status: 'stopped', ends_at: today }),
    ]);
    return json({ ok: true, message: 'Stopped.' });
  }
  return fail(400, 'Unknown action.');
};
