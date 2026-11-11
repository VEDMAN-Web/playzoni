// Screen 3: Games table stats (docs/ADMIN.md §5.3). Per game for the period: impressions (sampled tiles x5), clicks,
// plays, 30-second plays, play time, errors, favourites; plus the instant flags (hidden, featured, hero rank).
// Titles, status, source, categories and QA come from the build data (/admin/data/games.json) in the browser.
import type { ScreenBuilder } from '../handler';
import type { Table } from '../screen';
import { rows } from '../stats';

export const buildGames: ScreenBuilder = async (db, r) => {
  const [stats, flags] = await Promise.all([
    rows(
      db,
      `SELECT slug, SUM(impressions) AS impressions, SUM(clicks) AS clicks, SUM(plays) AS plays, SUM(plays_30s) AS plays_30s,
              SUM(play_s) AS play_s, SUM(errors) AS errors, SUM(favourites) AS favourites
       FROM daily_game WHERE day BETWEEN ? AND ? AND lang = ? GROUP BY slug`,
      r.from,
      r.to,
      r.lang ?? '*',
    ),
    rows(db, 'SELECT slug, hidden, featured, hero_rank FROM game_flags'),
  ]);
  const tables: Table[] = [
    { id: 'stats', title: 'Game stats', columns: [], rows: stats, empty: 'No game activity in these dates.' },
    { id: 'flags', title: 'Flags', columns: [], rows: flags, empty: '' },
  ];
  return { tables };
};
