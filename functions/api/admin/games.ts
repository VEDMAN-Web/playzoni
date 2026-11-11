// GET /api/admin/games (Analyst and up). Builder: _lib/screens/games.ts.
import { screenHandler } from '../_lib/handler';
import { buildGames } from '../_lib/screens/games';

export const onRequestGet = screenHandler(buildGames);
