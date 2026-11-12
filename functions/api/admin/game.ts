// GET /api/admin/game?slug= (Analyst and up): stats. Builder: _lib/screens/game.ts.
import { cleanGamePatch } from '../_lib/content-edit';
import { screenHandler } from '../_lib/handler';
import { readJson } from '../_lib/http';
import { submitFromRequest } from '../_lib/submit';
import type { PagesContext } from '../_lib/types';
import { isObj, slug } from '../_lib/validate';
import { buildGame } from '../_lib/screens/game';

export const onRequestGet = screenHandler(buildGame);

// POST /api/admin/game (Editor and up): { "slug": "...", "patch": { "title": "...", ... } } -> commit to dev or outbox.
export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const body = await readJson(context.request);
  const s = isObj(body) ? slug(body.slug) : null;
  const change = s && isObj(body) ? { kind: 'game' as const, slug: s, patch: cleanGamePatch(body.patch) } : 'Send { slug, patch }.';
  return submitFromRequest(context, change, 'game.edit', s ?? '');
};
