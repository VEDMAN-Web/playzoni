// Date range and filters shared by all analytics screens. Kept in the URL (so links can be shared) and remembered in
// this browser for the next screen.

export interface RangeState {
  preset: string;
  from: string;
  to: string;
  compare: boolean;
  country: string;
  device: string;
  lang: string;
}

const KEY = 'pz_admin_range';
export const PRESETS = ['today', 'yesterday', '7', '28', '90', 'custom'];

export const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
export const shiftDay = (d: string, n: number): string => utcDay(Date.parse(`${d}T00:00:00Z`) + n * 86400000);

/** From/to days for a preset, in UTC like the database. */
export function presetDays(preset: string, now = Date.now()): { from: string; to: string } {
  const today = utcDay(now);
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'yesterday') {
    const y = shiftDay(today, -1);
    return { from: y, to: y };
  }
  const n = Number(preset);
  return { from: shiftDay(today, -((Number.isFinite(n) && n > 0 ? n : 7) - 1)), to: today };
}

export function readState(): RangeState {
  const url = new URL(location.href);
  let saved: Partial<RangeState>;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<RangeState>;
  } catch {
    saved = {};
  }
  const p = url.searchParams;
  const preset = p.get('range') ?? saved.preset ?? '7';
  const base = preset === 'custom' ? { from: p.get('from') ?? saved.from ?? '', to: p.get('to') ?? saved.to ?? '' } : presetDays(preset);
  const fallback = presetDays('7');
  return {
    preset: PRESETS.includes(preset) ? preset : '7',
    from: /^\d{4}-\d{2}-\d{2}$/.test(base.from) ? base.from : fallback.from,
    to: /^\d{4}-\d{2}-\d{2}$/.test(base.to) ? base.to : fallback.to,
    compare: (p.get('compare') ?? (saved.compare ? '1' : '0')) === '1',
    country: (p.get('country') ?? saved.country ?? '').toUpperCase(),
    device: p.get('device') ?? saved.device ?? '',
    lang: (p.get('lang') ?? saved.lang ?? '').toLowerCase(),
  };
}

export function saveState(s: RangeState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage blocked: the URL still holds the state.
  }
  const url = new URL(location.href);
  for (const [k, v] of Object.entries(toParams(s, true))) {
    if (v) url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  }
  history.replaceState(null, '', url);
}

/** Query parameters for the API (and, with `withPreset`, for the page URL). */
export function toParams(s: RangeState, withPreset = false): Record<string, string> {
  const out: Record<string, string> = {
    from: s.from,
    to: s.to,
    compare: s.compare ? '1' : '',
    country: s.country,
    device: s.device,
    lang: s.lang,
  };
  if (withPreset) {
    out.range = s.preset;
    if (s.preset !== 'custom') {
      out.from = '';
      out.to = '';
    }
  }
  return out;
}

export function apiParams(s: RangeState): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(toParams(s))) if (v) params.set(k, v);
  return params;
}

/** Short label for the phone "Filters" button, for example "Last 7 days". */
export function label(s: RangeState): string {
  const names: Record<string, string> = { today: 'Today', yesterday: 'Yesterday', '7': 'Last 7 days', '28': 'Last 28 days', '90': 'Last 90 days' };
  const base = names[s.preset] ?? `${s.from} to ${s.to}`;
  const extra = [s.country, s.device, s.lang].filter(Boolean).length;
  return extra ? `${base}, ${extra} filter${extra > 1 ? 's' : ''}` : base;
}
