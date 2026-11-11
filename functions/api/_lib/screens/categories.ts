// Screen 5: Categories stats (docs/ADMIN.md §5.5): category clicks per category and where they came from.
// Plays per category are added up in the browser from the games stats and each game's categories.
import type { ScreenBuilder } from '../handler';
import { rawFilter } from '../query';
import { rawCovers, rows } from '../stats';

export const buildCategories: ScreenBuilder = async (db, r) => {
  const f = rawFilter(r);
  const clicks = rawCovers(r.from)
    ? await rows(
        db,
        `SELECT value_text AS slug, COUNT(*) AS clicks, SUM(list_id = 'tile') AS from_tiles, SUM(list_id = 'chip') AS from_chips,
                SUM(list_id = 'nav') AS from_nav, SUM(list_id = 'search') AS from_search
         FROM events WHERE name = 'category_click' AND day BETWEEN ? AND ? AND value_text IS NOT NULL${f.sql} GROUP BY 1`,
        r.from,
        r.to,
        ...f.args,
      )
    : [];
  return { tables: [{ id: 'clicks', title: 'Category clicks', columns: [], rows: clicks, empty: 'No category clicks in these dates.' }] };
};
