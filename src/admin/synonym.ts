// "Propose a search word" (docs/ADMIN.md §5.7): an Editor suggests that a word should find a category. The proposal
// becomes a commit to data/admin-proposals/synonyms.json (or waits in the outbox); the planner reviews it.
import type { Screen } from '../../functions/api/_lib/screen';
import { apiPost, can, getMe, staticJson } from './api';
import { field, showSaveResult } from './forms';
import { el } from './render';

export async function synonymForm(target: HTMLElement, screen: Screen): Promise<void> {
  const [me, cats] = await Promise.all([getMe(), staticJson<{ slug: string; name: string }[]>('categories')]);
  const editor = can(me, 'editor');
  const word = el('input', { type: 'text', maxlength: '30', list: 'syn-queries', disabled: !editor });
  const queries = screen.tables?.find((t) => t.id === 'zero-results')?.rows ?? [];
  const list = el('datalist', { id: 'syn-queries' }, ...queries.map((q) => el('option', { value: String(q.query) })));
  const category = el('select', { disabled: !editor }, ...cats.map((c) => el('option', { value: c.slug }, c.name)));
  const result = el('div', { 'aria-live': 'polite' });
  const form = el(
    'form',
    { class: 'adm-form' },
    el('h2', { class: 'adm-card-title' }, 'Propose a search word'),
    el('p', { class: 'adm-hint' }, editor ? 'Example: "cars" should find Car Games. The planner checks each proposal before it goes live.' : 'Editors can propose search words.'),
    el('div', { class: 'adm-form-row' }, field('Word people type', word), field('Should find', category)),
    list,
    el('div', { class: 'adm-form-actions' }, el('button', { class: 'adm-btn adm-btn-primary', type: 'submit', disabled: !editor }, 'Propose')),
    result,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      showSaveResult(result, await apiPost('synonym', { word: word.value, category: category.value }));
      word.value = '';
    } catch (error) {
      showSaveResult(result, null, error);
    }
  });
  target.replaceChildren(el('section', { class: 'adm-card' }, form));
}
