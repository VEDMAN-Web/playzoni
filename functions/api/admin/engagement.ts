// GET /api/admin/engagement (Analyst and up). Builder: _lib/screens/engagement.ts.
import { screenHandler } from '../_lib/handler';
import { buildEngagement } from '../_lib/screens/engagement';

export const onRequestGet = screenHandler(buildEngagement);
