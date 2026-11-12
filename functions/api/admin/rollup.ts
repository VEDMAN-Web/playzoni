// POST /api/admin/rollup (Owner): runs the rollup by hand. Body: { "mode": "hourly" | "nightly", "days"?: ["YYYY-MM-DD"] }.
import { audit } from '../_lib/audit';
import { guard } from '../_lib/auth';
import { fail, json, readJson } from '../_lib/http';
import { runRollup } from '../_lib/rollup';
import type { PagesContext } from '../_lib/types';
import { day, isObj } from '../_lib/validate';

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'owner');
  if (user instanceof Response) return user;
  const body = await readJson(context.request);
  if (!isObj(body)) return fail(400, 'Send a JSON object.');
  const mode = body.mode === 'nightly' ? 'nightly' : 'hourly';
  let days: string[] | undefined;
  if (Array.isArray(body.days)) {
    days = body.days.map(day).filter((d): d is string => d !== null).slice(0, 31);
    if (days.length === 0) return fail(400, 'days must be YYYY-MM-DD dates.');
  }
  const result = await runRollup(context.env.DB, mode, Date.now(), days);
  await audit(context.env.DB, user.email, 'rollup.run', mode, null, result);
  return json(result);
};
