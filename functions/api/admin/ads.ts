// GET /api/admin/ads (Analyst and up). Builder: _lib/screens/ads.ts. Slot switches are saved through /api/admin/settings
// (key "ads", Owner only).
import { screenHandler } from '../_lib/handler';
import { buildAds } from '../_lib/screens/ads';

export const onRequestGet = screenHandler(buildAds);
