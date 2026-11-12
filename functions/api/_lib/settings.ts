// Instant settings (docs/ADMIN.md §2, §5.14, §5.15): which keys exist, who may change them, their checks and defaults.
// Stored as JSON in the `settings` table. The public site reads the safe ones through /api/config.
import type { Role } from './auth';
import type { D1Database } from './types';
import { isObj, str } from './validate';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

interface Spec {
  role: Role;
  label: string;
  fallback: Json;
  check(value: unknown): Json | string;
}

const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const link = (v: unknown): string | null => {
  const s = str(v, 300);
  if (!s) return null;
  return /^(\/[^\s]*|https:\/\/[^\s]+)$/.test(s) ? s : null;
};
const noLongDash = (s: string): string => s.replace(/[–—]/g, ',');

export const SETTINGS: Record<string, Spec> = {
  flags: {
    role: 'owner',
    label: 'Feature flags',
    fallback: { hoverPreview: true, playedBadge: true, abTests: false },
    check: (v) => (isObj(v) ? { hoverPreview: bool(v.hoverPreview, true), playedBadge: bool(v.playedBadge, true), abTests: bool(v.abTests, false) } : 'flags must be an object'),
  },
  tracking: {
    role: 'owner',
    label: 'Measurement',
    fallback: { enabled: true },
    check: (v) => (isObj(v) ? { enabled: bool(v.enabled, true) } : 'tracking must be an object'),
  },
  retention: {
    role: 'owner',
    label: 'Data retention',
    fallback: { rawDays: 90 },
    check: (v) => (isObj(v) && [30, 60, 90].includes(Number(v.rawDays)) ? { rawDays: Number(v.rawDays) } : 'raw data can be kept 30, 60 or 90 days'),
  },
  languages: {
    role: 'owner',
    label: 'Language rules',
    fallback: { defaultLang: 'en', suggest: false },
    check: (v) =>
      isObj(v) && typeof v.defaultLang === 'string' && /^[a-z]{2}$/.test(v.defaultLang)
        ? { defaultLang: v.defaultLang, suggest: bool(v.suggest, false) }
        : 'default language must be a 2-letter code',
  },
  notice: {
    role: 'editor',
    label: 'Site notice bar',
    fallback: { active: false, text: '', link: null },
    check: (v) => {
      if (!isObj(v)) return 'notice must be an object';
      const text = noLongDash(str(v.text, 140) ?? '');
      if (bool(v.active, false) && !text) return 'the notice needs text';
      return { active: bool(v.active, false), text, link: link(v.link) };
    },
  },
  maintenance: {
    role: 'editor',
    label: 'Maintenance message',
    fallback: { active: false, text: '' },
    check: (v) => {
      if (!isObj(v)) return 'maintenance must be an object';
      const text = noLongDash(str(v.text, 140) ?? '');
      if (bool(v.active, false) && !text) return 'the message needs text';
      return { active: bool(v.active, false), text };
    },
  },
  ads: {
    role: 'owner',
    label: 'Ad slots',
    fallback: { enabled: false, slots: {} },
    check: (v) => {
      if (!isObj(v)) return 'ads must be an object';
      const slots: Record<string, Json> = {};
      if (isObj(v.slots)) {
        for (const [id, s] of Object.entries(v.slots)) {
          if (!/^[A-Z][0-9]$/.test(id) || !isObj(s)) continue;
          const groups = isObj(s.groups) ? Object.fromEntries(Object.entries(s.groups).filter(([g]) => /^[a-z-]{2,20}$/.test(g)).map(([g, on]) => [g, on === true])) : {};
          slots[id] = { on: s.on === true, groups };
        }
      }
      return { enabled: v.enabled === true, slots };
    },
  },
};

export async function readSettings(db: D1Database): Promise<Record<string, Json>> {
  const rows = (await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>()).results;
  const out: Record<string, Json> = {};
  for (const [key, spec] of Object.entries(SETTINGS)) out[key] = spec.fallback;
  for (const r of rows) {
    if (!(r.key in SETTINGS)) continue;
    try {
      out[r.key] = JSON.parse(r.value) as Json;
    } catch {
      // Keep the default for a broken row.
    }
  }
  return out;
}

export async function readSetting<T extends Json>(db: D1Database, key: string): Promise<T> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
  try {
    return (row ? JSON.parse(row.value) : SETTINGS[key]?.fallback) as T;
  } catch {
    return SETTINGS[key]?.fallback as T;
  }
}
