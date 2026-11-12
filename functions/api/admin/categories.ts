// GET /api/admin/categories (Analyst and up): category clicks. POST (Editor and up): edit a category
// { "slug": "...", "patch": { name, h1, shortName, emoji, parent, navOrder, description, intro, position, faq, body } }
// -> commit to dev (data/categories.json and src/content/categories/<slug>.md) or the outbox.
import { CATEGORY_EDITABLE, type CategoryPatch } from '../_lib/content-edit';
import { screenHandler } from '../_lib/handler';
import { readJson } from '../_lib/http';
import { buildCategories } from '../_lib/screens/categories';
import { submitFromRequest } from '../_lib/submit';
import type { PagesContext } from '../_lib/types';
import { isObj, slug } from '../_lib/validate';

export const onRequestGet = screenHandler(buildCategories);

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const body = await readJson(context.request);
  const s = isObj(body) ? slug(body.slug) : null;
  const raw = isObj(body) && isObj(body.patch) ? body.patch : null;
  if (!s || !raw) return submitFromRequest(context, 'Send { slug, patch }.', 'category.edit', '');
  const patch: CategoryPatch = {};
  for (const key of [...CATEGORY_EDITABLE, 'position', 'faq', 'body'] as const) if (key in raw) patch[key] = raw[key];
  return submitFromRequest(context, { kind: 'category', slug: s, patch }, 'category.edit', s);
};
