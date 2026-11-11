// Small form helpers for admin edit screens: labelled fields, a character counter, a FAQ list editor, the save
// result message, and the outbox panel (changes waiting for GitHub).
import { ApiError, apiGet, apiPost, can, getMe } from './api';
import { fmt } from './format';
import { el } from './render';

let uid = 0;

export function field(label: string, input: HTMLElement, hint?: string): HTMLElement {
  const id = `f${++uid}`;
  input.id = id;
  const wrap = el('div', { class: 'adm-field' }, el('label', { for: id }, label), input);
  if (hint) {
    const h = el('p', { class: 'adm-hint', id: `${id}-hint` }, hint);
    input.setAttribute('aria-describedby', h.id);
    wrap.append(h);
  }
  return wrap;
}

export function counter(input: HTMLInputElement | HTMLTextAreaElement, min: number, max: number): HTMLElement {
  const out = el('p', { class: 'adm-hint', 'aria-live': 'polite' });
  const paint = (): void => {
    const n = input.value.length;
    out.textContent = `${n} characters${min > 0 ? `, ${min} to ${max} needed when published` : `, at most ${max}`}`;
  };
  input.addEventListener('input', paint);
  paint();
  return out;
}

export interface Faq {
  q: string;
  a: string;
}

/** FAQ editor: up to `max` question/answer pairs with add and remove buttons. */
export function faqEditor(initial: Faq[], max = 5): { node: HTMLElement; value(): Faq[] } {
  const list = el('div', { class: 'adm-form' });
  const add = el('button', { class: 'adm-btn adm-btn-small', type: 'button' }, 'Add a question');
  const rows: { q: HTMLInputElement; a: HTMLTextAreaElement; node: HTMLElement }[] = [];
  const sync = (): void => {
    add.disabled = rows.length >= max;
  };
  const addRow = (f: Faq): void => {
    const q = el('input', { type: 'text', maxlength: '200' });
    q.value = f.q;
    const a = el('textarea', { maxlength: '600', rows: '3' });
    a.value = f.a;
    const remove = el('button', { class: 'adm-btn adm-btn-small', type: 'button' }, 'Remove');
    const node = el('div', { class: 'adm-card' }, field('Question', q), field('Answer', a), remove);
    const row = { q, a, node };
    remove.addEventListener('click', () => {
      rows.splice(rows.indexOf(row), 1);
      node.remove();
      sync();
    });
    rows.push(row);
    list.append(node);
    sync();
  };
  initial.forEach(addRow);
  add.addEventListener('click', () => addRow({ q: '', a: '' }));
  sync();
  return {
    node: el('div', { class: 'adm-form' }, list, add),
    value: () => rows.map((r) => ({ q: r.q.value.trim(), a: r.a.value.trim() })).filter((f) => f.q || f.a),
  };
}

/** Shows the result of a save: committed, queued, or the problems to fix. */
export function showSaveResult(box: HTMLElement, result: { status?: string; message?: string } | null, error?: unknown): void {
  box.replaceChildren();
  if (error) {
    const problems = error instanceof ApiError && error.problems ? error.problems : [];
    box.append(el('p', { class: 'adm-error-text' }, error instanceof ApiError ? error.message : 'Could not save. Check your connection.'));
    if (problems.length) box.append(el('ul', {}, ...problems.map((p) => el('li', { class: 'adm-hint' }, p))));
    return;
  }
  box.append(el('p', { class: 'adm-status' }, result?.message ?? 'Saved.'));
}

interface OutboxRow {
  id: number;
  ts: number;
  email: string;
  kind: string;
  path: string;
  status: string;
  commit_sha: string | null;
  error: string | null;
}

/** "Waiting for GitHub" panel: pending rebuild changes, with "Commit them now" for the Owner once GitHub is connected. */
export async function outboxPanel(target: HTMLElement): Promise<void> {
  try {
    const [data, me] = await Promise.all([apiGet<{ github: boolean; rows: OutboxRow[] }>('outbox'), getMe()]);
    const pending = data.rows.filter((r) => r.status !== 'committed');
    if (pending.length === 0 && data.github) {
      target.replaceChildren();
      return;
    }
    const card = el('section', { class: 'adm-card' }, el('h2', { class: 'adm-card-title' }, 'Text changes and GitHub'));
    card.append(
      el(
        'p',
        { class: 'adm-hint' },
        data.github
          ? 'GitHub is connected: saving makes a commit on dev and the preview rebuilds in 1 to 3 minutes.'
          : 'GitHub is not connected yet. Saved text changes wait here and will be committed when GitHub is connected.',
      ),
    );
    if (pending.length) {
      card.append(
        el(
          'ul',
          {},
          ...pending.slice(0, 20).map((r) => el('li', { class: 'adm-hint' }, `${fmt(r.ts, 'time')}: ${r.kind} change by ${r.email}, ${r.status}${r.error ? ` (${r.error})` : ''}`)),
        ),
      );
      if (data.github && can(me, 'owner')) {
        const btn = el('button', { class: 'adm-btn adm-btn-primary', type: 'button' }, 'Commit them now');
        const msg = el('p', { class: 'adm-status', role: 'status' });
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            const r = await apiPost<{ committed: number; failed: number }>('outbox', { action: 'flush' });
            msg.textContent = `${r.committed} committed, ${r.failed} failed.`;
            void outboxPanel(target);
          } catch (e) {
            msg.textContent = e instanceof ApiError ? e.message : 'Could not commit.';
            btn.disabled = false;
          }
        });
        card.append(btn, msg);
      }
    }
    target.replaceChildren(card);
  } catch {
    target.replaceChildren();
  }
}
