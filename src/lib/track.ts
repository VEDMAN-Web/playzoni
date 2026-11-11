// Anonymous visit measurement (docs/ADMIN.md §3). Loaded only when PUBLIC_TRACKING_ENABLED=true, after `load`.
// A random id in localStorage (pz_vid) + a session id (new after 30 min idle). No names, no emails, no fingerprinting;
// the server never stores the IP. Off when the visitor turns on "Do not measure me" (pz_no_track) or sends Global
// Privacy Control. Events are batched and sent with sendBeacon to /api/e every 10 s and when the page is hidden.
// Components are not changed: everything is read from existing data attributes and document events.

import { pageType, sessionFor, splitBatches } from './track-rules';

type Ev = { n: string; t: number; s?: string; l?: string; i?: number; v?: number; x?: string };

let ls: Storage;
const doc = document;
const q: Ev[] = [];
let sid = '';
let isNew = 0;
let engaged = 0;
let visibleAt = 0;

export const optedOut = (): boolean => {
  try {
    return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true || localStorage.getItem('pz_no_track') === '1';
  } catch {
    return true;
  }
};

const rnd = (): string => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');

const add = (e: Omit<Ev, 't'>): void => {
  q.push({ ...e, t: Date.now() });
};

function tick(): void {
  if (visibleAt) engaged += Date.now() - visibleAt;
  visibleAt = doc.visibilityState === 'visible' ? Date.now() : 0;
}

export function flush(): void {
  tick();
  if (optedOut()) {
    q.length = 0;
    return;
  }
  const eng = Math.round(engaged / 1000);
  engaged -= eng * 1000;
  if (!q.length && !eng) return;
  try {
    ls.setItem('pz_sat', String(Date.now()));
  } catch {
    // Storage blocked: the session simply restarts next page.
  }
  const parts = splitBatches(q.splice(0));
  (parts.length ? parts : [[]]).forEach((e, n) => {
    const body = JSON.stringify({ vid: ls.getItem('pz_vid'), sid, nw: isNew, p: location.pathname, lang: doc.documentElement.lang, eng: n ? 0 : eng, e });
    navigator.sendBeacon('/api/e', new Blob([body], { type: 'text/plain' }));
  });
}

// Which list a tile belongs to, and its 1-based position in that list.
function listOf(a: Element): [string, number] {
  const box =
    a.closest('[data-search-results],[data-search-popular],[data-search-recent]') ??
    a.closest('[data-profile-panel],[data-recent],section.row') ??
    a.closest('main');
  let id = 'mosaic';
  if (box) {
    const d = (box as HTMLElement).dataset;
    if ('searchResults' in d) id = 'search';
    else if ('searchPopular' in d) id = 'search-popular';
    else if ('searchRecent' in d) id = 'search-recent';
    else if ('profilePanel' in d) id = 'profile';
    else if ('recent' in d) id = 'recent';
    else if (box.matches('section.row')) id = 'row:' + (box.getAttribute('aria-labelledby') ?? '').replace(/^row-/, '');
    else if (pageType(location.pathname) === 'game') id = 'related';
  }
  return [id, box ? Array.prototype.indexOf.call(box.querySelectorAll('a[data-slug]'), a) + 1 : 0];
}

function watchTiles(): void {
  const seen = new WeakSet<Element>();
  const timers = new Map<Element, number>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        const el = en.target;
        if (en.isIntersecting && !seen.has(el)) {
          timers.set(
            el,
            window.setTimeout(() => {
              seen.add(el);
              io.unobserve(el);
              const [l, i] = listOf(el);
              add({ n: 'tile_impression', s: (el as HTMLElement).dataset.slug, l, i, v: 5 });
            }, 1000),
          );
        } else clearTimeout(timers.get(el));
      }
    },
    { threshold: 0.5 },
  );
  const scan = (): void => doc.querySelectorAll('a[data-slug]').forEach((a) => seen.has(a) || io.observe(a));
  scan();
  new MutationObserver(scan).observe(doc.body, { childList: true, subtree: true });
}

function watchPlay(): void {
  const root = doc.querySelector<HTMLElement>('[data-player]');
  if (!root) return;
  const slug = root.dataset.slug;
  let secs = 0;
  let on = false;
  let fs = '';
  const end = (): void => {
    if (on) add({ n: 'play_end', s: slug, v: secs, x: fs });
    on = false;
  };
  new MutationObserver(() => {
    const has = !!root.querySelector('iframe');
    if (has && !on) {
      on = true;
      secs = 0;
      add({ n: 'play_start', s: slug });
    } else if (!has) end();
  }).observe(root, { childList: true, subtree: true });
  setInterval(() => {
    if (!on || doc.visibilityState !== 'visible') return;
    if (doc.fullscreenElement || root.querySelector('.is-overlay')) fs = 'fs';
    if (++secs === 30) add({ n: 'play_30s', s: slug });
  }, 1000);
  addEventListener('pagehide', end);
}

function vitals(): void {
  let lcp = 0;
  let cls = 0;
  let inp = 0;
  const po = (type: string, fn: (e: PerformanceEntry & Record<string, number>) => void, opts: object = {}): void => {
    try {
      new PerformanceObserver((l) => l.getEntries().forEach((e) => fn(e as PerformanceEntry & Record<string, number>))).observe({ type, buffered: true, ...opts });
    } catch {
      // Not supported in this browser.
    }
  };
  po('largest-contentful-paint', (e) => (lcp = e.startTime));
  po('layout-shift', (e) => {
    if (!e.hadRecentInput) cls += e.value;
  });
  po('event', (e) => (inp = Math.max(inp, e.duration)), { durationThreshold: 40 });
  addEventListener('pagehide', () => add({ n: 'web_vitals', v: Math.round(lcp), x: `${Math.round(lcp)},${Math.round(inp)},${cls.toFixed(3)}` }), { once: true });
}

export function start(): void {
  try {
    ls = localStorage;
  } catch {
    return;
  }
  if (optedOut()) return;
  const now = Date.now();
  if (!ls.getItem('pz_vid')) ls.setItem('pz_vid', rnd());
  const s = sessionFor(now, Number(ls.getItem('pz_sat')) || 0, ls.getItem('pz_sid'), rnd());
  sid = s.sid;
  if (s.fresh) {
    ls.setItem('pz_sid', sid);
    ls.setItem('pz_vnew', ls.getItem('pz_vnew') ? '0' : sid);
    add({ n: 'session_start' });
  }
  isNew = ls.getItem('pz_vnew') === sid ? 1 : 0;
  ls.setItem('pz_sat', String(now));

  const p = new URLSearchParams(location.search);
  let ref = '';
  try {
    ref = new URL(doc.referrer).hostname.replace(/^www\./, '');
    if (ref === location.hostname.replace(/^www\./, '')) ref = '';
  } catch {
    // No referrer.
  }
  const w = innerWidth;
  add({
    n: 'page_view',
    x: [ref, p.get('utm_source') ?? '', p.get('utm_medium') ?? '', p.get('utm_campaign') ?? '', w < 480 ? 'xs' : w < 1024 ? 'sm' : w < 1440 ? 'md' : 'lg'].join('|'),
  });

  visibleAt = doc.visibilityState === 'visible' ? now : 0;
  doc.addEventListener('visibilitychange', () => (doc.visibilityState === 'hidden' ? flush() : tick()));
  addEventListener('pagehide', () => {
    add({ n: 'session_end', v: Math.round((engaged + (visibleAt ? Date.now() - visibleAt : 0)) / 1000) });
    flush();
  });
  setInterval(flush, 10000);

  if (Math.random() < 0.2) watchTiles();
  if (Math.random() < 0.1) vitals();
  watchPlay();

  const marks = [25, 50, 75, 100];
  addEventListener(
    'scroll',
    () => {
      const h = doc.documentElement.scrollHeight - innerHeight;
      const pct = h > 0 ? (scrollY / h) * 100 : 100;
      while (marks.length && pct >= marks[0] - 0.5) add({ n: 'scroll_depth', v: marks.shift() });
    },
    { passive: true },
  );

  doc.addEventListener('pz:row-more', (e) => {
    const d = (e as CustomEvent<{ row?: string; batch?: number }>).detail ?? {};
    add({ n: 'row_more', l: d.row, v: d.batch });
  });

  let timer = 0;
  let lastQ = '';
  const input = (): HTMLInputElement | null => doc.querySelector('[data-search-input]');
  const query = (): string => (input()?.value ?? '').trim().toLowerCase().slice(0, 60);
  const search = (): void => {
    clearTimeout(timer);
    const v = query();
    if (!v || v === lastQ) return;
    lastQ = v;
    add({ n: 'search', x: v, v: doc.querySelectorAll('[data-search-results] a[data-slug]').length });
  };
  doc.addEventListener('input', (e) => {
    if ((e.target as Element).matches?.('[data-search-input]')) {
      clearTimeout(timer);
      timer = window.setTimeout(search, 800);
    }
  });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target as Element).matches?.('[data-search-input]')) search();
  });

  doc.addEventListener('click', (e) => {
    const el = e.target as Element;
    const a = el.closest?.('a[data-slug]') as HTMLAnchorElement | null;
    const btn = el.closest?.('button,a');
    if (a) {
      const [l, i] = listOf(a);
      const s = a.dataset.slug;
      if (l.startsWith('search')) add({ n: 'search_click', s, l, i, x: query() });
      else add({ n: 'tile_click', s, l, i });
      flush();
      return;
    }
    if (!btn) return;
    const d = (btn as HTMLElement).dataset;
    const slug = doc.querySelector<HTMLElement>('[data-player]')?.dataset.slug;
    if ('fav' in d) add({ n: btn.getAttribute('aria-pressed') === 'true' ? 'favourite_add' : 'favourite_remove', s: slug });
    else if ('share' in d) add({ n: 'share', s: slug });
    else if ('fullscreen' in d) add({ n: 'fullscreen', s: slug });
    else if ('profileOpen' in d) add({ n: 'profile_open' });
    else if (btn.closest('[data-player]') && (btn.getAttribute('href') ?? '').startsWith('mailto:')) add({ n: 'game_error', s: slug, x: 'report' });
    else {
      const href = btn.getAttribute('href') ?? '';
      const m = href.match(/^\/([a-z0-9-]+-games)$/);
      if (m && !/^(all|new|popular)-games$/.test(m[1])) {
        add({ n: 'category_click', x: m[1], l: btn.classList.contains('cat-tile') ? 'tile' : btn.closest('[data-search-panel]') ? 'search' : btn.closest('header,nav,footer') ? 'nav' : 'chip' });
        flush();
      }
    }
  });
}
