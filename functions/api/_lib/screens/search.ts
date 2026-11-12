// Screen 7: Search insights (docs/ADMIN.md §5.7): top queries, zero-result queries (with "propose a word"), and which
// game people clicked for each query.
import type { ScreenBuilder } from '../handler';
import { dayList, rawFilter, ratio } from '../query';
import type { Chart, Kpi, Table } from '../screen';
import { num, one, rawCovers, rows } from '../stats';

export const buildSearch: ScreenBuilder = async (db, r) => {
  const sum = (from: string, to: string): Promise<Record<string, string | number | null>> =>
    one(db, 'SELECT SUM(count) AS n, SUM(zero_results) AS z, SUM(clicks) AS c FROM daily_search WHERE day BETWEEN ? AND ?', from, to);
  const [t, p, perDay, top, zero] = await Promise.all([
    sum(r.from, r.to),
    r.compare ? sum(r.prevFrom, r.prevTo) : null,
    rows(db, 'SELECT day, SUM(count) AS n, SUM(zero_results) AS z FROM daily_search WHERE day BETWEEN ? AND ? GROUP BY day', r.from, r.to),
    rows(
      db,
      `SELECT query, SUM(count) AS searches, SUM(zero_results) AS zero, SUM(clicks) AS clicks FROM daily_search
       WHERE day BETWEEN ? AND ? GROUP BY query HAVING SUM(count) > 0 ORDER BY searches DESC LIMIT 50`,
      r.from,
      r.to,
    ),
    rows(
      db,
      `SELECT query, SUM(zero_results) AS zero, SUM(count) AS searches FROM daily_search
       WHERE day BETWEEN ? AND ? GROUP BY query HAVING SUM(zero_results) > 0 ORDER BY zero DESC LIMIT 50`,
      r.from,
      r.to,
    ),
  ]);
  const n = num(t.n);
  const pn = p ? num(p.n) : null;
  const kpis: Kpi[] = [
    { id: 'searches', label: 'Searches', value: n || null, prev: r.compare ? pn || null : undefined, fmt: 'int' },
    { id: 'zero', label: 'No results', value: n ? ratio(num(t.z), n) : null, prev: r.compare ? (pn ? ratio(num(p?.z ?? null), pn) : null) : undefined, fmt: 'pct' },
    { id: 'ctr', label: 'Searches with a click', value: n ? Math.min(1, ratio(num(t.c), n) ?? 0) : null, fmt: 'pct' },
  ];
  const by = new Map(perDay.map((x) => [String(x.day), x]));
  const days = dayList(r.from, r.to);
  const charts: Chart[] = [
    {
      id: 'searches',
      title: 'Searches per day',
      x: days,
      series: [
        { name: 'Searches', values: days.map((d) => num(by.get(d)?.n ?? null)) },
        { name: 'No results', values: days.map((d) => num(by.get(d)?.z ?? null)) },
      ],
      empty: 'No searches in these dates.',
    },
  ];
  const f = rawFilter(r);
  const clicked = rawCovers(r.from)
    ? await rows(
        db,
        `SELECT value_text AS query, slug, COUNT(*) AS clicks, SUM(list_id = 'search-popular') AS from_popular FROM events
         WHERE name = 'search_click' AND day BETWEEN ? AND ? AND value_text IS NOT NULL AND slug IS NOT NULL${f.sql}
         GROUP BY 1, 2 ORDER BY clicks DESC LIMIT 50`,
        r.from,
        r.to,
        ...f.args,
      )
    : [];
  const tables: Table[] = [
    {
      id: 'zero-results',
      title: 'Searches with no results',
      columns: [
        { key: 'query', label: 'Query' },
        { key: 'zero', label: 'No results', fmt: 'int' },
        { key: 'searches', label: 'Searches', fmt: 'int' },
      ],
      rows: zero,
      empty: 'Every search found games in these dates.',
      note: 'Editors can propose a search word for a category. Proposals are reviewed before they go live.',
    },
    {
      id: 'top-queries',
      title: 'Top searches',
      columns: [
        { key: 'query', label: 'Query' },
        { key: 'searches', label: 'Searches', fmt: 'int' },
        { key: 'zero', label: 'No results', fmt: 'int' },
        { key: 'clicks', label: 'Clicks', fmt: 'int' },
      ],
      rows: top,
      empty: 'No searches in these dates.',
    },
    {
      id: 'query-game',
      title: 'Search to clicked game',
      columns: [
        { key: 'query', label: 'Query' },
        { key: 'slug', label: 'Game', link: '/admin/game?slug={slug}' },
        { key: 'clicks', label: 'Clicks', fmt: 'int' },
        { key: 'from_popular', label: 'From popular games', fmt: 'int' },
      ],
      rows: clicked,
      empty: 'No clicks on search results in these dates (kept 90 days).',
    },
  ];
  return { kpis, charts, tables };
};
