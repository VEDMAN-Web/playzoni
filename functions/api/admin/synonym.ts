// POST /api/admin/synonym (Editor and up): propose a search word for a category (docs/ADMIN.md §5.7).
// { "word": "cars", "category": "car-games" } -> appended to data/admin-proposals/synonyms.json on dev (or the outbox).
// The planner reviews proposals and moves good ones into the search word list.
import { readJson } from '../_lib/http';
import { submitFromRequest } from '../_lib/submit';
import type { PagesContext } from '../_lib/types';
import { isObj, slug, str } from '../_lib/validate';

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const body = await readJson(context.request);
  const word = isObj(body) ? str(body.word, 30) : null;
  const category = isObj(body) ? slug(body.category) : null;
  const change = word && category ? { kind: 'synonym' as const, word, category } : 'Send { word, category }.';
  return submitFromRequest(context, change, 'search.synonym', word ?? '');
};
