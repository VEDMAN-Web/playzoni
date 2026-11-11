// Shared queries for the analytics screens. Raw tables (events, sessions) give exact unique visitors but only keep 90
// days; older ranges fall back to the daily rollups (where unique visitors are added up day by day).
import type { Range } from './query';
import { dayList, rawFilter, siteKey } from './query';
import type { Cell, Series } from './screen';
import type { D1Database } from './types';
import { addDays, dayOf } from './validate';
import { RAW_DAYS } from './rollup';

export type Row = Record<string, Cell>;

export async function rows(db: D1Database, sql: string, ...args: unknown[]): Promise<Row[]> {
  return (await db.prepare(sql).bind(...args).all<Row>()).results;
}

export async function one(db: D1Database, sql: string, ...args: unknown[]): Promise<Row> {
  return (await db.prepare(sql).bind(...args).first<Row>()) ?? {};
}

export const num = (v: Cell | undefined): number | null => (v === null || v === undefined || v === '' ? null : Number(v));

/** True when the whole period is still in the raw tables (last 90 days). */
export const rawCovers = (from: string, now = Date.now()): boolean => from >= addDays(dayOf(now), -RAW_DAYS + 1);

export interface Totals {
  visitors: number | null;
  newVisitors: number | null;
  sessions: number | null;
  pageViews: number | null;
  engaged: number | null;
  plays: number | null;
  exact: boolean;
}

/** Site totals for a period, with the screen filters. Null values when there were no sessions at all. */
export async function siteTotals(db: D1Database, r: Range, from: string, to: string): Promise<Totals> {
  if (rawCovers(from)) {
    const f = rawFilter(r);
    const t = await one(
      db,
      `SELECT COUNT(DISTINCT vid) AS v, COUNT(DISTINCT CASE WHEN is_new = 1 THEN vid END) AS nv, COUNT(*) AS s,
              SUM(pages) AS pv, SUM(engaged_s) AS e, SUM(plays) AS p
       FROM sessions WHERE day BETWEEN ? AND ?${f.sql}`,
      from,
      to,
      ...f.args,
    );
    const has = (num(t.s) ?? 0) > 0;
    return { visitors: has ? num(t.v) : null, newVisitors: has ? num(t.nv) : null, sessions: has ? num(t.s) : null, pageViews: has ? num(t.pv) : null, engaged: has ? num(t.e) : null, plays: has ? num(t.p) : null, exact: true };
  }
  const [c, d, l] = siteKey(r);
  const t = await one(
    db,
    `SELECT SUM(visitors) AS v, SUM(new_visitors) AS nv, SUM(sessions) AS s, SUM(page_views) AS pv, SUM(engaged_s) AS e, SUM(plays) AS p
     FROM daily_site WHERE day BETWEEN ? AND ? AND country = ? AND device = ? AND lang = ?`,
    from,
    to,
    c,
    d,
    l,
  );
  const has = (num(t.s) ?? 0) > 0;
  return { visitors: has ? num(t.v) : null, newVisitors: has ? num(t.nv) : null, sessions: has ? num(t.s) : null, pageViews: has ? num(t.pv) : null, engaged: has ? num(t.e) : null, plays: has ? num(t.p) : null, exact: false };
}

/** One value per day from daily_site (for charts). Days without a row are null, not 0. */
export async function dailySite(db: D1Database, r: Range, from: string, to: string, column: string): Promise<(number | null)[]> {
  const [c, d, l] = siteKey(r);
  const list = await rows(db, `SELECT day, ${column} AS v FROM daily_site WHERE day BETWEEN ? AND ? AND country = ? AND device = ? AND lang = ?`, from, to, c, d, l);
  const by = new Map(list.map((x) => [String(x.day), num(x.v)]));
  return dayList(from, to).map((day) => by.get(day) ?? null);
}

/** A series for the previous period, aligned by position with the current one. */
export async function prevSeries(db: D1Database, r: Range, column: string, name: string): Promise<Series> {
  return { name, prev: true, values: await dailySite(db, r, r.prevFrom, r.prevTo, column) };
}

/** Return rate after n days for cohorts whose first day is in the period (all visitors, no filters). */
export async function returnRate(db: D1Database, from: string, to: string, n: number, now = Date.now()): Promise<number | null> {
  const last = addDays(dayOf(now), -n);
  const end = to < last ? to : last;
  if (end < from) return null;
  const t = await one(
    db,
    `SELECT SUM(CASE WHEN day_n = 0 THEN visitors END) AS base, SUM(CASE WHEN day_n = ? THEN visitors END) AS back
     FROM retention WHERE cohort_day BETWEEN ? AND ?`,
    n,
    from,
    end,
  );
  const base = num(t.base);
  if (!base) return null;
  return (num(t.back) ?? 0) / base;
}

/** Real ad earnings (AdSense import only). Null when nothing has been imported. */
export async function earnings(db: D1Database, from: string, to: string): Promise<number | null> {
  const t = await one(db, 'SELECT SUM(earnings) AS e, COUNT(earnings) AS n FROM daily_ads WHERE day BETWEEN ? AND ?', from, to);
  return (num(t.n) ?? 0) > 0 ? num(t.e) : null;
}

/** "Group by" over sessions (raw) or the daily_site rollup, for country/device/language lists. */
export async function sessionsBy(db: D1Database, r: Range, column: 'country' | 'device' | 'lang', limit = 10): Promise<Row[]> {
  if (rawCovers(r.from)) {
    const f = rawFilter(r);
    return rows(
      db,
      `SELECT COALESCE(${column}, '') AS k, COUNT(DISTINCT vid) AS visitors, COUNT(*) AS sessions, SUM(plays) AS plays
       FROM sessions WHERE day BETWEEN ? AND ?${f.sql} GROUP BY 1 ORDER BY visitors DESC LIMIT ?`,
      r.from,
      r.to,
      ...f.args,
      limit,
    );
  }
  const key = column === 'country' ? "device = '*' AND lang = '*' AND country != '*'" : column === 'device' ? "country = '*' AND lang = '*' AND device != '*'" : "country = '*' AND device = '*' AND lang != '*'";
  return rows(
    db,
    `SELECT ${column} AS k, SUM(visitors) AS visitors, SUM(sessions) AS sessions, SUM(plays) AS plays
     FROM daily_site WHERE day BETWEEN ? AND ? AND ${key} GROUP BY 1 ORDER BY visitors DESC LIMIT ?`,
    r.from,
    r.to,
    limit,
  );
}

export const NO_VISITS = 'No visits in these dates. Numbers start when measurement is turned on and visitors arrive.';
