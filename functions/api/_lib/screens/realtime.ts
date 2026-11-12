// Screen 2: Realtime (docs/ADMIN.md §5). The last 30 minutes from raw events: active visitors, pages being viewed,
// games being played, countries. The page refreshes every 15 seconds.
import type { ScreenBuilder } from '../handler';
import { rawFilter } from '../query';
import type { Chart, Kpi, Table } from '../screen';
import { num, one, rows } from '../stats';

const EMPTY = 'Nobody in the last 30 minutes.';

export const buildRealtime: ScreenBuilder = async (db, r) => {
  const now = Date.now();
  const since = now - 30 * 60000;
  const f = rawFilter(r);
  const [tot, perMin, pages, games, countries] = await Promise.all([
    one(
      db,
      `SELECT COUNT(DISTINCT vid) AS v, COUNT(DISTINCT CASE WHEN ts > ? THEN vid END) AS v5,
              SUM(name = 'page_view') AS pv, SUM(name = 'play_start') AS plays
       FROM events WHERE ts > ?${f.sql}`,
      now - 5 * 60000,
      since,
      ...f.args,
    ),
    rows(db, `SELECT CAST((ts - ?) / 60000 AS INTEGER) AS m, COUNT(DISTINCT vid) AS v FROM events WHERE ts > ?${f.sql} GROUP BY 1`, since, since, ...f.args),
    rows(db, `SELECT path, COUNT(DISTINCT vid) AS visitors, COUNT(*) AS views FROM events WHERE ts > ? AND name = 'page_view'${f.sql} GROUP BY 1 ORDER BY visitors DESC LIMIT 15`, since, ...f.args),
    rows(db, `SELECT slug, COUNT(DISTINCT vid) AS players, SUM(name = 'play_start') AS starts FROM events WHERE ts > ? AND slug IS NOT NULL AND name IN ('play_start', 'play_30s')${f.sql} GROUP BY 1 ORDER BY players DESC LIMIT 15`, since, ...f.args),
    rows(db, `SELECT country, COUNT(DISTINCT vid) AS visitors FROM events WHERE ts > ?${f.sql} GROUP BY 1 ORDER BY visitors DESC LIMIT 15`, since, ...f.args),
  ]);
  const any = (num(tot.v) ?? 0) > 0;
  const kpis: Kpi[] = [
    { id: 'active5', label: 'Active now', value: any ? num(tot.v5) : null, fmt: 'int', note: 'Last 5 minutes' },
    { id: 'active30', label: 'Visitors', value: any ? num(tot.v) : null, fmt: 'int', note: 'Last 30 minutes' },
    { id: 'pv', label: 'Page views', value: any ? num(tot.pv) : null, fmt: 'int', note: 'Last 30 minutes' },
    { id: 'plays', label: 'Games started', value: any ? num(tot.plays) : null, fmt: 'int', note: 'Last 30 minutes' },
  ];
  const by = new Map(perMin.map((x) => [num(x.m), num(x.v)]));
  const x: string[] = [];
  const values: (number | null)[] = [];
  for (let m = 0; m < 30; m++) {
    x.push(new Date(since + m * 60000).toISOString().slice(11, 16));
    values.push(by.get(m) ?? (any ? 0 : null));
  }
  const charts: Chart[] = [{ id: 'per-minute', title: 'Visitors per minute', x, series: [{ name: 'Visitors', values }], empty: EMPTY }];
  const tables: Table[] = [
    { id: 'pages', title: 'Pages being viewed', columns: [{ key: 'path', label: 'Page' }, { key: 'visitors', label: 'Visitors', fmt: 'int' }, { key: 'views', label: 'Views', fmt: 'int' }], rows: pages, empty: EMPTY },
    { id: 'games', title: 'Games being played', columns: [{ key: 'slug', label: 'Game', link: '/admin/game?slug={slug}' }, { key: 'players', label: 'Players', fmt: 'int' }, { key: 'starts', label: 'Starts', fmt: 'int' }], rows: games, empty: 'No games played in the last 30 minutes.' },
    { id: 'countries', title: 'Countries', columns: [{ key: 'country', label: 'Country' }, { key: 'visitors', label: 'Visitors', fmt: 'int' }], rows: countries, empty: EMPTY, bars: { label: 'country', value: 'visitors' } },
  ];
  return { kpis, charts, tables };
};
