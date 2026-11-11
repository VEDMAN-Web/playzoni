// Ads screen extras (docs/ADMIN.md §5.11, ADS-DATA §4 and §7): "Connect AdSense" state, slot on/off per country group
// (stored now, used by the Phase 11 ad code), and the ads.txt viewer. Numbers come from the analytics part above.
import { apiGet, apiPost, can, getMe } from './api';
import { showSaveResult } from './forms';
import { el } from './render';

const SLOTS: [string, string][] = [
  ['G1', 'Game page, right of the player (300x250)'],
  ['G2', 'Game page, right column tall (300x600)'],
  ['G3', 'Game page, under the player (728x90)'],
  ['G4', 'Game page, in related games (300x250)'],
  ['M1', 'Phone game page, under the cover (320x100)'],
  ['M2', 'Phone game page, in related games (300x250)'],
  ['H1', 'Home and lists, after the tiles (728x90 / 320x100)'],
  ['H2', 'Home, inside the tiles (300x250, desktop)'],
  ['H3', 'Home and lists, after the 4th row'],
];
const GROUPS: [string, string][] = [
  ['eea-uk-ch', 'EEA, UK, Switzerland'],
  ['in-br', 'India, Brazil'],
  ['ru-by', 'Russia, Belarus'],
  ['rest', 'Rest of the world'],
];

type AdsSetting = { enabled?: boolean; slots?: Record<string, { on?: boolean; groups?: Record<string, boolean> }> };

export async function startAdsExtras(target: HTMLElement): Promise<void> {
  const [me, settings] = await Promise.all([getMe(), apiGet<{ values: { ads?: AdsSetting } }>('settings')]);
  const owner = can(me, 'owner');
  const ads = settings.values.ads ?? {};
  const master = el('input', { type: 'checkbox', checked: ads.enabled === true, disabled: !owner });
  const boxes = new Map<string, HTMLInputElement>();
  const table = el('table', { class: 'adm-table' });
  table.append(el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Slot'), el('th', { scope: 'col' }, 'On'), ...GROUPS.map(([, t]) => el('th', { scope: 'col' }, t)))));
  const body = el('tbody');
  for (const [id, label] of SLOTS) {
    const slot = ads.slots?.[id] ?? {};
    const on = el('input', { type: 'checkbox', checked: slot.on === true, disabled: !owner, 'aria-label': `${id} on` });
    boxes.set(`${id}:on`, on);
    const tr = el('tr', {}, el('td', { class: 'is-title' }, `${id}: ${label}`), el('td', { 'data-label': 'On' }, el('label', { class: 'adm-check adm-check-box' }, on)));
    for (const [g, t] of GROUPS) {
      const box = el('input', { type: 'checkbox', checked: slot.groups?.[g] ?? g !== 'ru-by', disabled: !owner, 'aria-label': `${id} in ${t}` });
      boxes.set(`${id}:${g}`, box);
      tr.append(el('td', { 'data-label': t }, el('label', { class: 'adm-check adm-check-box' }, box)));
    }
    body.append(tr);
  }
  table.append(body);
  const result = el('div', { 'aria-live': 'polite' });
  const save = el('button', { class: 'adm-btn adm-btn-primary', type: 'button', disabled: !owner }, 'Save slots');
  save.addEventListener('click', async () => {
    const slots: AdsSetting['slots'] = {};
    for (const [id] of SLOTS) slots[id] = { on: boxes.get(`${id}:on`)?.checked === true, groups: Object.fromEntries(GROUPS.map(([g]) => [g, boxes.get(`${id}:${g}`)?.checked === true])) };
    try {
      showSaveResult(result, await apiPost('settings', { key: 'ads', value: { enabled: master.checked, slots } }));
    } catch (error) {
      showSaveResult(result, null, error);
    }
  });
  let adsTxt = 'No ads.txt on the site yet (it comes with the GameMonetize lines, task T5.5).';
  try {
    const r = await fetch('/ads.txt');
    const body = await r.text();
    const text = r.ok ? body : '';
    if (text.trim() && !text.trimStart().startsWith('<')) adsTxt = text;
  } catch {
    // keep the message
  }
  target.replaceChildren(
    el(
      'section',
      { class: 'adm-card adm-section' },
      el('h2', { class: 'adm-card-title' }, 'Connect AdSense'),
      el('p', { class: 'adm-hint' }, 'Earnings and RPM appear only after AdSense approves the site and the owner connects the AdSense API (a key saved as a Cloudflare secret). Until then this page shows no money numbers.'),
    ),
    el(
      'section',
      { class: 'adm-card adm-section' },
      el('h2', { class: 'adm-card-title' }, 'Ad slots by country group'),
      el('p', { class: 'adm-hint' }, owner ? 'Stored now and used by the ad code in Phase 11. Russia and Belarus get our own promos instead of Google ads (ADS-DATA §6).' : 'Only the Owner can change ad slots.'),
      el('label', { class: 'adm-check' }, master, el('span', {}, 'Ads on (master switch)')),
      el('div', { class: 'adm-table-wrap' }, table),
      el('div', { class: 'adm-form-actions' }, save),
      result,
      el('p', { class: 'adm-hint' }, 'Placement A/B tests run from the Experiments screen, one at a time (ADS-DATA §7).'),
    ),
    el('section', { class: 'adm-card adm-section' }, el('h2', { class: 'adm-card-title' }, 'ads.txt'), el('pre', { class: 'adm-pre' }, adsTxt)),
  );
}
