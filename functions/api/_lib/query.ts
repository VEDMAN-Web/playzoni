// Reads the date range and filters every analytics screen accepts:
// ?from=YYYY-MM-DD&to=YYYY-MM-DD&compare=1&country=IN&device=mobile&lang=en
import type { D1Database } from './types';
import { addDays, day, dayOf, daysBetween } from './validate';

export interface Range {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  compare: boolean;
  days: number;
  country: string | null;
  device: string | null;
  lang: string | null;
}

export const MAX_DAYS = 366;

export function readRange(url: URL, now = Date.now()): Range {
  const today = dayOf(now);
  let to = day(url.searchParams.get('to')) ?? today;
  let from = day(url.searchParams.get('from')) ?? addDays(to, -6);
  if (to > today) to = today;
  if (from > to) from = to;
  if (daysBetween(from, to) >= MAX_DAYS) from = addDays(to, -(MAX_DAYS - 1));
  const days = daysBetween(from, to) + 1;
  const country = (url.searchParams.get('country') ?? '').toUpperCase();
  const device = url.searchParams.get('device') ?? '';
  const lang = (url.searchParams.get('lang') ?? '').toLowerCase();
  return {
    from,
    to,
    prevTo: addDays(from, -1),
    prevFrom: addDays(from, -days),
    compare: url.searchParams.get('compare') === '1',
    days,
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    device: ['mobile', 'tablet', 'desktop'].includes(device) ? device : null,
    lang: /^[a-z]{2}(-[a-z]{2})?$/.test(lang) ? lang : null,
  };
}

/** Every day from `from` to `to`, inclusive. */
export function dayList(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Demo mode (local sample data only): settings.demo = true. */
export async function isDemo(db: D1Database): Promise<boolean> {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'demo'").first<{ value: string }>();
  return row?.value === 'true';
}

/**
 * SQL filter for raw tables (events, sessions) from the country/device/lang filters.
 * Returns the extra WHERE text (starting with " AND") and its values.
 */
export function rawFilter(r: Range, alias = ''): { sql: string; args: string[] } {
  const p = alias ? `${alias}.` : '';
  const parts: string[] = [];
  const args: string[] = [];
  if (r.country) {
    parts.push(`${p}country = ?`);
    args.push(r.country);
  }
  if (r.device) {
    parts.push(`${p}device = ?`);
    args.push(r.device);
  }
  if (r.lang) {
    parts.push(`${p}lang = ?`);
    args.push(r.lang);
  }
  return { sql: parts.map((x) => ` AND ${x}`).join(''), args };
}

/** daily_site row selector for one filter at a time ('*' = all). Country wins over device, device over language. */
export function siteKey(r: Range): [string, string, string] {
  if (r.country) return [r.country, '*', '*'];
  if (r.device) return ['*', r.device, '*'];
  if (r.lang) return ['*', '*', r.lang];
  return ['*', '*', '*'];
}

export const ratio = (a: number | null, b: number | null): number | null => (a === null || b === null || b === 0 ? null : a / b);
