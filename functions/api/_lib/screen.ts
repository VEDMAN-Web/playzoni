// Shape of every analytics screen response (shared by the Functions and the admin pages). A value of null means
// "no data": the admin shows "No data" or "n/a" and never makes up a number (docs/ADMIN.md §5).
export type Fmt = 'int' | 'dec' | 'pct' | 'sec' | 'money' | 'text' | 'day' | 'time' | 'thumb' | 'bool' | 'json';

export interface Kpi {
  id: string;
  label: string;
  value: number | null;
  /** Same number for the previous period (only when "compare" is on). */
  prev?: number | null;
  fmt: Fmt;
  note?: string;
}

export interface Series {
  name: string;
  values: (number | null)[];
  /** Grey line: the previous period. */
  prev?: boolean;
}

export interface Chart {
  id: string;
  title: string;
  /** Day labels (YYYY-MM-DD) or other x labels. */
  x: string[];
  series: Series[];
  empty: string;
}

export interface Column {
  key: string;
  label: string;
  fmt?: Fmt;
  /** Link template, for example "/admin/game?slug={slug}". */
  link?: string;
}

export type Cell = string | number | null;

export interface Table {
  id: string;
  title: string;
  columns: Column[];
  rows: Record<string, Cell>[];
  /** Shown instead of the table when there are no rows: says why. */
  empty: string;
  note?: string;
  /** Show the rows as a bar list (label column + one number column) instead of a table. */
  bars?: { label: string; value: string };
}

export interface Screen {
  demo: boolean;
  range?: { from: string; to: string; prevFrom: string; prevTo: string; compare: boolean };
  kpis?: Kpi[];
  charts?: Chart[];
  tables?: Table[];
  notes?: string[];
}
