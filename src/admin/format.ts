// Number formatting and CSV for the admin. Pure functions (unit-tested). Empty values never become 0.
import type { Cell, Column, Fmt } from '../../functions/api/_lib/screen';

export const NO_DATA = 'No data';
export const NA = 'n/a';

const int = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
const dec = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

export function duration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function fmt(value: Cell | undefined, kind: Fmt = 'int', empty = NA): string {
  if (value === null || value === undefined || value === '') return empty;
  if (typeof value === 'string') {
    if (kind === 'time') return new Date(Number(value) || value).toISOString().replace('T', ' ').slice(0, 16);
    return value;
  }
  if (!Number.isFinite(value)) return empty;
  switch (kind) {
    case 'pct':
      return `${dec.format(value * 100)}%`;
    case 'sec':
      return duration(value);
    case 'money':
      return `$${value.toFixed(2)}`;
    case 'dec':
      return dec.format(value);
    case 'time':
      return new Date(value).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    case 'bool':
      return value ? 'Yes' : 'No';
    case 'text':
    case 'day':
    case 'thumb':
    case 'json':
      return String(value);
    default:
      return int.format(value);
  }
}

/** Change against the previous period, for example "+12% vs previous". Null when it cannot be computed. */
export function delta(now: number | null, prev: number | null | undefined): { text: string; up: boolean } | null {
  if (now === null || prev === null || prev === undefined) return null;
  if (prev === 0) return now === 0 ? { text: 'Same as previous', up: false } : null;
  const change = (now - prev) / Math.abs(prev);
  const sign = change > 0 ? '+' : '';
  return { text: `${sign}${dec.format(change * 100)}% vs previous`, up: change > 0 };
}

/** CSV (RFC 4180). Cells that start with = + - @ get a leading apostrophe so spreadsheets never run them. */
export function toCsv(columns: Column[], rows: Record<string, Cell>[]): string {
  const cell = (v: Cell | undefined): string => {
    if (v === null || v === undefined) return '';
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => cell(c.label)).join(','), ...rows.map((r) => columns.map((c) => cell(r[c.key])).join(','))];
  return `${lines.join('\r\n')}\r\n`;
}

export function fillTemplate(template: string, row: Record<string, Cell>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => encodeURIComponent(String(row[key] ?? '')));
}
