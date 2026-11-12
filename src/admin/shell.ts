// Admin shell behaviour: phone menu and filter sheets, date range + compare + filters (kept in the URL and in this
// browser), links that keep the chosen range, the signed-in user menu, the demo banner, and the game finder.
import { ApiError, getMe, staticJson } from './api';
import { label, presetDays, readState, saveState, type RangeState } from './range';
import { startTopSave } from './top-save';

export const RANGE_EVENT = 'adm:range';

let state: RangeState;
export const currentRange = (): RangeState => state;

const $ = <T extends HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);

function sheet(button: HTMLElement | null, panel: HTMLElement | null, backdrop: HTMLElement | null): (open: boolean) => void {
  const set = (open: boolean): void => {
    panel?.classList.toggle('is-open', open);
    if (backdrop) backdrop.hidden = !open;
    button?.setAttribute('aria-expanded', String(open));
    if (open) panel?.querySelector<HTMLElement>('a, button, select, input')?.focus();
    else if (panel?.contains(document.activeElement)) button?.focus();
  };
  button?.addEventListener('click', () => set(!panel?.classList.contains('is-open')));
  return set;
}

function syncLinks(): void {
  const keep = new URLSearchParams(location.search);
  for (const a of document.querySelectorAll<HTMLAnchorElement>('[data-adm-link]')) {
    const url = new URL(a.href, location.origin);
    for (const k of ['range', 'from', 'to', 'compare', 'country', 'device', 'lang']) {
      const v = keep.get(k);
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
    a.href = url.pathname + url.search;
  }
}

function wireControls(): void {
  const select = $<HTMLSelectElement>('[data-adm-range]');
  const custom = $('[data-adm-custom]');
  const from = $<HTMLInputElement>('[data-adm-from]');
  const to = $<HTMLInputElement>('[data-adm-to]');
  const compare = $<HTMLInputElement>('[data-adm-compare]');
  const country = $<HTMLInputElement>('[data-adm-country]');
  const device = $<HTMLSelectElement>('[data-adm-device]');
  const lang = $<HTMLInputElement>('[data-adm-lang]');
  const rangeLabel = $('[data-adm-range-label]');

  const paint = (): void => {
    if (select) select.value = state.preset;
    if (custom) custom.hidden = state.preset !== 'custom';
    if (from) from.value = state.from;
    if (to) to.value = state.to;
    if (compare) compare.checked = state.compare;
    if (country) country.value = state.country;
    if (device) device.value = state.device;
    if (lang) lang.value = state.lang;
    if (rangeLabel) rangeLabel.textContent = select ? label(state) : 'Filters';
  };
  const changed = (): void => {
    saveState(state);
    paint();
    syncLinks();
    document.dispatchEvent(new CustomEvent(RANGE_EVENT, { detail: state }));
  };
  select?.addEventListener('change', () => {
    state.preset = select.value;
    if (state.preset !== 'custom') Object.assign(state, presetDays(state.preset));
    changed();
  });
  for (const input of [from, to]) {
    input?.addEventListener('change', () => {
      if (from?.value && to?.value) {
        state.from = from.value <= to.value ? from.value : to.value;
        state.to = from.value <= to.value ? to.value : from.value;
        changed();
      }
    });
  }
  compare?.addEventListener('change', () => {
    state.compare = compare.checked;
    changed();
  });
  country?.addEventListener('change', () => {
    state.country = /^[a-z]{2}$/i.test(country.value.trim()) ? country.value.trim().toUpperCase() : '';
    changed();
  });
  device?.addEventListener('change', () => {
    state.device = device.value;
    changed();
  });
  lang?.addEventListener('change', () => {
    state.lang = /^[a-z]{2}(-[a-z]{2})?$/i.test(lang.value.trim()) ? lang.value.trim().toLowerCase() : '';
    changed();
  });
  paint();
}

async function wireUser(): Promise<void> {
  const btn = $<HTMLButtonElement>('[data-adm-user-btn]');
  const menu = $('[data-adm-user-menu]');
  btn?.addEventListener('click', () => {
    if (!menu) return;
    menu.hidden = !menu.hidden;
    btn.setAttribute('aria-expanded', String(!menu.hidden));
  });
  document.addEventListener('click', (e) => {
    if (menu && !menu.hidden && !(e.target as Element).closest('.adm-user')) {
      menu.hidden = true;
      btn?.setAttribute('aria-expanded', 'false');
    }
  });
  try {
    const me = await getMe();
    const initial = $('[data-adm-initial]');
    if (initial) initial.textContent = me.email.slice(0, 1).toUpperCase();
    const email = $('[data-adm-email]');
    if (email) email.textContent = me.email;
    const role = $('[data-adm-role]');
    if (role) role.textContent = `Role: ${me.role}`;
    const demo = $('[data-demo]');
    if (demo) demo.hidden = !me.demo;
  } catch (error) {
    const box = $('[data-adm-auth-error]');
    if (box) {
      box.textContent = error instanceof ApiError ? error.message : 'Could not check your sign-in. Check your connection and reload.';
      box.hidden = false;
    }
    const email = $('[data-adm-email]');
    if (email) email.textContent = 'Not signed in';
  }
}

async function wireFind(): Promise<void> {
  const form = $<HTMLFormElement>('[data-adm-find]');
  const input = $<HTMLInputElement>('[data-adm-find-input]');
  const list = $('[data-adm-find-list]');
  if (!form || !input || !list || getComputedStyle(form).display === 'none') return;
  let games: { slug: string; title: string }[] = [];
  input.addEventListener(
    'focus',
    async () => {
      try {
        games = await staticJson<{ slug: string; title: string }[]>('games');
        list.replaceChildren(...games.map((g) => Object.assign(document.createElement('option'), { value: g.title })));
      } catch {
        // The finder simply has no suggestions.
      }
    },
    { once: true },
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim().toLowerCase();
    const hit = games.find((g) => g.title.toLowerCase() === text) ?? games.find((g) => g.title.toLowerCase().includes(text) || g.slug === text);
    if (hit) location.href = `/admin/game?slug=${encodeURIComponent(hit.slug)}`;
  });
}

export function startShell(): void {
  state = readState();
  const backdrop = $('[data-adm-backdrop]');
  const nav = sheet($('[data-adm-menu]'), $('[data-adm-nav]'), backdrop);
  const filters = sheet($('[data-adm-filters]'), $('[data-adm-controls]'), backdrop);
  $('[data-adm-done]')?.addEventListener('click', () => filters(false));
  backdrop?.addEventListener('click', () => {
    nav(false);
    filters(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      nav(false);
      filters(false);
      const menu = $('[data-adm-user-menu]');
      if (menu) menu.hidden = true;
    }
  });
  if ($('[data-adm-range]') || $('[data-adm-country]')) saveState(state);
  wireControls();
  syncLinks();
  void wireUser();
  void wireFind();
  startTopSave();
}
