// Screen 1: Dashboard (docs/ADMIN.md §5). KPI cards, visitors/plays over time, top games, categories, countries,
// devices and referrers. Every number comes from the database; empty means null ("No data"), never 0.
import type { ScreenBuilder } from '../handler';
import { dayList, rawFilter, ratio } from '../query';
import type { Chart, Kpi, Table } from '../screen';
import { dailySite, earnings, NO_VISITS, num, one, prevSeries, returnRate, rows, sessionsBy, siteTotals } from '../stats';

export const buildDashboard: ScreenBuilder = async (db, r) => {
  const now = Date.now();
  const f = rawFilter(r);
  const [cur, prev, live, today, d1, d7, money] = await Promise.all([
    siteTotals(db, r, r.from, r.to),
    r.compare ? siteTotals(db, r, r.prevFrom, r.prevTo) : null,
    one(db, `SELECT COUNT(DISTINCT vid) AS v FROM events WHERE ts > ?${f.sql}`, now - 5 * 60000, ...f.args),
    siteTotals(db, r, new Date(now).toISOString().slice(0, 10), new Date(now).toISOString().slice(0, 10)),
    returnRate(db, r.from, r.to, 1),
    returnRate(db, r.from, r.to, 7),
    earnings(db, r.from, r.to),
  ]);
  const avg = (t: typeof cur | null): number | null => (t ? ratio(t.engaged, t.sessions) : null);
  const ppv = (t: typeof cur | null): number | null => (t ? ratio(t.plays, t.visitors) : null);
  const p = <T>(v: T): T | undefined => (r.compare ? v : undefined);

  const kpis: Kpi[] = [
    { id: 'now', label: 'Visitors now', value: num(live.v) || null, fmt: 'int', note: 'Last 5 minutes' },
    { id: 'today', label: "Today's visitors", value: today.visitors, fmt: 'int' },
    { id: 'visitors', label: 'Visitors', value: cur.visitors, prev: p(prev?.visitors ?? null), fmt: 'int', note: cur.exact ? undefined : 'Daily visitors added up' },
    { id: 'sessions', label: 'Sessions', value: cur.sessions, prev: p(prev?.sessions ?? null), fmt: 'int' },
    { id: 'engaged', label: 'Avg engaged time', value: avg(cur), prev: p(avg(prev)), fmt: 'sec', note: 'Per session, tab visible' },
    { id: 'plays', label: 'Plays', value: cur.plays, prev: p(prev?.plays ?? null), fmt: 'int' },
    { id: 'ppv', label: 'Plays per visitor', value: ppv(cur), prev: p(ppv(prev)), fmt: 'dec' },
    { id: 'd1', label: 'Day 1 return', value: d1, fmt: 'pct', note: 'All visitors' },
    { id: 'd7', label: 'Day 7 return', value: d7, fmt: 'pct', note: 'All visitors' },
    { id: 'revenue', label: 'Ad revenue', value: money, fmt: 'money', note: money === null ? 'Connect AdSense to see real earnings' : 'From AdSense' },
  ];

  const days = dayList(r.from, r.to);
  const series = [
    { name: 'Visitors', values: await dailySite(db, r, r.from, r.to, 'visitors') },
    { name: 'Plays', values: await dailySite(db, r, r.from, r.to, 'plays') },
  ];
  if (r.compare) series.push(await prevSeries(db, r, 'visitors', 'Visitors, previous period'));
  const charts: Chart[] = [{ id: 'over-time', title: 'Visitors and plays per day', x: days, series, empty: NO_VISITS }];

  const topGames = await rows(
    db,
    `SELECT slug, SUM(plays) AS plays, SUM(clicks) AS clicks FROM daily_game
     WHERE day BETWEEN ? AND ? AND lang = ? GROUP BY slug HAVING SUM(plays) > 0 ORDER BY plays DESC LIMIT 10`,
    r.from,
    r.to,
    r.lang ?? '*',
  );
  const cats = await rows(
    db,
    `SELECT value_text AS category, COUNT(*) AS clicks FROM events
     WHERE name = 'category_click' AND day BETWEEN ? AND ? AND value_text IS NOT NULL${f.sql} GROUP BY 1 ORDER BY clicks DESC LIMIT 10`,
    r.from,
    r.to,
    ...f.args,
  );
  const countries = await sessionsBy(db, r, 'country');
  const devices = await sessionsBy(db, r, 'device', 5);
  const refs = await rows(
    db,
    `SELECT ref_domain AS ref, SUM(sessions) AS sessions FROM daily_referrer
     WHERE day BETWEEN ? AND ? AND ref_domain != '' GROUP BY 1 ORDER BY sessions DESC LIMIT 10`,
    r.from,
    r.to,
  );

  const tables: Table[] = [
    {
      id: 'top-games',
      title: 'Top 10 games by plays',
      columns: [
        { key: 'slug', label: 'Game', link: '/admin/game?slug={slug}' },
        { key: 'plays', label: 'Plays', fmt: 'int' },
      ],
      rows: topGames,
      empty: 'No plays in these dates yet.',
      bars: { label: 'slug', value: 'plays' },
    },
    {
      id: 'top-categories',
      title: 'Top categories (category clicks)',
      columns: [
        { key: 'category', label: 'Category' },
        { key: 'clicks', label: 'Clicks', fmt: 'int' },
      ],
      rows: cats,
      empty: 'No category clicks in these dates yet.',
      bars: { label: 'category', value: 'clicks' },
    },
    {
      id: 'top-countries',
      title: 'Top countries',
      columns: [
        { key: 'k', label: 'Country' },
        { key: 'visitors', label: 'Visitors', fmt: 'int' },
      ],
      rows: countries,
      empty: NO_VISITS,
      bars: { label: 'k', value: 'visitors' },
    },
    {
      id: 'devices',
      title: 'Devices',
      columns: [
        { key: 'k', label: 'Device' },
        { key: 'visitors', label: 'Visitors', fmt: 'int' },
      ],
      rows: devices,
      empty: NO_VISITS,
      bars: { label: 'k', value: 'visitors' },
    },
    {
      id: 'top-referrers',
      title: 'Top referrers',
      columns: [
        { key: 'ref', label: 'Website' },
        { key: 'sessions', label: 'Sessions', fmt: 'int' },
      ],
      rows: refs,
      empty: 'No visits from other websites in these dates yet.',
      bars: { label: 'ref', value: 'sessions' },
    },
  ];
  return { kpis, charts, tables };
};
