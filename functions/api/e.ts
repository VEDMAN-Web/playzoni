// POST /api/e: collection endpoint for the tracking script (docs/ADMIN.md §3, §7). Logic: _lib/collect.ts.
import { collect } from './_lib/collect';
import { json } from './_lib/http';
import type { PagesContext } from './_lib/types';

export const onRequestPost = (context: PagesContext): Promise<Response> => collect(context.request, context.env.DB);

export const onRequest = (): Response => json({ error: 'POST only' }, 405, { allow: 'POST' });
