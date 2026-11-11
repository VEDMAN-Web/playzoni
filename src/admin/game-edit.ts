// Game detail (docs/ADMIN.md §5.4): title block and the edit form for every field from content.config.ts. Saving
// sends only the changed fields; the server checks them like the build and commits to dev (or queues them).
import { apiPost, can, getMe, staticJson } from './api';
import { counter, faqEditor, field, outboxPanel, showSaveResult, type Faq } from './forms';
import type { AdminGame } from './games';
import { el, errorBox } from './render';

interface FullGame extends AdminGame {
  tags: string[];
  controls: { desktop: string; mobile: string };
  description: string;
  intro: string;
  faq: Faq[];
  previewVideo?: string;
  screenshots?: string[];
  updatedDate: string;
}

interface Category {
  slug: string;
  name: string;
}

const listText = (v: string): string[] =>
  v
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

function editForm(game: FullGame, categories: Category[], editor: boolean): HTMLElement {
  const title = el('input', { type: 'text', maxlength: '120', required: true });
  title.value = game.title;
  const catSelects = [0, 1, 2, 3].map((i) => {
    const s = el('select', {}, el('option', { value: '' }, i === 0 ? 'Choose a category' : 'None'), ...categories.map((c) => el('option', { value: c.slug }, c.name)));
    s.value = game.categories[i] ?? '';
    return s;
  });
  const tags = el('input', { type: 'text' });
  tags.value = game.tags.join(', ');
  const desktop = el('input', { type: 'text', maxlength: '200' });
  desktop.value = game.controls.desktop;
  const mobile = el('input', { type: 'text', maxlength: '200' });
  mobile.value = game.controls.mobile;
  const description = el('textarea', { maxlength: '155', rows: '3' });
  description.value = game.description;
  const intro = el('textarea', { rows: '4', maxlength: '600' });
  intro.value = game.intro;
  const faq = faqEditor(game.faq ?? []);
  const featured = el('input', { type: 'checkbox', checked: game.featured });
  const popularity = el('input', { type: 'number', step: '1' });
  popularity.value = String(game.popularity);
  const status = el('select', {}, el('option', { value: 'draft' }, 'Draft'), el('option', { value: 'published' }, 'Published'));
  status.value = game.status;
  const video = el('input', { type: 'text', placeholder: '/thumbs/<game>/preview.mp4' });
  video.value = game.previewVideo ?? '';
  const shots = el('textarea', { rows: '3', placeholder: 'One picture path per line, at most 4' });
  shots.value = (game.screenshots ?? []).join('\n');
  const result = el('div', { 'aria-live': 'polite' });
  const save = el('button', { class: 'adm-btn adm-btn-primary', type: 'submit', disabled: !editor }, 'Save');

  const form = el(
    'form',
    { class: 'adm-form', novalidate: true },
    el('h2', { class: 'adm-card-title' }, 'Edit game text and settings'),
    editor ? null : el('p', { class: 'adm-hint' }, 'You can look but not change (Analyst role).'),
    field('Title', title),
    el('div', { class: 'adm-form-row' }, ...catSelects.map((s, i) => field(`Category ${i + 1}`, s, i === 0 ? 'The first one is the main category.' : undefined))),
    field('Tags', tags, 'Separate with commas.'),
    el('div', { class: 'adm-form-row' }, field('Controls on a computer', desktop), field('Controls on a phone', mobile)),
    field('Description (search results)', description),
    counter(description, 120, 155),
    field('Intro (first lines on the page)', intro),
    el('div', {}, el('p', { class: 'adm-label' }, 'Questions and answers (at most 5)'), faq.node),
    el('div', { class: 'adm-form-row' }, field('Status', status), field('Popularity (higher = earlier)', popularity)),
    el('label', { class: 'adm-check' }, featured, el('span', {}, 'Featured')),
    field('Preview video', video, 'Optional. A file the import downloaded.'),
    field('Screenshots', shots, 'Optional.'),
    el('div', { class: 'adm-form-actions' }, save),
    result,
  );
  if (!editor) for (const x of form.querySelectorAll<HTMLInputElement>('input, select, textarea, button')) x.disabled = true;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const next: Record<string, unknown> = {
      title: title.value.trim(),
      categories: catSelects.map((s) => s.value).filter(Boolean),
      tags: listText(tags.value),
      controls: { desktop: desktop.value.trim(), mobile: mobile.value.trim() },
      description: description.value.trim(),
      intro: intro.value.trim(),
      faq: faq.value(),
      featured: featured.checked,
      popularity: Number(popularity.value),
      status: status.value,
      previewVideo: video.value.trim() || null,
      screenshots: listText(shots.value),
    };
    const before: Record<string, unknown> = { ...game, previewVideo: game.previewVideo ?? null, screenshots: game.screenshots ?? [] };
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(next)) if (JSON.stringify(v) !== JSON.stringify(before[k])) patch[k] = v;
    if (Object.keys(patch).length === 0) {
      showSaveResult(result, { message: 'Nothing changed.' });
      return;
    }
    if (!next.title || (next.categories as string[]).length === 0) {
      showSaveResult(result, { message: 'A title and at least one category are needed.' });
      return;
    }
    save.disabled = true;
    try {
      const r = await apiPost<{ status: string; message: string }>('game', { slug: game.slug, patch });
      showSaveResult(result, r);
      Object.assign(game, next);
      const box = document.querySelector<HTMLElement>('[data-outbox]');
      if (box) void outboxPanel(box);
    } catch (error) {
      showSaveResult(result, null, error);
    } finally {
      save.disabled = false;
    }
  });
  return el('section', { class: 'adm-card' }, form);
}

export async function startGameHead(slug: string): Promise<void> {
  const head = document.querySelector<HTMLElement>('[data-game-head]');
  const editRoot = document.querySelector<HTMLElement>('[data-edit-root]');
  if (!head) return;
  try {
    const [games, categories] = await Promise.all([staticJson<FullGame[]>('games'), staticJson<Category[]>('categories')]);
    const game = games.find((g) => g.slug === slug);
    if (!game) {
      head.replaceChildren(errorBox(`No game with the address "${slug}".`));
      return;
    }
    const title = document.querySelector('.adm-title');
    if (title) title.textContent = game.title;
    document.title = `${game.title} | Playzoni Admin`;
    head.replaceChildren(
      el(
        'div',
        { class: 'adm-cell-row' },
        el('img', { class: 'adm-thumb', src: `/thumbs/${slug}/s.webp`, width: '36', height: '36', alt: '' }),
        el('div', {}, el('p', { class: 'adm-card-title' }, game.title), el('p', { class: 'adm-status' }, `${game.status}, ${game.source}, QA: ${game.qa}, updated ${game.updatedDate}`)),
      ),
      el('div', { class: 'adm-form-actions' }, el('a', { class: 'adm-btn adm-btn-small', href: `/game/${slug}` }, 'Open on the site'), el('a', { class: 'adm-btn adm-btn-small', href: '/admin/games' }, 'All games')),
    );
    if (editRoot) {
      let editor = false;
      try {
        editor = can(await getMe(), 'editor');
      } catch {
        editor = false;
      }
      const outbox = el('div', { 'data-outbox': true, class: 'adm-section' });
      editRoot.replaceChildren(outbox, editForm(game, categories, editor));
      void outboxPanel(outbox);
    }
  } catch {
    head.replaceChildren(errorBox('Could not load the game list.', () => location.reload()));
  }
}
