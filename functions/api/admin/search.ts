// GET /api/admin/search (Analyst and up). Builder: _lib/screens/search.ts.
import { screenHandler } from '../_lib/handler';
import { buildSearch } from '../_lib/screens/search';

export const onRequestGet = screenHandler(buildSearch);
