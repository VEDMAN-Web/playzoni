// The event dictionary (docs/ADMIN.md §3) and the checks /api/e runs on every batch. Pure: no database here.
import { pageType } from '../../../src/lib/track-rules';
import { dayOf, isObj } from './validate';

export const EVENT_NAMES = [
  'page_view',
  'session_start',
  'session_end',
  'tile_impression',
  'tile_click',
  'category_click',
  'row_more',
  'search',
  'search_click',
  'play_start',
  'play_30s',
  'play_end',
  'game_error',
  'favourite_add',
  'favourite_remove',
  'share',
  'fullscreen',
  'profile_open',
  'pwa_prompt',
  'pwa_install',
  'push_prompt',
  'push_subscribe',
  'lang_suggest_shown',
  'lang_switch',
  'ad_request',
  'ad_impression',
  'ad_viewable',
  'ad_click',
  'scroll_depth',
  'web_vitals',
] as const;
export type EventName = (typeof EVENT_NAMES)[number];
const NAMES = new Set<string>(EVENT_NAMES);

export const MAX_EVENTS = 50;
export const MAX_BODY_BYTES = 32 * 1024;

export interface Context {
  country: string;
  region: string | null;
  device: string;
  os: string;
  browser: string;
}

/** One row for the `events` table (column names). */
export interface EventRow {
  ts: number;
  day: string;
  vid: string;
  sid: string;
  name: EventName;
  path: string;
  page_type: string;
  lang: string | null;
  slug: string | null;
  list_id: string | null;
  position: number | null;
  country: string;
  region: string | null;
  device: string;
  os: string;
  browser: string;
  ref_domain: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  value_num: number | null;
  value_text: string | null;
}

export interface SessionDelta {
  sid: string;
  vid: string;
  day: string;
  start_ts: number;
  end_ts: number;
  engaged_s: number;
  pages: number;
  plays: number;
  country: string;
  device: string;
  lang: string | null;
  ref_domain: string | null;
  utm_campaign: string | null;
  is_new: number;
}

export type Checked = { ok: true; rows: EventRow[]; session: SessionDelta; dropped: number } | { ok: false; status: number; error: string };

const ID_RE = /^[a-f0-9]{8,64}$/;
const LIST_RE = /^[a-z0-9:_-]{1,60}$/;
const SLUG_RE = /^[a-z0-9-]{1,80}$/;

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  return s === '' ? null : s;
};
const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null;
const domain = (v: string | undefined): string | null => {
  const d = (v ?? '').toLowerCase().replace(/^www\./, '');
  return /^[a-z0-9.-]{1,100}$/.test(d) ? d : null;
};

/**
 * Checks one request body from the tracking script. Unknown or broken events are dropped one by one; a broken envelope
 * (ids, size) rejects the whole request. `now` is the server time; event times are taken relative to it (never trusted).
 */
export function checkBatch(body: unknown, ctx: Context, now: number): Checked {
  if (!isObj(body)) return { ok: false, status: 400, error: 'body must be a JSON object' };
  const vid = typeof body.vid === 'string' && ID_RE.test(body.vid) ? body.vid : null;
  const sid = typeof body.sid === 'string' && ID_RE.test(body.sid) ? body.sid : null;
  if (!vid || !sid) return { ok: false, status: 400, error: 'bad ids' };
  const list = Array.isArray(body.e) ? body.e : [];
  if (list.length > MAX_EVENTS) return { ok: false, status: 413, error: `at most ${MAX_EVENTS} events per request` };
  const path = typeof body.p === 'string' && body.p.startsWith('/') ? (text(body.p, 200) ?? '/') : '/';
  const pt = pageType(path);
  const lang = text(body.lang, 10)?.toLowerCase() ?? null;
  const eng = Math.round(num(body.eng, 0, 600) ?? 0);

  // Client clock only gives the order: the newest event is "now", the others are placed before it (max 15 min).
  const times = list.map((e) => (isObj(e) && typeof e.t === 'number' && Number.isFinite(e.t) ? e.t : 0));
  const newest = Math.max(0, ...times);
  const day = dayOf(now);

  const rows: EventRow[] = [];
  let pages = 0;
  let plays = 0;
  let ref: string | null = null;
  let campaign: string | null = null;
  list.forEach((e, idx) => {
    if (!isObj(e) || typeof e.n !== 'string' || !NAMES.has(e.n)) return;
    const name = e.n as EventName;
    const back = Math.min(15 * 60 * 1000, Math.max(0, newest - times[idx]));
    const row: EventRow = {
      ts: now - back,
      day,
      vid,
      sid,
      name,
      path,
      page_type: pt,
      lang,
      slug: typeof e.s === 'string' && SLUG_RE.test(e.s) ? e.s : null,
      list_id: typeof e.l === 'string' && LIST_RE.test(e.l) ? e.l : null,
      position: num(e.i, 0, 100000) === null ? null : Math.round(e.i as number),
      country: ctx.country,
      region: ctx.region,
      device: ctx.device,
      os: ctx.os,
      browser: ctx.browser,
      ref_domain: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      value_num: num(e.v, -1e9, 1e9),
      value_text: text(e.x, 200),
    };
    if (name === 'page_view') {
      // x = "referrer|utm_source|utm_medium|utm_campaign|screen bucket"
      const [r, us, um, uc, screen] = (typeof e.x === 'string' ? e.x : '').split('|');
      row.ref_domain = domain(r);
      row.utm_source = text(us, 60)?.toLowerCase() ?? null;
      row.utm_medium = text(um, 60)?.toLowerCase() ?? null;
      row.utm_campaign = text(uc, 60)?.toLowerCase() ?? null;
      row.value_text = ['xs', 'sm', 'md', 'lg'].includes(screen ?? '') ? screen : null;
      pages++;
      ref ??= row.ref_domain;
      campaign ??= row.utm_campaign;
    }
    if (name === 'search' || name === 'search_click') row.value_text = text(e.x, 60)?.toLowerCase() ?? null;
    if (name === 'play_start') plays++;
    rows.push(row);
  });

  const start = rows.length ? Math.min(...rows.map((r) => r.ts)) : now;
  return {
    ok: true,
    rows,
    dropped: list.length - rows.length,
    session: {
      sid,
      vid,
      day,
      start_ts: start,
      end_ts: now,
      engaged_s: eng,
      pages,
      plays,
      country: ctx.country,
      device: ctx.device,
      lang,
      ref_domain: ref,
      utm_campaign: campaign,
      is_new: body.nw === 1 ? 1 : 0,
    },
  };
}
