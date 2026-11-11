// GET /api/admin/game (Analyst and up). Builder: _lib/screens/game.ts.
import { screenHandler } from '../_lib/handler';
import { buildGame } from '../_lib/screens/game';

export const onRequestGet = screenHandler(buildGame);
