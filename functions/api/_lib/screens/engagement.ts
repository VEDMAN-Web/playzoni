// Screen 9: Engagement (docs/ADMIN.md §5.9): engaged time, sessions per visitor, retention cohorts, the funnel
// visit -> tile click -> play start -> 30 s -> return within 7 days, scroll depth, endless-row batches, and web vitals.
import type { ScreenBuilder } from '../handler';
import { dayList, rawFilter, ratio } from '../query';
import type { Cell, Chart, Kpi, Table } from '../screen';
import { num, one, rawCovers, rows, siteTotals } from '../stats';
import { addDays, dayOf } from '../validate';

const DAYS_N = [1, 2, 3, 7, 14, 30];

/** 75th percentile of a list (null when empty). */
export function p75(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.75) - 1)];
}

export const buildEngagement: ScreenBuilder = async (db, r) => {
  const today = dayOf(Date.now());
  const [cur, prev] = await Promise.all([siteTotals(db, r, r.from, r.to), r.compare ? siteTotals(db, r, r.prevFrom, r.prevTo) : null]);
  const spv = (t: typeof cur | null): number | null => (t ? ratio(t.sessions, t.visitors) : null);
  const kpis: Kpi[] = [
    { id: 'engaged', label: 'Avg engaged time', value: ratio(cur.engaged, cur.sessions), prev: r.compare ? ratio(prev?.engaged ?? null, prev?.sessions ?? null) : undefined, fmt: 'sec', note: 'Per session, tab visible' },
    { id: 'spv', label: 'Sessions per visitor', value: spv(cur), prev: r.compare ? spv(prev) : undefined, fmt: 'dec' },
    { id: 'pps', label: 'Pages per session', value: ratio(cur.pageViews, cur.sessions), prev: r.compare ? ratio(prev?.pageViews ?? null, prev?.sessions ?? null) : undefined, fmt: 'dec' },
    { id: 'plays', label: 'Plays per session', value: ratio(cur.plays, cur.sessions), prev: r.compare ? ratio(prev?.plays ?? null, prev?.sessions ?? null) : undefined, fmt: 'dec' },
  ];

  // Retention cohorts (first visit day in the period).
  const ret = await rows(db, 'SELECT cohort_day, day_n, visitors FROM retention WHERE cohort_day BETWEEN ? AND ? AND day_n IN (0, 1, 2, 3, 7, 14, 30)', r.from, r.to);
  const cohorts = new Map<string, Record<number, number>>();
  for (const x of ret) {
    const c = cohorts.get(String(x.cohort_day)) ?? {};
    c[Number(x.day_n)] = Number(x.visitors);
    cohorts.set(String(x.cohort_day), c);
  }
  const cohortRows: Record<string, Cell>[] = [...cohorts.entries()]
    .filter(([, c]) => c[0])
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, c]) => {
      const row: Record<string, Cell> = { cohort: day, size: c[0] };
      for (const n of DAYS_N) row[`d${n}`] = addDays(day, n) > today ? null : (c[n] ?? 0) / c[0];
      return row;
    });

  const tables: Table[] = [
    {
      id: 'retention',
      title: 'Return rate by first-visit day',
      columns: [
        { key: 'cohort', label: 'First visit' },
        { key: 'size', label: 'New visitors', fmt: 'int' },
        ...DAYS_N.map((n) => ({ key: `d${n}`, label: `Day ${n}`, fmt: 'pct' as const })),
      ],
      rows: cohortRows,
      empty: 'No new visitors in these dates yet. Cohorts are built every night.',
      note: 'n/a = that day has not happened yet. All visitors, no filters.',
    },
  ];

  const charts: Chart[] = [];
  if (rawCovers(r.from)) {
    const f = rawFilter(r);
    const [funnel, back, scroll, more, vitals, engagedPerDay] = await Promise.all([
      one(
        db,
        `SELECT COUNT(DISTINCT CASE WHEN name = 'page_view' THEN vid END) AS visit,
                COUNT(DISTINCT CASE WHEN name IN ('tile_click', 'search_click') THEN vid END) AS click,
                COUNT(DISTINCT CASE WHEN name = 'play_start' THEN vid END) AS play,
                COUNT(DISTINCT CASE WHEN name = 'play_30s' THEN vid END) AS p30
         FROM events WHERE day BETWEEN ? AND ?${f.sql}`,
        r.from,
        r.to,
        ...f.args,
      ),
      one(
        db,
        `WITH first AS (SELECT vid, MIN(day) AS d FROM sessions WHERE day BETWEEN ? AND ?${f.sql} GROUP BY vid)
         SELECT COUNT(DISTINCT first.vid) AS n FROM first JOIN sessions s ON s.vid = first.vid AND s.day > first.d AND s.day <= date(first.d, '+7 days')`,
        r.from,
        r.to,
        ...f.args,
      ),
      rows(
        db,
        `SELECT page_type, SUM(name = 'page_view') AS views, SUM(name = 'scroll_depth' AND value_num = 25) AS s25,
                SUM(name = 'scroll_depth' AND value_num = 50) AS s50, SUM(name = 'scroll_depth' AND value_num = 75) AS s75,
                SUM(name = 'scroll_depth' AND value_num = 100) AS s100
         FROM events WHERE day BETWEEN ? AND ? AND name IN ('page_view', 'scroll_depth')${f.sql} GROUP BY 1 ORDER BY views DESC`,
        r.from,
        r.to,
        ...f.args,
      ),
      rows(
        db,
        `SELECT list_id AS row_id, COUNT(*) AS batches, COUNT(DISTINCT sid) AS sessions, MAX(value_num) AS deepest
         FROM events WHERE name = 'row_more' AND day BETWEEN ? AND ?${f.sql} GROUP BY 1 ORDER BY batches DESC LIMIT 30`,
        r.from,
        r.to,
        ...f.args,
      ),
      rows(db, `SELECT page_type, value_text FROM events WHERE name = 'web_vitals' AND day BETWEEN ? AND ?${f.sql} LIMIT 20000`, r.from, r.to, ...f.args),
      rows(db, `SELECT day, SUM(engaged_s) AS e, COUNT(*) AS s FROM sessions WHERE day BETWEEN ? AND ?${f.sql} GROUP BY day`, r.from, r.to, ...f.args),
    ]);
    const visit = num(funnel.visit) ?? 0;
    const steps: [string, number | null][] = [
      ['Visited a page', num(funnel.visit)],
      ['Clicked a game tile', num(funnel.click)],
      ['Started a game', num(funnel.play)],
      ['Played 30 seconds', num(funnel.p30)],
      ['Came back within 7 days', num(back.n)],
    ];
    tables.unshift({
      id: 'funnel',
      title: 'Funnel (unique visitors)',
      columns: [
        { key: 'step', label: 'Step' },
        { key: 'visitors', label: 'Visitors', fmt: 'int' },
        { key: 'share', label: 'Of all visitors', fmt: 'pct' },
      ],
      rows: visit ? steps.map(([step, v]) => ({ step, visitors: v, share: ratio(v, visit) })) : [],
      empty: 'No visits in these dates (raw events are kept 90 days).',
      note: 'Coming back within 7 days is still counting for visitors who first came in the last 7 days.',
    });
    tables.push({
      id: 'scroll',
      title: 'Scroll depth by page type',
      columns: [
        { key: 'page_type', label: 'Page type' },
        { key: 'views', label: 'Page views', fmt: 'int' },
        { key: 'p25', label: '25%', fmt: 'pct' },
        { key: 'p50', label: '50%', fmt: 'pct' },
        { key: 'p75', label: '75%', fmt: 'pct' },
        { key: 'p100', label: '100%', fmt: 'pct' },
      ],
      rows: scroll
        .filter((x) => (num(x.views) ?? 0) > 0)
        .map((x) => ({ page_type: x.page_type, views: x.views, p25: ratio(num(x.s25), num(x.views)), p50: ratio(num(x.s50), num(x.views)), p75: ratio(num(x.s75), num(x.views)), p100: ratio(num(x.s100), num(x.views)) })),
      empty: 'No page views in these dates.',
    });
    tables.push({
      id: 'row-more',
      title: 'Endless rows: more games loaded',
      columns: [
        { key: 'row_id', label: 'Row' },
        { key: 'batches', label: 'Batches loaded', fmt: 'int' },
        { key: 'sessions', label: 'Sessions', fmt: 'int' },
        { key: 'deepest', label: 'Deepest batch', fmt: 'int' },
      ],
      rows: more,
      empty: 'No endless-row loads in these dates.',
    });
    const byType = new Map<string, { lcp: number[]; inp: number[]; cls: number[] }>();
    for (const v of vitals) {
      const [lcp, inp, cls] = String(v.value_text ?? '').split(',').map(Number);
      const t = byType.get(String(v.page_type)) ?? { lcp: [], inp: [], cls: [] };
      if (Number.isFinite(lcp)) t.lcp.push(lcp);
      if (Number.isFinite(inp)) t.inp.push(inp);
      if (Number.isFinite(cls)) t.cls.push(cls);
      byType.set(String(v.page_type), t);
    }
    tables.push({
      id: 'vitals',
      title: 'Speed for real visitors (75th percentile, 10% sample)',
      columns: [
        { key: 'page_type', label: 'Page type' },
        { key: 'n', label: 'Samples', fmt: 'int' },
        { key: 'lcp', label: 'LCP (ms)', fmt: 'int' },
        { key: 'inp', label: 'INP (ms)', fmt: 'int' },
        { key: 'cls', label: 'CLS', fmt: 'dec' },
      ],
      rows: [...byType.entries()].map(([page_type, t]) => ({ page_type, n: t.lcp.length, lcp: p75(t.lcp), inp: p75(t.inp), cls: p75(t.cls) })),
      empty: 'No speed samples in these dates.',
    });
    const days = dayList(r.from, r.to);
    const by = new Map(engagedPerDay.map((x) => [String(x.day), ratio(num(x.e), num(x.s))]));
    charts.push({ id: 'engaged', title: 'Avg engaged time per session (seconds)', x: days, series: [{ name: 'Seconds', values: days.map((d) => by.get(d) ?? null) }], empty: 'No sessions in these dates.' });
  }
  return { kpis, charts, tables };
};
