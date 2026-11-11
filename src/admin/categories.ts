// Categories screen (docs/ADMIN.md §5.5): order, nav order, names, short names, emoji, parent, SEO text and FAQ, with
// per-category stats (category clicks from the server, plays added up from each game's categories). Edits are
// rebuild changes: a commit on dev, or the outbox until GitHub is connected.
import type { Cell, Screen } from '../../functions/api/_lib/screen';
import { ApiError, apiGet, apiPost, can, getMe, staticJson } from './api';
import { counter, faqEditor, field, outboxPanel, showSaveResult, type Faq } from './forms';
import type { AdminGame } from './games';
import { apiParams, readState, type RangeState } from './range';
import { el, errorBox, skeleton, tableNode } from './render';
import { RANGE_EVENT } from './shell';

interface Category {
  slug: string;
  name: string;
  h1: string;
  shortName: string;
  emoji: string;
  parent: string | null;
  navOrder: number | null;
  description: string;
  intro: string;
  body: string;
  faq: Faq[];
  published: number;
  drafts: number;
}

function editPanel(c: Category, all: Category[], index: number, editor: boolean, onSaved: () => void): HTMLElement {
  const input = (value: string, max = 120): HTMLInputElement => {
    const i = el('input', { type: 'text', maxlength: String(max) });
    i.value = value;
    return i;
  };
  const name = input(c.name);
  const h1 = input(c.h1);
  const shortName = input(c.shortName, 30);
  const emoji = input(c.emoji, 8);
  const parent = el('select', {}, el('option', { value: '' }, 'No parent'), ...all.filter((x) => x.slug !== c.slug).map((x) => el('option', { value: x.slug }, x.name)));
  parent.value = c.parent ?? '';
  const navOrder = el('input', { type: 'number', min: '1', max: '12', step: '1', placeholder: 'Not in the menu' });
  navOrder.value = c.navOrder === null ? '' : String(c.navOrder);
  const position = el('input', { type: 'number', min: '1', max: String(all.length), step: '1' });
  position.value = String(index + 1);
  const description = el('textarea', { rows: '3', maxlength: '155' });
  description.value = c.description;
  const intro = el('textarea', { rows: '3', maxlength: '400' });
  intro.value = c.intro;
  const body = el('textarea', { rows: '14' });
  body.value = c.body;
  const faq = faqEditor(c.faq);
  const result = el('div', { 'aria-live': 'polite' });
  const save = el('button', { class: 'adm-btn adm-btn-primary', type: 'submit', disabled: !editor }, 'Save category');
  const close = el('button', { class: 'adm-btn', type: 'button' }, 'Close');
  const form = el(
    'form',
    { class: 'adm-form', novalidate: true },
    el('h2', { class: 'adm-card-title' }, `Edit ${c.name}`),
    el('div', { class: 'adm-form-row' }, field('Name', name), field('Page heading (H1)', h1)),
    el('div', { class: 'adm-form-row' }, field('Short name (tiles)', shortName), field('Emoji (when no picture)', emoji)),
    el('div', { class: 'adm-form-row' }, field('Parent category', parent), field('Menu position (1 to 12)', navOrder, 'Empty = not in the menu.')),
    field('Order in the category list', position),
    field('Description (search results)', description),
    counter(description, 120, 155),
    field('Intro', intro),
    field('Page text (Markdown)', body, 'Headings start with ##. Keep the four sections the checks ask for.'),
    el('div', {}, el('p', { class: 'adm-label' }, 'Questions and answers (3 to 5)'), faq.node),
    el('div', { class: 'adm-form-actions' }, save, close),
    result,
  );
  if (!editor) for (const x of form.querySelectorAll<HTMLInputElement>('input, select, textarea, button[type=submit]')) x.disabled = true;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const next: Record<string, unknown> = {
      name: name.value.trim(),
      h1: h1.value.trim(),
      shortName: shortName.value.trim(),
      emoji: emoji.value.trim(),
      parent: parent.value || null,
      navOrder: navOrder.value === '' ? null : Number(navOrder.value),
      description: description.value.trim(),
      intro: intro.value.trim(),
      body: body.value,
      faq: faq.value(),
    };
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(next)) if (JSON.stringify(v) !== JSON.stringify((c as unknown as Record<string, unknown>)[k])) patch[k] = v;
    if (Number(position.value) - 1 !== index) patch.position = Number(position.value) - 1;
    if (Object.keys(patch).length === 0) {
      showSaveResult(result, { message: 'Nothing changed.' });
      return;
    }
    save.disabled = true;
    try {
      showSaveResult(result, await apiPost<{ message: string }>('categories', { slug: c.slug, patch }));
      Object.assign(c, next);
      onSaved();
    } catch (error) {
      showSaveResult(result, null, error);
    } finally {
      save.disabled = false;
    }
  });
  const card = el('section', { class: 'adm-card', 'data-edit-panel': true }, form);
  close.addEventListener('click', () => card.remove());
  return card;
}

export function startCategories(root: HTMLElement): void {
  let range: RangeState = readState();
  let cats: Category[] = [];
  let games: AdminGame[] = [];
  let editor = false;
  const outbox = el('div', { class: 'adm-section' });
  const tableBox = el('div', { class: 'adm-section' });
  const editBox = el('div', { class: 'adm-section' });
  root.replaceChildren(outbox, tableBox, editBox);

  async function load(): Promise<void> {
    tableBox.replaceChildren(skeleton(1));
    try {
      const params = apiParams(range);
      const [clicks, gameStats, me] = await Promise.all([apiGet<Screen>('categories', params), apiGet<Screen>('games', params), getMe()]);
      editor = can(me, 'editor');
      const clickBy = new Map((clicks.tables?.[0]?.rows ?? []).map((r) => [String(r.slug), r]));
      const plays = new Map<string, number>();
      const statBy = new Map((gameStats.tables?.find((t) => t.id === 'stats')?.rows ?? []).map((r) => [String(r.slug), Number(r.plays) || 0]));
      for (const g of games) for (const c of g.categories) plays.set(c, (plays.get(c) ?? 0) + (statBy.get(g.slug) ?? 0));
      const rows: Record<string, Cell>[] = cats.map((c, i) => ({
        order: i + 1,
        name: `${c.emoji} ${c.name}`,
        slug: c.slug,
        shortName: c.shortName,
        parent: c.parent,
        navOrder: c.navOrder,
        published: c.published,
        drafts: c.drafts,
        clicks: clickBy.has(c.slug) ? Number(clickBy.get(c.slug)?.clicks) : null,
        plays: plays.has(c.slug) && (plays.get(c.slug) ?? 0) > 0 ? (plays.get(c.slug) ?? 0) : null,
        edit: 'Edit',
      }));
      const table = tableNode(
        {
          id: 'categories',
          title: 'Categories',
          columns: [
            { key: 'name', label: 'Category' },
            { key: 'order', label: 'Order', fmt: 'int' },
            { key: 'shortName', label: 'Short name' },
            { key: 'parent', label: 'Parent' },
            { key: 'navOrder', label: 'Menu', fmt: 'int' },
            { key: 'published', label: 'Published', fmt: 'int' },
            { key: 'drafts', label: 'Drafts', fmt: 'int' },
            { key: 'clicks', label: 'Clicks', fmt: 'int' },
            { key: 'plays', label: 'Plays', fmt: 'int' },
            { key: 'edit', label: 'Edit' },
          ],
          rows,
          empty: 'No categories.',
          note: 'Clicks = taps on the category itself. Plays = plays of games in the category (a game in 3 categories counts in each).',
        },
        undefined,
        (tr, row) => {
          const cell = tr.lastElementChild;
          if (!cell) return;
          const btn = el('button', { class: 'adm-btn adm-btn-small', type: 'button' }, editor ? 'Edit' : 'View');
          btn.addEventListener('click', () => {
            const index = cats.findIndex((c) => c.slug === row.slug);
            editBox.replaceChildren(editPanel(cats[index], cats, index, editor, () => void outboxPanel(outbox)));
            editBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
          cell.replaceChildren(btn);
        },
      );
      tableBox.replaceChildren(table);
    } catch (error) {
      tableBox.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load the categories.', () => void load()));
    }
  }

  document.addEventListener(RANGE_EVENT, (e) => {
    range = (e as CustomEvent<RangeState>).detail;
    void load();
  });
  Promise.all([staticJson<Category[]>('categories'), staticJson<AdminGame[]>('games')])
    .then(([c, g]) => {
      cats = c;
      games = g;
      void outboxPanel(outbox);
      return load();
    })
    .catch(() => tableBox.replaceChildren(errorBox('Could not load the build data.', () => location.reload())));
}
