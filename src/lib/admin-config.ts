// Applies the admin's instant settings on the public site (docs/ADMIN.md §2 "instant", §7). Loaded only when
// PUBLIC_ADMIN_CONFIG_ENABLED=true, after `load`. Never moves the layout: hidden games and the hero order only swap what
// is shown inside tiles that are already there; rows are reordered only while they are all below the screen; banners,
// notice and maintenance appear in a fixed bar at the bottom. Without JavaScript pages keep their built defaults.
import { pageType } from './track-rules';

interface Config {
  hidden: string[];
  hero: Record<string, string[]>;
  rows: Record<string, { id: string; active: boolean }[]>;
  banners: { id: number; lang: string; text: string; link: string | null; pages: string[] }[];
  notice: { text: string; link: string | null } | null;
  maintenance: { text: string } | null;
}
interface Game {
  slug: string;
  title: string;
}

const doc = document;
const lang = doc.documentElement.lang || 'en';
const pick = <T>(map: Record<string, T>): T | undefined => map[lang] ?? map['*'];

const titleOf = (a: HTMLElement): string =>
  a.querySelector('.overlay-text, .pz-name span')?.textContent ?? a.getAttribute('aria-label') ?? a.querySelector('img')?.alt ?? '';

// Shows game `g` inside tile `a` (same box, same picture size).
export function showIn(a: HTMLAnchorElement, g: Game): void {
  const old = a.dataset.slug ?? '';
  a.href = `/game/${g.slug}`;
  a.dataset.slug = g.slug;
  delete a.dataset.previewVideo;
  delete a.dataset.screenshots;
  a.querySelector('.badge')?.remove();
  const img = a.querySelector('img');
  if (img) {
    const swap = (v: string): string => v.split(`/thumbs/${old}/`).join(`/thumbs/${g.slug}/`);
    img.src = swap(img.getAttribute('src') ?? '');
    if (img.srcset) img.srcset = swap(img.srcset);
    if (img.alt) img.alt = g.title;
  }
  const t = a.querySelector('.overlay-text, .pz-name span');
  if (t) t.textContent = g.title;
  if (a.hasAttribute('aria-label')) a.setAttribute('aria-label', g.title);
}

function bar(cfg: Config, pt: string): void {
  const items: { id: string; text: string; link: string | null; close: boolean }[] = [];
  if (cfg.maintenance) items.push({ id: 'm', text: cfg.maintenance.text, link: null, close: false });
  if (cfg.notice) items.push({ id: 'n', text: cfg.notice.text, link: cfg.notice.link, close: true });
  for (const b of cfg.banners) {
    if ((b.lang === '*' || b.lang === lang) && (b.pages.includes('*') || b.pages.includes(pt))) items.push({ id: `b${b.id}`, text: b.text, link: b.link, close: true });
  }
  let closed: string[] = [];
  try {
    closed = JSON.parse(sessionStorage.getItem('pz_cfg_closed') ?? '[]') as string[];
  } catch {
    closed = [];
  }
  const show = items.filter((i) => !closed.includes(i.id + i.text));
  if (!show.length) return;
  const box = doc.createElement('div');
  box.className = 'pz-cfg';
  box.setAttribute('role', 'region');
  box.setAttribute('aria-label', 'Site messages');
  for (const i of show) {
    const row = doc.createElement('p');
    row.className = 'pz-cfg-item';
    const text = doc.createElement(i.link ? 'a' : 'span');
    text.textContent = i.text;
    if (i.link) (text as HTMLAnchorElement).href = i.link;
    row.append(text);
    if (i.close) {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'pz-cfg-close';
      btn.setAttribute('aria-label', 'Close message');
      btn.textContent = '×';
      btn.onclick = () => {
        row.remove();
        try {
          sessionStorage.setItem('pz_cfg_closed', JSON.stringify([...closed, i.id + i.text]));
        } catch {
          // Storage blocked: it comes back on the next page.
        }
        if (!box.childElementCount) box.remove();
      };
      row.append(btn);
    }
    box.append(row);
  }
  doc.body.append(box);
}

export async function applyConfig(cfg: Config): Promise<void> {
  const pt = pageType(location.pathname);
  const hidden = new Set(cfg.hidden);
  const tiles = (): HTMLAnchorElement[] => [...doc.querySelectorAll<HTMLAnchorElement>('a[data-slug]')].filter((a) => !a.closest('[data-player]'));
  let index: Game[] | null = null;
  const games = async (): Promise<Game[]> => {
    if (!index) {
      try {
        index = (await (await fetch('/games-index.json')).json()) as Game[];
      } catch {
        index = [];
      }
    }
    return index;
  };

  // Hero order on the home page: the big tiles show the chosen games in order.
  const order = pt === 'home' ? (pick(cfg.hero) ?? []).filter((s) => !hidden.has(s)) : [];
  if (order.length) {
    const big = [...doc.querySelectorAll<HTMLAnchorElement>('main a.tile-xl[data-slug], main a.tile-l[data-slug]')];
    for (let i = 0; i < Math.min(order.length, big.length); i++) {
      const target = big[i];
      const want = order[i];
      if (target.dataset.slug === want) continue;
      const other = tiles().find((a) => a.dataset.slug === want);
      const mine = { slug: target.dataset.slug ?? '', title: titleOf(target) };
      if (other) {
        showIn(target, { slug: want, title: titleOf(other) });
        showIn(other, mine);
      } else {
        const g = (await games()).find((x) => x.slug === want);
        if (g) showIn(target, g);
      }
    }
  }

  // Hidden games: their tiles show another game instead; their own page says the game is resting.
  const swapHidden = async (): Promise<void> => {
    const bad = tiles().filter((a) => hidden.has(a.dataset.slug ?? ''));
    if (!bad.length) return;
    const onPage = new Set(tiles().map((a) => a.dataset.slug));
    // Prefer games not on the page; if every game is already shown, repeat one rather than show a hidden game.
    const ok = (await games()).filter((g) => !hidden.has(g.slug));
    const spare = [...ok.filter((g) => !onPage.has(g.slug)), ...ok];
    for (const a of bad) {
      const g = spare.shift();
      if (g) showIn(a, g);
    }
  };
  if (hidden.size) {
    await swapHidden();
    new MutationObserver(() => void swapHidden()).observe(doc.body, { childList: true, subtree: true });
    const player = doc.querySelector<HTMLElement>('[data-player]');
    if (player && hidden.has(player.dataset.slug ?? '')) {
      player.querySelector('iframe')?.remove();
      cfg.banners.unshift({ id: 0, lang: '*', text: 'This game is taking a short break. Try one of the games below.', link: null, pages: ['game'] });
    }
  }

  // Home rows: new order and on/off, only while every row is still below the screen (so nothing jumps).
  const rows = pt === 'home' ? pick(cfg.rows) : undefined;
  const sections = [...doc.querySelectorAll<HTMLElement>('main section.row[aria-labelledby^="row-"]')];
  if (rows?.length && sections.length && sections.every((s) => s.getBoundingClientRect().top > innerHeight)) {
    const byId = new Map(sections.map((s) => [s.getAttribute('aria-labelledby')?.slice(4), s]));
    const placed: HTMLElement[] = [];
    for (const r of rows) {
      const s = byId.get(r.id);
      if (!s || placed.includes(s)) continue;
      s.hidden = !r.active;
      placed.push(s);
    }
    // Each row slot gets a marker, then the rows go back into the slots in the new order.
    const marks = sections.map((s) => {
      const m = doc.createComment('');
      s.before(m);
      return m;
    });
    [...placed, ...sections.filter((x) => !placed.includes(x))].forEach((s, i) => marks[i].replaceWith(s));
  }

  bar(cfg, pt);
}

export async function start(): Promise<void> {
  try {
    const r = await fetch('/api/config');
    if (r.ok) await applyConfig((await r.json()) as Config);
  } catch {
    // No config: the page stays as built.
  }
}
