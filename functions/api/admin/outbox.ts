// GET /api/admin/outbox (Analyst and up): changes waiting for GitHub. POST (Owner): { "action": "flush" } commits
// every waiting change to dev now that the GitHub App is connected.
import { auditStatement } from '../_lib/audit';
import { guard } from '../_lib/auth';
import { ChangeError, commitChange, type Change } from '../_lib/changes';
import { githubReady } from '../_lib/github';
import { fail, json, readJson } from '../_lib/http';
import type { PagesContext } from '../_lib/types';
import { isObj } from '../_lib/validate';

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'analyst');
  if (user instanceof Response) return user;
  const rows = (await context.env.DB.prepare('SELECT id, ts, email, kind, path, payload, status, commit_sha, error FROM outbox ORDER BY id DESC LIMIT 200').all()).results;
  return json({ github: githubReady(context.env), rows });
};

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'owner');
  if (user instanceof Response) return user;
  const body = await readJson(context.request);
  if (!isObj(body) || body.action !== 'flush') return fail(400, 'Send { "action": "flush" }.');
  if (!githubReady(context.env)) return fail(409, 'GitHub is not connected yet.');
  const db = context.env.DB;
  const pending = (await db.prepare("SELECT id, payload FROM outbox WHERE status = 'pending' ORDER BY id").all<{ id: number; payload: string }>()).results;
  let committed = 0;
  for (const row of pending) {
    try {
      const { commits, result } = await commitChange(context.env, JSON.parse(row.payload) as Change);
      await db.batch([
        db.prepare("UPDATE outbox SET status = 'committed', commit_sha = ?, error = NULL WHERE id = ?").bind(commits.join(','), row.id),
        auditStatement(db, user.email, 'outbox.commit', String(row.id), result.before, result.after),
      ]);
      committed++;
    } catch (error) {
      const message = error instanceof ChangeError ? error.message : 'GitHub did not accept the change';
      await db.prepare("UPDATE outbox SET status = 'failed', error = ? WHERE id = ?").bind(message.slice(0, 500), row.id).run();
    }
  }
  return json({ committed, failed: pending.length - committed });
};
