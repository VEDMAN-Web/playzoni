// Admin screen "Home feed" (T10.17, docs/ADMIN.md §5.6): choose which game sits in which slot of the home mosaic, and which
// rows show. Desktop: a picture of the home grid with the real tile sizes and thumbnails; drag a game onto a slot, or drag
// one slot onto another to swap. Phones (and the list view): the same slots as a numbered list with up/down buttons.
// A pin icon marks chosen slots. Saving is instant (D1 home_layout, per language) and audited; the public site applies
// the pins by swapping tile contents (src/lib/admin-config.ts), so nothing moves and no game repeats.
import { cleanPins, heroToPins, shownSlots, type Pin, type Slot } from '../lib/home-pins';
import { ApiError, apiGet, apiPost, can, getMe, staticJson, type Me } from './api';
import { LANGS, rowId, sortable } from './controls';
import { field, showSaveResult } from './forms';
import { el, empty, errorBox, skeleton } from './render';
import { DIRTY_EVENT } from './top-save';

interface Game {
  slug: string;
  title: string;
  status: string;
  /** Test games: never on the real site, so never offered here. */
  sample?: boolean;
}

const COLUMNS = 11; // the site grid at 1280 px (src/styles/tokens.css: 94 px cells, 16 px gaps)
const SEARCH_LIMIT = 40;

export async function startHomeFeed(root: HTMLElement): Promise<void> {
  root.replaceChildren(skeleton(2));
  let games: Game[];
  let slots: Slot[];
  let cats: { name: string }[];
  let me: Me;
  try {
    [games, slots, cats, me] = await Promise.all([
      staticJson<Game[]>('games'),
      fetch('/home-slots.json').then((r) => {
        if (!r.ok) throw new ApiError(r.status, 'Could not load home-slots.json (the home page must be built first).');
        return r.json() as Promise<Slot[]>;
      }),
      staticJson<{ name: string }[]>('categories'),
      getMe(),
    ]);
  } catch (error) {
    root.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load the build data.', () => void startHomeFeed(root)));
    return;
  }
  const editor = can(me, 'editor');
  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const titleOf = (slug: string): string => bySlug.get(slug)?.title ?? slug;
  const built = slots.map((s) => s.slug);
  const live = games.filter((g) => g.status === 'published' && !g.sample);

  let pins: Pin[] = [];
  let selected: number | null = null;
  let note = '';

  const lang = el('select', {}, ...LANGS.map(([v, t]) => el('option', { value: v }, t)));
  const gridBox = el('div', { class: 'adm-feed-grid', role: 'group', 'aria-label': 'Home grid, one button per game slot' });
  const listBox = el('ol', { class: 'adm-feed-list', 'aria-label': 'Home slots in page order' });
  const rowsBox = el('div');
  const noteBox = el('p', { class: 'adm-hint', 'aria-live': 'polite' });
  const result = el('div', { 'aria-live': 'polite' });
  const search = el('input', { type: 'search', placeholder: 'Search games by name', disabled: !editor });
  const found = el('ul', { class: 'adm-feed-found' });
  const status = el('p', { class: 'adm-hint', 'aria-live': 'polite' });
  const save = el('button', { class: 'adm-btn adm-btn-primary', type: 'button', disabled: !editor }, 'Save home feed');
  const unpin = el('button', { class: 'adm-btn', type: 'button', disabled: true }, 'Unpin slot');
  const reset = el('button', { class: 'adm-btn', type: 'button', disabled: !editor }, 'Reset to popularity');
  const viewToggle = el('button', { class: 'adm-btn', type: 'button', 'aria-pressed': 'false' }, 'List view');
  let rows: ReturnType<typeof sortable> | null = null;

  // R50: tell the top Save button that something changed (this screen has no form fields).
  const changed = (): void => void save.dispatchEvent(new CustomEvent(DIRTY_EVENT, { bubbles: true }));
  const isPinned = (i: number): boolean => pins.some((p) => p.i === i);
  const shown = (): string[] => shownSlots(built, pins);

  // Pin `slug` to slot `i` (one slot per game, one game per slot). The game that was in the slot goes where `slug` was.
  function assign(i: number, slug: string): void {
    pins = cleanPins([...pins.filter((p) => p.slug !== slug && p.i !== i), { i, slug }]);
    changed();
  }
  // Swap what two slots show; both become pins.
  function swap(a: number, b: number): void {
    const now = shown();
    const [ga, gb] = [now[a], now[b]];
    if (!ga || !gb) return;
    assign(a, gb);
    assign(b, ga);
  }

  const thumb = (slug: string, size: number): HTMLImageElement => el('img', { class: 'adm-feed-img', src: `/thumbs/${slug}/s.webp`, width: String(size), height: String(size), alt: '', loading: 'lazy' });
  const pinIcon = (): HTMLElement => el('span', { class: 'adm-feed-pin', 'aria-hidden': 'true', title: 'Pinned' }, '📌');

  function select(i: number | null): void {
    selected = i;
    draw();
    if (i !== null) status.textContent = `Slot ${i + 1} selected: ${titleOf(shown()[i])}. Pick a game on the right to put it here.`;
    else status.textContent = '';
  }

  function drawGrid(now: string[]): void {
    const cells: Node[] = [el('div', { class: 'adm-feed-nav', 'aria-hidden': 'true' }, 'Menu')];
    slots.forEach((s) => {
      const slug = now[s.i];
      const btn = el(
        'button',
        {
          class: `adm-feed-tile adm-feed-${s.size.toLowerCase()}${selected === s.i ? ' is-selected' : ''}${isPinned(s.i) ? ' is-pinned' : ''}`,
          type: 'button',
          'aria-pressed': selected === s.i ? 'true' : 'false',
          'aria-label': `Slot ${s.i + 1}, ${s.size === 'S' ? 'small' : 'big'} tile: ${titleOf(slug)}${isPinned(s.i) ? ', pinned' : ''}`,
          draggable: editor ? 'true' : undefined,
        },
        thumb(slug, 96),
        el('span', { class: 'adm-feed-num' }, String(s.i + 1)),
        isPinned(s.i) ? pinIcon() : null,
      );
      btn.addEventListener('click', () => select(selected === s.i ? null : s.i));
      if (editor) {
        btn.addEventListener('dragstart', (e) => e.dataTransfer?.setData('text/plain', `slot:${s.i}`));
        btn.addEventListener('dragover', (e) => {
          e.preventDefault();
          btn.classList.add('is-over');
        });
        btn.addEventListener('dragleave', () => btn.classList.remove('is-over'));
        btn.addEventListener('drop', (e) => {
          e.preventDefault();
          const data = e.dataTransfer?.getData('text/plain') ?? '';
          if (data.startsWith('slot:')) swap(s.i, Number(data.slice(5)));
          else if (data.startsWith('game:')) assign(s.i, data.slice(5));
          else return;
          draw();
        });
      }
      cells.push(btn);
    });
    gridBox.replaceChildren(...cells);
  }

  function drawList(now: string[]): void {
    listBox.replaceChildren(
      ...slots.map((s) => {
        const slug = now[s.i];
        const up = el('button', { class: 'adm-icon-btn', type: 'button', 'aria-label': `Move slot ${s.i + 1} up`, disabled: !editor || s.i === 0 }, '↑');
        const down = el('button', { class: 'adm-icon-btn', type: 'button', 'aria-label': `Move slot ${s.i + 1} down`, disabled: !editor || s.i === slots.length - 1 }, '↓');
        const change = el('button', { class: 'adm-btn', type: 'button', disabled: !editor }, 'Change');
        up.addEventListener('click', () => {
          swap(s.i, s.i - 1);
          draw();
        });
        down.addEventListener('click', () => {
          swap(s.i, s.i + 1);
          draw();
        });
        change.addEventListener('click', () => {
          select(s.i);
          search.focus();
        });
        return el(
          'li',
          { class: `adm-feed-row${selected === s.i ? ' is-selected' : ''}${isPinned(s.i) ? ' is-pinned' : ''}`, 'data-slot': String(s.i) },
          el('span', { class: 'adm-feed-pos' }, String(s.i + 1)),
          thumb(slug, 36),
          el('span', { class: 'adm-feed-title' }, titleOf(slug), s.size !== 'S' ? el('span', { class: 'adm-hint' }, ` (${s.size === 'XL' ? 'extra big' : 'big'} tile)`) : null),
          isPinned(s.i) ? pinIcon() : null,
          change,
          up,
          down,
        );
      }),
    );
  }

  function drawFound(): void {
    const q = search.value.trim().toLowerCase();
    const list = (q ? live.filter((g) => g.title.toLowerCase().includes(q)) : live).slice(0, SEARCH_LIMIT);
    found.replaceChildren(
      ...list.map((g) => {
        const use = el('button', { class: 'adm-btn', type: 'button', disabled: !editor || selected === null }, selected === null ? 'Pick a slot first' : `Put in slot ${selected + 1}`);
        use.addEventListener('click', () => {
          if (selected === null) return;
          assign(selected, g.slug);
          draw();
        });
        const li = el('li', { class: 'adm-feed-hit', draggable: editor ? 'true' : undefined }, thumb(g.slug, 36), el('span', { class: 'adm-feed-title' }, g.title), use);
        if (editor) li.addEventListener('dragstart', (e) => e.dataTransfer?.setData('text/plain', `game:${g.slug}`));
        return li;
      }),
    );
    if (list.length === 0) found.replaceChildren(el('li', { class: 'adm-hint' }, 'No published game matches.'));
  }

  function draw(): void {
    const now = shown();
    drawGrid(now);
    drawList(now);
    drawFound();
    unpin.disabled = !editor || selected === null || !isPinned(selected);
    reset.disabled = !editor || pins.length === 0;
    noteBox.textContent = note || (pins.length ? `${pins.length} slot${pins.length === 1 ? ' is' : 's are'} pinned.` : 'No slot is pinned: the home page uses the built order (popularity).');
  }

  async function load(): Promise<void> {
    gridBox.replaceChildren(skeleton(1));
    selected = null;
    note = '';
    try {
      const data = await apiGet<{ hero: string[]; slots: Pin[]; rows: { id: string; active: boolean }[] }>('home-layout', new URLSearchParams({ lang: lang.value }));
      pins = cleanPins(data.slots);
      if (pins.length === 0 && data.hero.length > 0) {
        // Old hero entries become pins on the big tiles (saving writes them as pins and clears the hero list).
        pins = cleanPins(heroToPins(data.hero, slots));
        note = 'The old hero order was turned into pins on the big tiles. Save to keep it.';
      }
      const defaults = ['Popular games', 'New games', ...cats.map((c) => c.name)].map((t) => ({ id: rowId(t), label: t, active: true }));
      const labels = new Map(defaults.map((d) => [d.id, d.label]));
      const savedRows = data.rows.map((r) => ({ id: r.id, label: labels.get(r.id) ?? r.id, active: r.active }));
      rows = sortable([...savedRows, ...defaults.filter((d) => !savedRows.some((s) => s.id === d.id))], { toggle: true, disabled: !editor });
      rowsBox.replaceChildren(rows.node);
      draw();
    } catch (error) {
      gridBox.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load the home feed.', () => void load()));
    }
  }

  search.addEventListener('input', drawFound);
  lang.setAttribute('data-no-dirty', '');
  lang.addEventListener('change', () => void load());
  // Row order changes (up/down buttons, drag and drop) do not fire input events.
  rowsBox.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('button')) changed();
  });
  rowsBox.addEventListener('drop', () => changed());
  unpin.addEventListener('click', () => {
    if (selected === null) return;
    pins = pins.filter((p) => p.i !== selected);
    changed();
    draw();
  });
  reset.addEventListener('click', () => {
    pins = [];
    changed();
    note = '';
    draw();
  });
  viewToggle.addEventListener('click', () => {
    const on = root.classList.toggle('adm-feed-list-view');
    viewToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    viewToggle.textContent = on ? 'Grid view' : 'List view';
  });
  save.addEventListener('click', async () => {
    if (!rows) return;
    save.disabled = true;
    try {
      const r = await apiPost<{ message: string }>('home-layout', {
        lang: lang.value,
        hero: [],
        slots: pins,
        rows: rows.value().map((i) => ({ id: i.id, active: i.active !== false })),
      });
      note = '';
      draw();
      showSaveResult(result, r);
    } catch (error) {
      showSaveResult(result, null, error);
    } finally {
      save.disabled = false;
    }
  });

  root.replaceChildren(
    el('div', { class: 'adm-toolbar' }, field('Language', lang), unpin, reset, viewToggle),
    noteBox,
    el(
      'div',
      { class: 'adm-feed adm-section' },
      el(
        'section',
        { class: 'adm-card adm-feed-main' },
        el('h2', { class: 'adm-card-title' }, 'Home feed'),
        el('p', { class: 'adm-hint' }, 'Pick a slot, then pick a game. On a computer you can also drag a game onto a slot, or drag one slot onto another to swap them. A pin marks a chosen slot. The picture shows the game tiles only (category tiles are not drawn), so it is a close picture of the page, not an exact copy.'),
        gridBox,
        listBox,
        status,
      ),
      el('section', { class: 'adm-card adm-feed-side' }, el('h2', { class: 'adm-card-title' }, 'Games'), field('Search', search), found, live.length ? null : empty('No published games yet.')),
    ),
    el('section', { class: 'adm-card adm-section' }, el('h2', { class: 'adm-card-title' }, 'Rows on the home page'), el('p', { class: 'adm-hint' }, 'Tick to show a row. Order from top to bottom.'), rowsBox),
    el('div', { class: 'adm-form-actions' }, save),
    result,
    el('p', { class: 'adm-hint' }, 'Tile sizes stay as built: changing sizes needs a rebuild of the home page (later, through the GitHub App).'),
  );
  root.style.setProperty('--feed-cols', String(COLUMNS));
  await load();
}
