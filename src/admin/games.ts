// Games screen (docs/ADMIN.md §5.3): all games (drafts too) from the build data, with stats for the chosen dates and
// the instant flags. Search, status filter, sort, bulk hide/feature/hero (Editor and up), CSV export.
import type { Cell, Column, Screen } from '../../functions/api/_lib/screen';
import { ApiError, apiGet, apiPost, can, getMe, staticJson } from './api';
import { NA, fmt } from './format';
import { apiParams, readState, type RangeState } from './range';
import { downloadCsv, el, empty, errorBox, skeleton } from './render';
import { RANGE_EVENT } from './shell';

export interface AdminGame {
  slug: string;
  title: string;
  status: 'draft' | 'published';
  source: string;
  categories: string[];
  featured: boolean;
  popularity: number;
  addedDate: string;
  sample: boolean;
  qa: string;
}

type Row = Record<string, Cell>;

const COLUMNS: Column[] = [
  { key: 'title', label: 'Game', link: '/admin/game?slug={slug}' },
  { key: 'state', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'cats', label: 'Categories' },
  { key: 'featured', label: 'Featured', fmt: 'bool' },
  { key: 'hero', label: 'Hero rank', fmt: 'int' },
  { key: 'qa', label: 'QA' },
  { key: 'impressions', label: 'Impressions', fmt: 'int' },
  { key: 'ctr', label: 'CTR', fmt: 'pct' },
  { key: 'plays', label: 'Plays', fmt: 'int' },
  { key: 'avg', label: 'Avg play time', fmt: 'sec' },
  { key: 'rate30', label: '30 s rate', fmt: 'pct' },
  { key: 'errors', label: 'Errors', fmt: 'int' },
];

const n = (v: Cell | undefined): number | null => (v === null || v === undefined ? null : Number(v));
const div = (a: number | null, b: number | null): number | null => (a === null || b === null || b === 0 ? null : a / b);

export function startGames(root: HTMLElement): void {
  let range: RangeState = readState();
  let games: AdminGame[] = [];
  let rows: Row[] = [];
  // Phones show 25 cards at a time (a card is ~250px tall), wider screens 100 table rows.
  const PAGE = window.matchMedia('(max-width: 767px)').matches ? 25 : 100;
  let shown = PAGE;
  const selected = new Set<string>();
  let editor = false;

  const search = el('input', { type: 'search', placeholder: 'Search games', 'aria-label': 'Search games' });
  const status = el(
    'select',
    { 'aria-label': 'Status' },
    ...[['', 'All games'], ['published', 'Published'], ['draft', 'Draft'], ['hidden', 'Hidden'], ['featured', 'Featured'], ['hero', 'In the hero']].map(([v, t]) => el('option', { value: v }, t)),
  );
  const sort = el(
    'select',
    { 'aria-label': 'Sort by' },
    ...[['plays', 'Most plays'], ['impressions', 'Most impressions'], ['ctr', 'Best CTR'], ['added', 'Newest'], ['title', 'Title A to Z'], ['popularity', 'Popularity']].map(([v, t]) => el('option', { value: v }, t)),
  );
  const csv = el('button', { class: 'adm-btn adm-btn-small', type: 'button' }, 'Export CSV');
  const toolbar = el(
    'div',
    { class: 'adm-toolbar' },
    el('div', { class: 'adm-field' }, el('label', {}, 'Search'), search),
    el('div', { class: 'adm-field' }, el('label', {}, 'Show'), status),
    el('div', { class: 'adm-field' }, el('label', {}, 'Sort'), sort),
    csv,
  );
  const count = el('p', { class: 'adm-status', 'aria-live': 'polite' });
  const bulk = el('div', { class: 'adm-toolbar', hidden: true });
  const selCount = el('span', { class: 'adm-status', 'aria-live': 'polite' });
  bulk.append(selCount);
  const message = el('p', { class: 'adm-status', role: 'status' });
  const list = el('div');
  const more = el('button', { class: 'adm-btn', type: 'button', hidden: true }, 'Show 100 more');
  root.replaceChildren(el('section', { class: 'adm-card' }, toolbar, bulk, message, count, list, more));

  const actions: [string, string][] = [
    ['hide', 'Hide'],
    ['unhide', 'Unhide'],
    ['feature', 'Feature'],
    ['unfeature', 'Unfeature'],
    ['hero-add', 'Add to hero'],
    ['hero-remove', 'Remove from hero'],
  ];
  for (const [action, text] of actions) {
    const b = el('button', { class: 'adm-btn adm-btn-small', type: 'button' }, text);
    b.addEventListener('click', () => void bulkAction(action));
    bulk.append(b);
  }

  async function bulkAction(action: string): Promise<void> {
    if (selected.size === 0) return;
    message.textContent = 'Saving';
    try {
      await apiPost('game-flags', { slugs: [...selected], action });
      message.textContent = `Done for ${selected.size} game${selected.size > 1 ? 's' : ''}. The site shows it within about a minute.`;
      selected.clear();
      await loadStats();
    } catch (error) {
      message.textContent = error instanceof ApiError ? error.message : 'Could not save. Try again.';
    }
  }

  // Game cell: select box (Editor and up), picture and the title linking to the game screen.
  function titleCell(r: Row): Node {
    const slugText = String(r.slug);
    const row = el('span', { class: 'adm-cell-row' });
    if (editor) {
      const box = el('input', { type: 'checkbox', 'aria-label': `Select ${String(r.title)}`, checked: selected.has(slugText) });
      box.addEventListener('change', () => {
        if (box.checked) selected.add(slugText);
        else selected.delete(slugText);
        syncBulk();
      });
      row.append(el('label', { class: 'adm-check adm-check-box' }, box));
    }
    row.append(
      el('img', { class: 'adm-thumb', src: `/thumbs/${slugText}/s.webp`, width: '36', height: '36', alt: '', loading: 'lazy' }),
      el('a', { href: `/admin/game?slug=${encodeURIComponent(slugText)}` }, String(r.title)),
    );
    return row;
  }

  function syncBulk(): void {
    bulk.hidden = !editor || selected.size === 0;
    selCount.textContent = `${selected.size} selected:`;
  }

  function filtered(): Row[] {
    const q = search.value.trim().toLowerCase();
    const s = status.value;
    const out = rows.filter((r) => {
      if (q && !String(r.title).toLowerCase().includes(q) && !String(r.slug).includes(q)) return false;
      if (s === 'published' || s === 'draft') return r.status === s && r.hidden !== 1;
      if (s === 'hidden') return r.hidden === 1;
      if (s === 'featured') return r.featured === 1;
      if (s === 'hero') return r.hero !== null;
      return true;
    });
    const key = sort.value;
    const val = (r: Row): number => n(r[key === 'added' ? 'addedTs' : key]) ?? -1;
    if (key === 'title') out.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    else out.sort((a, b) => val(b) - val(a));
    return out;
  }

  function draw(): void {
    const list2 = filtered();
    count.textContent = `${list2.length} of ${rows.length} games`;
    syncBulk();
    if (list2.length === 0) {
      list.replaceChildren(empty(rows.length === 0 ? 'No games in the build data.' : 'No games match.'));
      more.hidden = true;
      return;
    }
    const table = el('table', { class: 'adm-table' });
    const head = el('tr');
    for (const c of COLUMNS) head.append(el('th', { scope: 'col', class: ['int', 'pct', 'sec'].includes(c.fmt ?? '') ? 'num' : undefined }, c.label));
    table.append(el('thead', {}, head));
    const body = el('tbody');
    for (const r of list2.slice(0, shown)) {
      const tr = el('tr');
      for (const c of COLUMNS) {
        const v = r[c.key];
        const isNum = ['int', 'pct', 'sec'].includes(c.fmt ?? '');
        let node: Node;
        if (c.key === 'title') node = titleCell(r);
        else node = document.createTextNode(fmt(v, c.fmt ?? 'text', NA));
        tr.append(el('td', { 'data-label': c.label, class: [isNum ? 'num' : '', c.key === 'title' ? 'is-title' : '', v === null ? 'is-null' : ''].filter(Boolean).join(' ') || undefined }, node));
      }
      body.append(tr);
    }
    table.append(body);
    list.replaceChildren(el('div', { class: 'adm-table-wrap' }, table));
    more.hidden = list2.length <= shown;
  }

  async function loadStats(): Promise<void> {
    list.replaceChildren(skeleton(1));
    try {
      const [screen, me] = await Promise.all([apiGet<Screen>('games', apiParams(range)), getMe()]);
      editor = can(me, 'editor');
      const stats = new Map((screen.tables?.find((t) => t.id === 'stats')?.rows ?? []).map((s) => [String(s.slug), s]));
      const flags = new Map((screen.tables?.find((t) => t.id === 'flags')?.rows ?? []).map((s) => [String(s.slug), s]));
      rows = games.map((g) => {
        const s = stats.get(g.slug) ?? {};
        const f = flags.get(g.slug) ?? {};
        const hidden = n(f.hidden) === 1 ? 1 : 0;
        const imp = n(s.impressions);
        const plays = n(s.plays);
        return {
          slug: g.slug,
          title: g.title,
          status: g.status,
          state: hidden ? 'hidden' : g.status,
          hidden,
          source: g.source,
          cats: g.categories.join(', '),
          featured: n(f.featured) === 1 || g.featured ? 1 : 0,
          hero: n(f.hero_rank),
          qa: g.qa,
          impressions: imp,
          ctr: div(n(s.clicks), imp),
          plays,
          avg: div(n(s.play_s), plays),
          rate30: div(n(s.plays_30s), plays),
          errors: n(s.errors),
          addedTs: Date.parse(g.addedDate),
          popularity: g.popularity,
        };
      });
      draw();
    } catch (error) {
      list.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load the games.', () => void loadStats()));
    }
  }

  csv.addEventListener('click', () => downloadCsv('games', COLUMNS.concat({ key: 'slug', label: 'Slug' }), filtered()));
  for (const input of [search, status, sort]) input.addEventListener('input', () => ((shown = PAGE), draw()));
  more.addEventListener('click', () => ((shown += PAGE), draw()));
  document.addEventListener(RANGE_EVENT, (e) => {
    range = (e as CustomEvent<RangeState>).detail;
    void loadStats();
  });

  root.prepend(skeleton(1));
  staticJson<AdminGame[]>('games')
    .then((list2) => {
      games = list2;
      root.querySelector('.adm-skeleton')?.parentElement?.remove();
      return loadStats();
    })
    .catch(() => root.replaceChildren(errorBox('Could not load the game list (/admin/data/games.json).', () => location.reload())));
}
