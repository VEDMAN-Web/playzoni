// Shared POST handling for rebuild changes: role check, submit (commit or outbox), audit log, clear errors.
import { auditStatement } from './audit';
import { guard } from './auth';
import { ChangeError, submitChange, type Change } from './changes';
import { json } from './http';
import type { PagesContext } from './types';

export async function submitFromRequest(context: PagesContext, change: Change | string, action: string, target: string): Promise<Response> {
  const user = await guard(context, 'editor');
  if (user instanceof Response) return user;
  if (typeof change === 'string') return json({ error: change }, 400);
  try {
    const done = await submitChange(context.env, change, user.email);
    await auditStatement(context.env.DB, user.email, action, target, done.result.before, done.result.after).run();
    if (done.status === 'committed') return json({ status: 'committed', commits: done.commits, message: 'Saved as a commit on dev. The preview rebuilds in 1 to 3 minutes.' });
    return json({ status: 'queued', message: 'Saved. It will be committed when GitHub is connected.' }, 202);
  } catch (error) {
    if (error instanceof ChangeError) return json({ error: 'Please fix these first.', problems: error.problems }, 422);
    return json({ error: 'GitHub did not accept the change. Nothing was saved. Try again later.' }, 502);
  }
}
