// GET /api/config: the admin's instant settings for the public site (docs/ADMIN.md §2). Cached 60 seconds at the edge,
// so changes show within about a minute and the database is read at most once a minute per data centre.
import { buildConfig } from './_lib/config';
import { json } from './_lib/http';
import type { PagesContext } from './_lib/types';

interface EdgeCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const cache = (globalThis as { caches?: { default?: EdgeCache } }).caches?.default;
  const key = new Request(new URL('/api/config', context.request.url).toString());
  const hit = cache ? await cache.match(key) : undefined;
  if (hit) return hit;
  let body: unknown;
  try {
    body = await buildConfig(context.env.DB);
  } catch {
    // No database yet (or it is down): the site keeps its built defaults.
    body = { v: 1, hidden: [], featured: [], hero: {}, rows: {}, banners: [], notice: null, maintenance: null, flags: {} };
  }
  const response = json(body, 200, { 'cache-control': 'public, max-age=60, s-maxage=60' });
  if (cache) context.waitUntil(cache.put(key, response.clone()));
  return response;
};
