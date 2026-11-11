// POST /api/admin/game-flags (Editor and up): bulk instant actions from the Games table (docs/ADMIN.md §5.3).
// Body: { "slugs": ["a", "b"], "action": "hide" | "unhide" | "feature" | "unfeature" | "hero-add" | "hero-remove" }
// Instant: the site reads the result from /api/config within about a minute. Every change is in the audit log.
import { auditStatement } from '../_lib/audit';
import { guard } from '../_lib/auth';
import { heroList, heroStatements } from '../_lib/flags';
import { fail, json, readJson } from '../_lib/http';
import type { D1PreparedStatement, PagesContext } from '../_lib/types';
import { isObj, oneOf, slug } from '../_lib/validate';

const ACTIONS = ['hide', 'unhide', 'feature', 'unfeature', 'hero-add', 'hero-remove'] as const;

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const user = await guard(context, 'editor');
  if (user instanceof Response) return user;
  const body = await readJson(context.request);
  if (!isObj(body)) return fail(400, 'Send a JSON object.');
  const action = oneOf(body.action, ACTIONS);
  const slugs = Array.isArray(body.slugs) ? [...new Set(body.slugs.map(slug).filter((s): s is string => s !== null))].slice(0, 500) : [];
  if (!action || slugs.length === 0) return fail(400, 'Choose at least one game and an action.');
  const db = context.env.DB;

  const marks = slugs.map(() => '?').join(', ');
  const before = (await db.prepare(`SELECT slug, hidden, featured, hero_rank FROM game_flags WHERE slug IN (${marks})`).bind(...slugs).all()).results;
  const statements: D1PreparedStatement[] = [];
  if (action === 'hero-add' || action === 'hero-remove') {
    const current = await heroList(db, '*');
    const next = action === 'hero-add' ? [...current, ...slugs.filter((s) => !current.includes(s))] : current.filter((s) => !slugs.includes(s));
    statements.push(...heroStatements(db, '*', next));
  } else {
    const column = action === 'hide' || action === 'unhide' ? 'hidden' : 'featured';
    const value = action === 'hide' || action === 'feature' ? 1 : 0;
    for (const s of slugs) {
      statements.push(
        db.prepare(`INSERT INTO game_flags (slug, ${column}) VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET ${column} = excluded.${column}`).bind(s, value),
      );
    }
  }
  await db.batch(statements);
  const after = (await db.prepare(`SELECT slug, hidden, featured, hero_rank FROM game_flags WHERE slug IN (${marks})`).bind(...slugs).all()).results;
  await auditStatement(db, user.email, `games.${action}`, slugs.join(', ').slice(0, 500), before, after).run();
  return json({ ok: true, action, count: slugs.length });
};
