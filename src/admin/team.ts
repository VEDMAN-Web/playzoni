// Team and Audit log screens (docs/ADMIN.md §5.16, §5.17).
import type { Cell } from '../../functions/api/_lib/screen';
import { ApiError, apiGet, apiPost } from './api';
import { field, showSaveResult } from './forms';
import { el, errorBox, skeleton, tableNode } from './render';

interface Member {
  email: string;
  role: string;
  added_by: string | null;
  added_at: number | null;
}

const ROLE_HELP = 'Owner: everything. Editor: games, categories, home layout, banners. Analyst: can only look.';

export async function startTeam(root: HTMLElement): Promise<void> {
  root.replaceChildren(skeleton(2));
  let data: { rows: Member[]; fixedOwners: string[]; you: string };
  try {
    data = await apiGet<typeof data>('team');
  } catch (error) {
    root.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load the team.', () => void startTeam(root)));
    return;
  }
  const msg = el('div', { 'aria-live': 'polite' });
  const roleSelect = (value: string): HTMLSelectElement => {
    const s = el('select', {}, el('option', { value: 'owner' }, 'Owner'), el('option', { value: 'editor' }, 'Editor'), el('option', { value: 'analyst' }, 'Analyst'));
    s.value = value;
    return s;
  };
  const rows: Record<string, Cell>[] = [
    ...data.fixedOwners.map((email) => ({ email, role: 'owner', note: 'Set in Cloudflare', actions: '' })),
    ...data.rows.map((m) => ({ email: m.email, role: m.role, note: m.added_by ? `Added by ${m.added_by}` : '', actions: '' })),
  ];
  const table = tableNode(
    {
      id: 'team',
      title: 'Team',
      columns: [
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'note', label: 'Note' },
        { key: 'actions', label: 'Change' },
      ],
      rows,
      empty: 'No team members yet.',
      note: ROLE_HELP,
    },
    undefined,
    (tr, row) => {
      const cell = tr.lastElementChild;
      if (!cell || row.note === 'Set in Cloudflare') return;
      const s = roleSelect(String(row.role));
      s.setAttribute('aria-label', `Role for ${String(row.email)}`);
      s.addEventListener('change', async () => {
        try {
          showSaveResult(msg, await apiPost('team', { action: 'role', email: row.email, role: s.value }));
        } catch (error) {
          showSaveResult(msg, null, error);
          s.value = String(row.role);
        }
      });
      const rm = el('button', { class: 'adm-btn adm-btn-small', type: 'button' }, 'Remove');
      rm.addEventListener('click', async () => {
        try {
          showSaveResult(msg, await apiPost('team', { action: 'remove', email: row.email }));
          setTimeout(() => void startTeam(root), 800);
        } catch (error) {
          showSaveResult(msg, null, error);
        }
      });
      cell.classList.add('is-wide');
      cell.replaceChildren(el('span', { class: 'adm-form-actions' }, s, rm));
    },
  );
  const email = el('input', { type: 'email', autocomplete: 'off', placeholder: 'name@gmail.com' });
  const role = roleSelect('analyst');
  const result = el('div', { 'aria-live': 'polite' });
  const form = el(
    'form',
    { class: 'adm-form' },
    el('h2', { class: 'adm-card-title' }, 'Add a person'),
    el('div', { class: 'adm-form-row' }, field('Google email', email), field('Role', role)),
    el('p', { class: 'adm-hint' }, 'They sign in with Google. Their email must also be on the Cloudflare Access list.'),
    el('div', { class: 'adm-form-actions' }, el('button', { class: 'adm-btn adm-btn-primary', type: 'submit' }, 'Add')),
    result,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      showSaveResult(result, await apiPost('team', { action: 'add', email: email.value, role: role.value }));
      setTimeout(() => void startTeam(root), 1200);
    } catch (error) {
      showSaveResult(result, null, error);
    }
  });
  root.replaceChildren(msg, table, el('section', { class: 'adm-card adm-section' }, form));
}

interface AuditRow {
  id: number;
  ts: number;
  email: string;
  action: string;
  target: string | null;
  before: string | null;
  after: string | null;
}

const short = (json: string | null): string => {
  if (json === null || json === 'null') return '';
  return json.length > 160 ? `${json.slice(0, 160)}...` : json;
};

export async function startAudit(root: HTMLElement): Promise<void> {
  const email = el('input', { type: 'text', placeholder: 'Email', 'aria-label': 'Filter by email' });
  const action = el('input', { type: 'text', placeholder: 'Action, for example games', 'aria-label': 'Filter by action' });
  const from = el('input', { type: 'date', 'aria-label': 'From' });
  const to = el('input', { type: 'date', 'aria-label': 'To' });
  const apply = el('button', { class: 'adm-btn', type: 'button' }, 'Filter');
  const box = el('div');
  const more = el('button', { class: 'adm-btn', type: 'button', hidden: true }, 'Older changes');
  let rows: AuditRow[] = [];
  const draw = (): void => {
    box.replaceChildren(
      tableNode({
        id: 'audit-log',
        title: 'Changes',
        columns: [
          { key: 'ts', label: 'When', fmt: 'time' },
          { key: 'email', label: 'Who' },
          { key: 'action', label: 'What' },
          { key: 'target', label: 'Target' },
          { key: 'before', label: 'Before' },
          { key: 'after', label: 'After' },
        ],
        rows: rows.map((r) => ({ ...r, before: short(r.before), after: short(r.after) })) as unknown as Record<string, Cell>[],
        empty: 'No changes match. Every save in the admin is written here.',
      }),
    );
    more.hidden = rows.length === 0 || rows.length % 100 !== 0;
  };
  const load = async (append: boolean): Promise<void> => {
    const p = new URLSearchParams();
    if (email.value.trim()) p.set('email', email.value.trim());
    if (action.value.trim()) p.set('action', action.value.trim());
    if (from.value) p.set('from', from.value);
    if (to.value) p.set('to', to.value);
    if (append && rows.length) p.set('before', String(rows[rows.length - 1].id));
    if (!append) box.replaceChildren(skeleton(1));
    try {
      const data = await apiGet<{ rows: AuditRow[] }>('audit', p);
      rows = append ? [...rows, ...data.rows] : data.rows;
      draw();
    } catch (error) {
      box.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load the audit log.', () => void load(false)));
    }
  };
  apply.addEventListener('click', () => void load(false));
  more.addEventListener('click', () => void load(true));
  root.replaceChildren(el('div', { class: 'adm-toolbar' }, field('Who', email), field('What', action), field('From', from), field('To', to), apply), box, more);
  await load(false);
}
