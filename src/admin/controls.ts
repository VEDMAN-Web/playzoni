// Instant controls (docs/ADMIN.md §5.6, §5.14, §5.15): home layout (hero order, rows), banners and notices, settings.
// All saves are instant through /api/config (about a minute) and are written to the audit log.
import { ApiError, apiGet, apiPost, can, getMe, staticJson, type Me } from './api';
import { field, showSaveResult } from './forms';
import { el, empty, errorBox, skeleton } from './render';

interface Item {
  id: string;
  label: string;
  thumb?: string;
  active?: boolean;
}

/** A list that can be reordered by drag and drop or with up/down buttons (keyboard and phones). */
export function sortable(items: Item[], opts: { toggle?: boolean; remove?: boolean; disabled?: boolean }): { node: HTMLElement; value(): Item[]; add(item: Item): void } {
  const list = el('ol', { class: 'adm-sortable' });
  let dragged: HTMLElement | null = null;
  const data = new WeakMap<HTMLElement, Item>();
  const renumber = (): void => {
    [...list.children].forEach((li, i) => {
      const pos = li.querySelector('.adm-sort-pos');
      if (pos) pos.textContent = String(i + 1);
    });
  };
  const move = (li: HTMLElement, dir: -1 | 1): void => {
    const sib = dir < 0 ? li.previousElementSibling : li.nextElementSibling;
    if (!sib) return;
    if (dir < 0) sib.before(li);
    else sib.after(li);
    renumber();
    li.querySelector<HTMLButtonElement>(dir < 0 ? '[data-up]' : '[data-down]')?.focus();
  };
  const add = (item: Item): void => {
    const li = el('li', { class: 'adm-sort-item', draggable: opts.disabled ? undefined : 'true' });
    data.set(li, item);
    const handle = el('span', { class: 'adm-sort-handle', 'aria-hidden': 'true' }, '⋮⋮');
    const up = el('button', { class: 'adm-icon-btn', type: 'button', 'aria-label': `Move ${item.label} up`, 'data-up': true, disabled: opts.disabled }, '↑');
    const down = el('button', { class: 'adm-icon-btn', type: 'button', 'aria-label': `Move ${item.label} down`, 'data-down': true, disabled: opts.disabled }, '↓');
    up.addEventListener('click', () => move(li, -1));
    down.addEventListener('click', () => move(li, 1));
    li.append(handle, el('span', { class: 'adm-sort-pos' }));
    if (item.thumb) li.append(el('img', { class: 'adm-thumb', src: item.thumb, width: '36', height: '36', alt: '' }));
    li.append(el('span', { class: 'adm-sort-label' }, item.label));
    if (opts.toggle) {
      const box = el('input', { type: 'checkbox', checked: item.active !== false, 'aria-label': `Show ${item.label}`, disabled: opts.disabled });
      box.addEventListener('change', () => (item.active = box.checked));
      li.append(el('label', { class: 'adm-check adm-check-box' }, box));
    }
    li.append(up, down);
    if (opts.remove) {
      const rm = el('button', { class: 'adm-icon-btn', type: 'button', 'aria-label': `Remove ${item.label}`, disabled: opts.disabled }, '×');
      rm.addEventListener('click', () => {
        li.remove();
        renumber();
      });
      li.append(rm);
    }
    li.addEventListener('dragstart', () => {
      dragged = li;
      li.classList.add('is-dragging');
    });
    li.addEventListener('dragend', () => {
      li.classList.remove('is-dragging');
      dragged = null;
      for (const x of list.children) x.classList.remove('is-over');
      renumber();
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragged || dragged === li) return;
      li.classList.add('is-over');
      const r = li.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) li.before(dragged);
      else li.after(dragged);
    });
    li.addEventListener('dragleave', () => li.classList.remove('is-over'));
    list.append(li);
    renumber();
  };
  items.forEach(add);
  return { node: list, value: () => [...list.children].map((li) => data.get(li as HTMLElement) as Item), add };
}

interface Game {
  slug: string;
  title: string;
  status: string;
}

const rowId = (title: string): string => title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const LANGS: [string, string][] = [['*', 'All languages'], ['en', 'English'], ['pl', 'Polish'], ['de', 'German'], ['es', 'Spanish'], ['pt', 'Portuguese'], ['fr', 'French'], ['tr', 'Turkish'], ['id', 'Indonesian'], ['ru', 'Russian']];

export async function startHomeLayout(root: HTMLElement): Promise<void> {
  root.replaceChildren(skeleton(2));
  let games: Game[];
  let cats: { name: string }[];
  let me: Me;
  try {
    [games, cats, me] = await Promise.all([staticJson<Game[]>('games'), staticJson<{ name: string }[]>('categories'), getMe()]);
  } catch (error) {
    root.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load the build data.', () => void startHomeLayout(root)));
    return;
  }
  const editor = can(me, 'editor');
  const bySlug = new Map(games.map((g) => [g.slug, g]));
  const lang = el('select', {}, ...LANGS.map(([v, t]) => el('option', { value: v }, t)));
  const heroBox = el('div');
  const rowsBox = el('div');
  const result = el('div', { 'aria-live': 'polite' });
  const save = el('button', { class: 'adm-btn adm-btn-primary', type: 'button', disabled: !editor }, 'Save layout');
  const finder = el('input', { type: 'text', list: 'hl-games', placeholder: 'Type a game name', disabled: !editor });
  const addBtn = el('button', { class: 'adm-btn', type: 'button', disabled: !editor }, 'Add to hero');
  const datalist = el('datalist', { id: 'hl-games' }, ...games.map((g) => el('option', { value: g.title })));
  let hero: ReturnType<typeof sortable> | null = null;
  let rows: ReturnType<typeof sortable> | null = null;

  async function load(): Promise<void> {
    heroBox.replaceChildren(skeleton(1));
    try {
      const data = await apiGet<{ hero: string[]; rows: { id: string; active: boolean }[] }>('home-layout', new URLSearchParams({ lang: lang.value }));
      hero = sortable(
        data.hero.map((s) => ({ id: s, label: bySlug.get(s)?.title ?? s, thumb: `/thumbs/${s}/s.webp` })),
        { remove: true, disabled: !editor },
      );
      heroBox.replaceChildren(data.hero.length ? hero.node : el('div', {}, empty('No hero order set: the home page uses the built order (popularity).'), hero.node));
      const defaults = ['Popular games', 'New games', ...cats.map((c) => c.name)].map((t) => ({ id: rowId(t), label: t, active: true }));
      const labels = new Map(defaults.map((d) => [d.id, d.label]));
      const saved = data.rows.map((r) => ({ id: r.id, label: labels.get(r.id) ?? r.id, active: r.active }));
      const rest = defaults.filter((d) => !saved.some((s) => s.id === d.id));
      rows = sortable([...saved, ...rest], { toggle: true, disabled: !editor });
      rowsBox.replaceChildren(rows.node);
    } catch (error) {
      heroBox.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load the layout.', () => void load()));
    }
  }

  addBtn.addEventListener('click', () => {
    const text = finder.value.trim().toLowerCase();
    const g = games.find((x) => x.title.toLowerCase() === text) ?? games.find((x) => x.title.toLowerCase().includes(text));
    if (!g || !hero) return;
    if (hero.value().some((i) => i.id === g.slug)) return;
    hero.add({ id: g.slug, label: g.title, thumb: `/thumbs/${g.slug}/s.webp` });
    finder.value = '';
    heroBox.querySelector('.adm-empty')?.remove();
  });
  save.addEventListener('click', async () => {
    if (!hero || !rows) return;
    save.disabled = true;
    try {
      const r = await apiPost<{ message: string }>('home-layout', { lang: lang.value, hero: hero.value().map((i) => i.id), rows: rows.value().map((i) => ({ id: i.id, active: i.active !== false })) });
      showSaveResult(result, r);
    } catch (error) {
      showSaveResult(result, null, error);
    } finally {
      save.disabled = false;
    }
  });
  lang.addEventListener('change', () => void load());

  root.replaceChildren(
    el('div', { class: 'adm-toolbar' }, field('Language', lang)),
    el(
      'div',
      { class: 'adm-grid adm-grid-2 adm-section' },
      el(
        'section',
        { class: 'adm-card' },
        el('h2', { class: 'adm-card-title' }, 'Hero (big tiles at the top)'),
        el('p', { class: 'adm-hint' }, 'Drag to reorder, or use the arrows. The first games fill the big tiles in this order.'),
        el('div', { class: 'adm-toolbar' }, el('div', { class: 'adm-field' }, el('label', { for: 'hl-find' }, 'Add a game'), Object.assign(finder, { id: 'hl-find' })), addBtn, datalist),
        heroBox,
      ),
      el(
        'section',
        { class: 'adm-card' },
        el('h2', { class: 'adm-card-title' }, 'Rows on the home page'),
        el('p', { class: 'adm-hint' }, 'Tick to show a row. Order from top to bottom.'),
        rowsBox,
      ),
    ),
    el('div', { class: 'adm-form-actions' }, save),
    result,
    el('p', { class: 'adm-hint' }, 'Big or small tiles and the position of category tiles change only with a rebuild of the home page, so they are not set here yet.'),
  );
  await load();
}

// ---------- Banners and notices ----------

interface Banner {
  id: number;
  lang: string;
  text: string;
  link: string | null;
  starts_at: string | null;
  ends_at: string | null;
  pages: string;
  active: number;
}

function settingForm(title: string, key: string, value: { active?: boolean; text?: string; link?: string | null }, withLink: boolean, allowed: boolean): HTMLElement {
  const active = el('input', { type: 'checkbox', checked: value.active === true, disabled: !allowed });
  const text = el('input', { type: 'text', maxlength: '140', disabled: !allowed });
  text.value = value.text ?? '';
  const link = el('input', { type: 'text', placeholder: '/new-games or https://...', disabled: !allowed });
  link.value = value.link ?? '';
  const result = el('div', { 'aria-live': 'polite' });
  const save = el('button', { class: 'adm-btn adm-btn-primary', type: 'submit', disabled: !allowed }, 'Save');
  const form = el(
    'form',
    { class: 'adm-form' },
    el('h2', { class: 'adm-card-title' }, title),
    el('label', { class: 'adm-check' }, active, el('span', {}, 'Show it')),
    field('Text', text, 'At most 140 characters.'),
    withLink ? field('Link (optional)', link) : null,
    el('div', { class: 'adm-form-actions' }, save),
    result,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      showSaveResult(result, await apiPost('settings', { key, value: { active: active.checked, text: text.value, ...(withLink ? { link: link.value } : {}) } }));
    } catch (error) {
      showSaveResult(result, null, error);
    }
  });
  return el('section', { class: 'adm-card' }, form);
}

function bannerForm(b: Partial<Banner>, allowed: boolean, done: () => void): HTMLElement {
  const text = el('input', { type: 'text', maxlength: '140' });
  text.value = b.text ?? '';
  const link = el('input', { type: 'text', placeholder: '/new-games or https://...' });
  link.value = b.link ?? '';
  const lang = el('select', {}, ...LANGS.map(([v, t]) => el('option', { value: v }, t)));
  lang.value = b.lang ?? '*';
  const starts = el('input', { type: 'date' });
  starts.value = b.starts_at ?? '';
  const ends = el('input', { type: 'date' });
  ends.value = b.ends_at ?? '';
  const pageList = (b.pages ?? '*').split(',');
  const pageBoxes = [['*', 'Every page'], ['home', 'Home'], ['game', 'Game pages'], ['category', 'Category pages'], ['list', 'New and popular lists']].map(([v, t]) => {
    const box = el('input', { type: 'checkbox', value: v, checked: pageList.includes(v) });
    return { v, node: el('label', { class: 'adm-check' }, box, el('span', {}, t)), box };
  });
  const active = el('input', { type: 'checkbox', checked: b.active !== 0 });
  const result = el('div', { 'aria-live': 'polite' });
  const form = el(
    'form',
    { class: 'adm-form' },
    el('h2', { class: 'adm-card-title' }, b.id ? 'Edit banner' : 'New banner'),
    field('Text', text, 'At most 140 characters.'),
    field('Link (optional)', link),
    el('div', { class: 'adm-form-row' }, field('Language', lang), el('div', {}, el('p', { class: 'adm-label' }, 'Pages'), ...pageBoxes.map((p) => p.node))),
    el('div', { class: 'adm-form-row' }, field('Start (optional)', starts), field('End (optional)', ends)),
    el('label', { class: 'adm-check' }, active, el('span', {}, 'Active')),
    el('div', { class: 'adm-form-actions' }, el('button', { class: 'adm-btn adm-btn-primary', type: 'submit', disabled: !allowed }, 'Save banner')),
    result,
  );
  if (!allowed) for (const x of form.querySelectorAll<HTMLInputElement>('input, select')) x.disabled = true;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const pages = pageBoxes.filter((p) => p.box.checked).map((p) => p.v);
      showSaveResult(result, await apiPost('banners', { action: 'save', banner: { id: b.id, text: text.value, link: link.value, lang: lang.value, starts_at: starts.value || null, ends_at: ends.value || null, pages, active: active.checked } }));
      done();
    } catch (error) {
      showSaveResult(result, null, error);
    }
  });
  return el('section', { class: 'adm-card' }, form);
}

export async function startBanners(root: HTMLElement): Promise<void> {
  root.replaceChildren(skeleton(2));
  try {
    const [me, settings, banners] = await Promise.all([
      getMe(),
      apiGet<{ values: Record<string, { active?: boolean; text?: string; link?: string | null }> }>('settings'),
      apiGet<{ rows: Banner[] }>('banners'),
    ]);
    const editor = can(me, 'editor');
    const formBox = el('div', { class: 'adm-section' });
    const reload = (): void => void startBanners(root);
    const table = el('section', { class: 'adm-card' }, el('div', { class: 'adm-card-head' }, el('h2', { class: 'adm-card-title' }, 'Banners')));
    const addBtn = el('button', { class: 'adm-btn', type: 'button', disabled: !editor }, 'New banner');
    addBtn.addEventListener('click', () => formBox.replaceChildren(bannerForm({}, editor, reload)));
    table.querySelector('.adm-card-head')?.append(addBtn);
    if (!banners.rows.length) table.append(empty('No banners yet. A banner shows at the bottom of the chosen pages between its start and end dates.'));
    for (const b of banners.rows) {
      const edit = el('button', { class: 'adm-btn adm-btn-small', type: 'button' }, editor ? 'Edit' : 'View');
      edit.addEventListener('click', () => formBox.replaceChildren(bannerForm(b, editor, reload)));
      const del = el('button', { class: 'adm-btn adm-btn-small', type: 'button', disabled: !editor }, 'Delete');
      del.addEventListener('click', async () => {
        await apiPost('banners', { action: 'delete', id: b.id });
        reload();
      });
      table.append(
        el(
          'div',
          { class: 'adm-sort-item' },
          el('span', { class: `adm-pill${b.active ? ' is-on' : ''}` }, b.active ? 'On' : 'Off'),
          el('span', { class: 'adm-sort-label' }, `${b.text} (${b.pages}, ${b.lang === '*' ? 'all languages' : b.lang}${b.starts_at ? `, from ${b.starts_at}` : ''}${b.ends_at ? ` to ${b.ends_at}` : ''})`),
          edit,
          del,
        ),
      );
    }
    root.replaceChildren(
      el(
        'div',
        { class: 'adm-grid adm-grid-2 adm-section' },
        settingForm('Site notice bar', 'notice', settings.values.notice ?? {}, true, editor),
        settingForm('Maintenance message', 'maintenance', settings.values.maintenance ?? {}, false, editor),
      ),
      table,
      formBox,
    );
  } catch (error) {
    root.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load banners.', () => void startBanners(root)));
  }
}

// ---------- Settings ----------

export async function startSettings(root: HTMLElement): Promise<void> {
  root.replaceChildren(skeleton(2));
  try {
    const [me, data] = await Promise.all([getMe(), apiGet<{ values: Record<string, Record<string, unknown>> }>('settings')]);
    const owner = can(me, 'owner');
    const v = data.values;
    const section = (title: string, hint: string, key: string, inputs: [string, HTMLElement][], read: () => unknown): HTMLElement => {
      const result = el('div', { 'aria-live': 'polite' });
      const save = el('button', { class: 'adm-btn adm-btn-primary', type: 'submit', disabled: !owner }, 'Save');
      const form = el('form', { class: 'adm-form' }, el('h2', { class: 'adm-card-title' }, title), el('p', { class: 'adm-hint' }, hint), ...inputs.map(([, n]) => n), el('div', { class: 'adm-form-actions' }, save), result);
      if (!owner) for (const x of form.querySelectorAll<HTMLInputElement>('input, select')) x.disabled = true;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          showSaveResult(result, await apiPost('settings', { key, value: read() }));
        } catch (error) {
          showSaveResult(result, null, error);
        }
      });
      return el('section', { class: 'adm-card' }, form);
    };
    const check = (label: string, on: unknown): [HTMLInputElement, HTMLElement] => {
      const box = el('input', { type: 'checkbox', checked: on === true });
      return [box, el('label', { class: 'adm-check' }, box, el('span', {}, label))];
    };
    const [hover, hoverNode] = check('Hover previews on game tiles', v.flags?.hoverPreview);
    const [played, playedNode] = check('"Played" badge on tiles', v.flags?.playedBadge);
    const [ab, abNode] = check('Allow A/B tests', v.flags?.abTests);
    const [track, trackNode] = check('Measure visits (anonymous)', v.tracking?.enabled);
    const days = el('select', {}, ...[30, 60, 90].map((d) => el('option', { value: String(d) }, `${d} days`)));
    days.value = String(v.retention?.rawDays ?? 90);
    const defLang = el('input', { type: 'text', maxlength: '2' });
    defLang.value = String(v.languages?.defaultLang ?? 'en');
    const [suggest, suggestNode] = check('Suggest the visitor language', v.languages?.suggest);
    const services = el(
      'ul',
      {},
      ...[
        ['GitHub (text changes)', me.github],
        ['OneSignal (push alerts)', me.onesignal],
        ['R2 (uploaded pictures)', me.uploads],
      ].map(([t, on]) => el('li', { class: 'adm-hint' }, `${String(t)}: ${on ? 'connected' : 'not connected yet'}`)),
    );
    root.replaceChildren(
      owner ? el('p', { class: 'adm-intro' }, 'Changes here are instant (about a minute) and go into the audit log.') : el('p', { class: 'adm-intro' }, 'Only the Owner can change settings. You can look.'),
      el(
        'div',
        { class: 'adm-grid adm-grid-2' },
        section('Feature flags', 'Switch site features on or off without a rebuild.', 'flags', [['h', hoverNode], ['p', playedNode], ['a', abNode]], () => ({ hoverPreview: hover.checked, playedBadge: played.checked, abTests: ab.checked })),
        section('Measurement', 'Off = the server ignores all visit events. Visitors can also turn it off for themselves ("Do not measure me").', 'tracking', [['t', trackNode]], () => ({ enabled: track.checked })),
        section('Data retention', 'Raw visit events are deleted after this many days. Daily totals are kept forever.', 'retention', [['d', field('Keep raw events', days)]], () => ({ rawDays: Number(days.value) })),
        section('Language rules', 'Default language of the site, and whether to suggest a visitor their own language.', 'languages', [['l', field('Default language (2 letters)', defLang)], ['s', suggestNode]], () => ({ defaultLang: defLang.value.trim().toLowerCase(), suggest: suggest.checked })),
        el('section', { class: 'adm-card' }, el('h2', { class: 'adm-card-title' }, 'Connected services'), services),
      ),
    );
  } catch (error) {
    root.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load settings.', () => void startSettings(root)));
  }
}
