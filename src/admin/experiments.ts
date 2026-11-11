// Experiments screen (docs/ADMIN.md §5.13): create, start and stop A/B tests (variants, traffic %); one at a time.
// Results per variant appear once visits carry the variant (T9.7); until then no numbers are shown.
import { ApiError, apiGet, apiPost, can, getMe } from './api';
import { field, showSaveResult } from './forms';
import { el, empty, errorBox, skeleton } from './render';

interface Exp {
  id: string;
  name: string;
  variants: string;
  traffic: number;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
}

export async function startExperiments(root: HTMLElement): Promise<void> {
  root.replaceChildren(skeleton(2));
  let data: { rows: Exp[]; resultsNote: string };
  let owner: boolean;
  try {
    const [d, me] = await Promise.all([apiGet<typeof data>('experiments'), getMe()]);
    data = d;
    owner = can(me, 'owner');
  } catch (error) {
    root.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load experiments.', () => void startExperiments(root)));
    return;
  }
  const msg = el('div', { 'aria-live': 'polite' });
  const list = el('section', { class: 'adm-card adm-section' }, el('h2', { class: 'adm-card-title' }, 'Tests'), msg);
  if (!data.rows.length) list.append(empty('No tests yet. Create one below. Only one test can run at a time.'));
  for (const x of data.rows) {
    const variants = (JSON.parse(x.variants) as string[]).join(', ');
    const row = el(
      'div',
      { class: 'adm-sort-item' },
      el('span', { class: `adm-pill${x.status === 'running' ? ' is-on' : ''}` }, x.status),
      el('span', { class: 'adm-sort-label' }, `${x.name}: ${variants}, ${x.traffic}% of visitors${x.starts_at ? `, from ${x.starts_at}` : ''}${x.ends_at ? ` to ${x.ends_at}` : ''}`),
    );
    const action = x.status === 'draft' ? 'start' : x.status === 'running' ? 'stop' : '';
    if (action && owner) {
      const b = el('button', { class: 'adm-btn adm-btn-small', type: 'button' }, action === 'start' ? 'Start' : 'Stop');
      b.addEventListener('click', async () => {
        try {
          await apiPost('experiments', { action, id: x.id });
          void startExperiments(root);
        } catch (error) {
          showSaveResult(msg, null, error);
        }
      });
      row.append(b);
    }
    list.append(row);
  }
  const name = el('input', { type: 'text', maxlength: '60', disabled: !owner });
  const variants = el('input', { type: 'text', value: 'A, B', disabled: !owner });
  const traffic = el('input', { type: 'number', min: '1', max: '100', value: '50', disabled: !owner });
  const result = el('div', { 'aria-live': 'polite' });
  const form = el(
    'form',
    { class: 'adm-form' },
    el('h2', { class: 'adm-card-title' }, 'New test'),
    owner ? null : el('p', { class: 'adm-hint' }, 'Only the Owner can create or stop tests.'),
    field('Name', name, 'For example: Rows order on the home page.'),
    el('div', { class: 'adm-form-row' }, field('Variants', variants, 'Two to four, separated by commas. A is the normal site.'), field('Traffic (% of visitors)', traffic)),
    el('div', { class: 'adm-form-actions' }, el('button', { class: 'adm-btn adm-btn-primary', type: 'submit', disabled: !owner }, 'Create')),
    result,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      showSaveResult(result, await apiPost('experiments', { action: 'create', name: name.value, variants: variants.value.split(',').map((v) => v.trim()), traffic: Number(traffic.value) }));
      setTimeout(() => void startExperiments(root), 800);
    } catch (error) {
      showSaveResult(result, null, error);
    }
  });
  root.replaceChildren(
    list,
    el('section', { class: 'adm-card adm-section' }, el('h2', { class: 'adm-card-title' }, 'Results'), el('p', { class: 'adm-hint' }, data.resultsNote), empty('No results yet.')),
    el('section', { class: 'adm-card' }, form),
  );
}
