// DOM builders for admin screens: KPI cards, charts (uPlot, loaded only when a chart is drawn), tables with CSV export
// (stacked cards on phones), bar lists, empty, loading and error states. No HTML strings: text can never inject markup.
import type { Cell, Chart, Column, Kpi, Screen, Table } from '../../functions/api/_lib/screen';
import { delta, fillTemplate, fmt, NO_DATA, toCsv } from './format';

type Child = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | boolean | undefined> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') node.className = String(v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) node.append(c);
  return node;
}

export function skeleton(count = 3): HTMLElement {
  const wrap = el('div', { class: 'adm-grid', 'aria-busy': 'true', 'aria-label': 'Loading' });
  for (let i = 0; i < count; i++) wrap.append(el('div', { class: 'adm-skeleton' }));
  return wrap;
}

export function errorBox(message: string, retry?: () => void): HTMLElement {
  const box = el('div', { class: 'adm-error', role: 'alert' }, el('span', {}, message));
  if (retry) {
    const btn = el('button', { class: 'adm-btn', type: 'button' }, 'Try again');
    btn.addEventListener('click', retry);
    box.append(btn);
  }
  return box;
}

export const empty = (text: string): HTMLElement => el('p', { class: 'adm-empty' }, text);

export function card(title: string, ...children: Child[]): HTMLElement {
  return el('section', { class: 'adm-card' }, el('div', { class: 'adm-card-head' }, el('h2', { class: 'adm-card-title' }, title)), ...children);
}

export function kpiCards(kpis: Kpi[]): HTMLElement {
  const wrap = el('div', { class: 'adm-kpis' });
  for (const k of kpis) {
    const d = delta(k.value, k.prev);
    wrap.append(
      el(
        'div',
        { class: 'adm-kpi', 'data-kpi': k.id },
        el('p', { class: 'adm-kpi-label' }, k.label),
        el('p', { class: `adm-kpi-value${k.value === null ? ' is-empty' : ''}` }, fmt(k.value, k.fmt, NO_DATA)),
        d ? el('p', { class: `adm-kpi-delta${d.up ? ' up' : ''}` }, d.text) : null,
        k.prev !== undefined && k.prev !== null && !d ? el('p', { class: 'adm-kpi-delta' }, `Previous: ${fmt(k.prev, k.fmt, NO_DATA)}`) : null,
        k.note ? el('p', { class: 'adm-kpi-note' }, k.note) : null,
      ),
    );
  }
  return wrap;
}

export function downloadCsv(name: string, columns: Column[], rows: Record<string, Cell>[]): void {
  const blob = new Blob([toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `${name}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cellNode(col: Column, row: Record<string, Cell>): Node {
  const value = row[col.key];
  if (col.fmt === 'thumb') {
    const slug = typeof value === 'string' ? value : '';
    return el('img', { class: 'adm-thumb', src: `/thumbs/${slug}/s.webp`, width: '36', height: '36', alt: '', loading: 'lazy' });
  }
  const text = fmt(value, col.fmt ?? 'text');
  if (col.link && value !== null && value !== undefined && value !== '') return el('a', { href: fillTemplate(col.link, row) }, text);
  return document.createTextNode(text);
}

const isNum = (c: Column): boolean => ['int', 'dec', 'pct', 'sec', 'money'].includes(c.fmt ?? 'text');

export function tableNode(t: Table, extraHead?: Node, rowHook?: (tr: HTMLTableRowElement, row: Record<string, Cell>) => void): HTMLElement {
  const head = el('div', { class: 'adm-card-head' }, el('h2', { class: 'adm-card-title' }, t.title));
  const tools = el('div', { class: 'adm-toolbar' });
  if (extraHead) tools.append(extraHead);
  const csv = el('button', { class: 'adm-btn adm-btn-small', type: 'button', disabled: t.rows.length === 0 }, 'Export CSV');
  csv.addEventListener('click', () => downloadCsv(t.id, t.columns.filter((c) => c.fmt !== 'thumb'), t.rows));
  tools.append(csv);
  head.append(tools);
  const section = el('section', { class: 'adm-card', 'data-table': t.id }, head);
  if (t.rows.length === 0) {
    section.append(empty(t.empty));
  } else if (t.bars) {
    section.append(bars(t));
  } else {
    const table = el('table', { class: 'adm-table' });
    const tr = el('tr');
    for (const c of t.columns) tr.append(el('th', { scope: 'col', class: isNum(c) ? 'num' : undefined }, c.fmt === 'thumb' ? '' : c.label));
    table.append(el('thead', {}, tr));
    const body = el('tbody');
    t.rows.forEach((row) => {
      const r = el('tr');
      t.columns.forEach((c, i) => {
        const value = row[c.key];
        const cls = [isNum(c) ? 'num' : '', i === 0 || (i === 1 && t.columns[0].fmt === 'thumb') ? 'is-title' : '', value === null ? 'is-null' : ''].filter(Boolean).join(' ');
        r.append(el('td', { 'data-label': c.label, class: cls || undefined }, cellNode(c, row)));
      });
      rowHook?.(r, row);
      body.append(r);
    });
    table.append(body);
    section.append(el('div', { class: 'adm-table-wrap' }, table));
  }
  if (t.note) section.append(el('p', { class: 'adm-card-note' }, t.note));
  return section;
}

function bars(t: Table): HTMLElement {
  const spec = t.bars as { label: string; value: string };
  const valueCol = t.columns.find((c) => c.key === spec.value);
  const labelCol = t.columns.find((c) => c.key === spec.label);
  const max = Math.max(1, ...t.rows.map((r) => Number(r[spec.value]) || 0));
  const list = el('ul', { class: 'adm-bars' });
  for (const row of t.rows) {
    const v = Number(row[spec.value]) || 0;
    const fill = el('div', { class: 'adm-bar-fill' });
    fill.style.width = `${Math.max(2, (v / max) * 100)}%`;
    const labelNode = labelCol ? cellNode(labelCol, row) : document.createTextNode(String(row[spec.label] ?? ''));
    list.append(
      el(
        'li',
        { class: 'adm-bar' },
        el('span', { class: 'adm-bar-label' }, labelNode),
        el('span', {}, fmt(row[spec.value], valueCol?.fmt ?? 'int')),
        el('div', { class: 'adm-bar-track', 'aria-hidden': 'true' }, fill),
      ),
    );
  }
  return list;
}

export function chartCard(c: Chart): HTMLElement {
  const section = card(c.title);
  section.dataset.chart = c.id;
  const hasData = c.series.some((s) => !s.prev && s.values.some((v) => v !== null && v !== 0));
  if (!hasData) {
    section.append(empty(c.empty));
    return section;
  }
  const inner = el('div', { class: 'adm-chart-inner' });
  section.append(el('div', { class: 'adm-chart' }, inner));
  void drawChart(inner, c);
  return section;
}

async function drawChart(target: HTMLElement, c: Chart): Promise<void> {
  const [{ default: uPlot }] = await Promise.all([import('uplot'), import('uplot/dist/uPlot.min.css')]);
  const css = getComputedStyle(document.documentElement);
  const brand = css.getPropertyValue('--c-primary').trim();
  const brand2 = css.getPropertyValue('--c-accent-2').trim();
  const grey = css.getPropertyValue('--c-ink-2').trim();
  const line = css.getPropertyValue('--c-line').trim();
  const xs = c.x.map((_, i) => i);
  const colours = [brand, brand2];
  let n = 0;
  const series = c.series.map((s) => ({
    label: s.name,
    stroke: s.prev ? grey : colours[n++ % colours.length],
    width: 2,
    dash: s.prev ? [6, 4] : undefined,
    value: (_u: unknown, v: number | null, _s: number, idx: number | null) => (idx === null ? '' : v === null ? 'n/a' : fmt(v, 'int')),
  }));
  const width = Math.max(560, target.clientWidth || 560);
  new uPlot(
    {
      width,
      height: 260,
      series: [{ label: 'Day', value: (_u: unknown, i: number | null) => (i === null ? '' : (c.x[i] ?? '')) }, ...series],
      axes: [
        { stroke: grey, grid: { stroke: line }, values: (_u: unknown, ticks: number[]) => ticks.map((t) => (c.x[t] ?? '').slice(5)) },
        { stroke: grey, grid: { stroke: line } },
      ],
      scales: { x: { time: false } },
      cursor: { drag: { x: false, y: false } },
      legend: { live: true },
    },
    [xs, ...c.series.map((s) => s.values)],
    target,
  );
}

/** Renders a whole analytics screen into `root`. */
export function renderScreen(root: HTMLElement, screen: Screen): void {
  const parts: Node[] = [];
  if (screen.notes?.length) for (const n of screen.notes) parts.push(el('p', { class: 'adm-intro' }, n));
  if (screen.kpis?.length) parts.push(kpiCards(screen.kpis));
  const charts = el('div', { class: 'adm-grid adm-section' });
  for (const c of screen.charts ?? []) charts.append(chartCard(c));
  const pair = el('div', { class: 'adm-grid adm-grid-2 adm-section' });
  const tables = el('div', { class: 'adm-grid adm-section' });
  for (const t of screen.tables ?? []) (t.bars ? pair : tables).append(tableNode(t));
  for (const g of [charts, pair, tables]) if (g.childElementCount) parts.push(g);
  root.replaceChildren(...parts);
}
