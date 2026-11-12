// Push alerts screen (docs/ADMIN.md §5.12): subscriber count (when OneSignal is connected), compose and schedule an
// alert (title, text, game, its large picture push.jpg), history, cancel. The server refuses a third alert in a week.
import { ApiError, apiGet, apiPost, can, getMe, staticJson } from './api';
import { counter, field, showSaveResult } from './forms';
import { fmt } from './format';
import { el, empty, errorBox, kpiCards, skeleton } from './render';

interface Msg {
  id: number;
  title: string;
  body: string;
  slug: string | null;
  scheduled_at: number;
  status: string;
  created_by: string;
}

export async function startPush(root: HTMLElement): Promise<void> {
  root.replaceChildren(skeleton(2));
  let data: { connected: boolean; subscribers: number | null; rows: Msg[]; near: number };
  let games: { slug: string; title: string; status: string }[];
  let owner: boolean;
  try {
    const [d, g, me] = await Promise.all([apiGet<typeof data>('push'), staticJson<typeof games>('games'), getMe()]);
    data = d;
    games = g;
    owner = can(me, 'owner');
  } catch (error) {
    root.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load push alerts.', () => void startPush(root)));
    return;
  }
  const title = el('input', { type: 'text', maxlength: '50', disabled: !owner });
  const text = el('textarea', { rows: '2', maxlength: '120', disabled: !owner });
  const game = el('select', { disabled: !owner }, el('option', { value: '' }, 'No game'), ...games.slice(0, 400).map((g) => el('option', { value: g.slug }, g.title)));
  const when = el('input', { type: 'datetime-local', disabled: !owner });
  const preview = el('div', { class: 'adm-card adm-push-preview', 'aria-label': 'Preview' });
  const paint = (): void => {
    const g = game.value;
    preview.replaceChildren(el('p', { class: 'adm-card-title' }, title.value || 'Title'), el('p', { class: 'adm-hint' }, text.value || 'Message text'));
    if (g) preview.append(el('img', { src: `/thumbs/${g}/push.jpg`, alt: '', width: '360', height: '270', class: 'adm-push-img' }));
  };
  for (const x of [title, text, game]) x.addEventListener('input', paint);
  paint();
  const result = el('div', { 'aria-live': 'polite' });
  const form = el(
    'form',
    { class: 'adm-form' },
    el('h2', { class: 'adm-card-title' }, 'New alert'),
    owner ? null : el('p', { class: 'adm-hint' }, 'Only the Owner can send alerts.'),
    field('Title', title),
    counter(title, 0, 50),
    field('Text', text),
    counter(text, 0, 120),
    field('Game (adds its large picture)', game),
    field('Send at (your time)', when),
    el('div', { class: 'adm-form-actions' }, el('button', { class: 'adm-btn adm-btn-primary', type: 'submit', disabled: !owner }, 'Schedule')),
    result,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const at = when.value ? new Date(when.value).toISOString() : '';
      showSaveResult(result, await apiPost('push', { action: 'schedule', title: title.value, body: text.value, slug: game.value || null, scheduled_at: at }));
      setTimeout(() => void startPush(root), 1200);
    } catch (error) {
      showSaveResult(result, null, error);
    }
  });
  const history = el('section', { class: 'adm-card' }, el('h2', { class: 'adm-card-title' }, 'Alerts'));
  if (!data.rows.length) history.append(empty('No alerts yet.'));
  for (const m of data.rows) {
    const row = el('div', { class: 'adm-sort-item' }, el('span', { class: `adm-pill${m.status === 'sent' ? ' is-on' : ''}` }, m.status), el('span', { class: 'adm-sort-label' }, `${fmt(m.scheduled_at, 'time')}: ${m.title}`));
    if (m.status === 'scheduled' && owner) {
      const cancel = el('button', { class: 'adm-btn adm-btn-small', type: 'button' }, 'Cancel');
      cancel.addEventListener('click', async () => {
        await apiPost('push', { action: 'cancel', id: m.id });
        void startPush(root);
      });
      row.append(cancel);
    }
    history.append(row);
  }
  const parts: Node[] = [
    kpiCards([
      { id: 'subs', label: 'Subscribers', value: data.subscribers, fmt: 'int', note: data.connected ? 'From OneSignal' : 'Shown when OneSignal is connected' },
      { id: 'near', label: 'Alerts within 7 days of now', value: data.near, fmt: 'int', note: 'Limit: 2 in any 7 days' },
    ]),
  ];
  if (!data.connected) parts.push(el('section', { class: 'adm-card adm-section' }, el('h2', { class: 'adm-card-title' }, 'OneSignal is not connected yet'), el('p', { class: 'adm-hint' }, 'You can plan alerts now. They are sent only after the OneSignal keys are saved as Cloudflare secrets (task T9.9).')));
  parts.push(
    el('div', { class: 'adm-grid adm-grid-2 adm-section' }, el('section', { class: 'adm-card' }, form), el('section', { class: 'adm-card' }, el('h2', { class: 'adm-card-title' }, 'Preview'), preview)),
    history,
  );
  root.replaceChildren(...parts);
}
