// GET /api/admin/acquisition (Analyst and up). Builder: _lib/screens/acquisition.ts.
import { screenHandler } from '../_lib/handler';
import { buildAcquisition } from '../_lib/screens/acquisition';

export const onRequestGet = screenHandler(buildAcquisition);
