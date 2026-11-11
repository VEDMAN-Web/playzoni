// GET /api/admin/realtime (Analyst and up). Builder: _lib/screens/realtime.ts.
import { screenHandler } from '../_lib/handler';
import { buildRealtime } from '../_lib/screens/realtime';

export const onRequestGet = screenHandler(buildRealtime);
