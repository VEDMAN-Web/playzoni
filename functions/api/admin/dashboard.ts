// GET /api/admin/dashboard (Analyst and up). Builder: _lib/screens/dashboard.ts.
import { screenHandler } from '../_lib/handler';
import { buildDashboard } from '../_lib/screens/dashboard';

export const onRequestGet = screenHandler(buildDashboard);
