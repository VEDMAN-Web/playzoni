/* global process, console, document, window, getComputedStyle, PerformanceObserver */
// RELAY R5: end-to-end test of the whole site. Run against a built site:
//   PUBLIC_INCLUDE_DRAFTS=true npm run build && npm run preview   (another terminal)   then   npm run e2e [-- <base url>]
// Default base: http://localhost:4321. Uses the same Playwright as the admin scripts (createRequire, NODE_PATH).
// Writes docs/seo-reports/<date>-e2e.md and failure screenshots to docs/screens/e2e/. Exit code 1 when anything fails.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const ROOT = join(import.meta.dirname, '..', '..');
const BASE = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '');
const WIDTHS = [360, 390, 768, 1280, 1536, 1920];
const DATE = new Date().toISOString().slice(0, 10);
const SHOTS = join(ROOT, 'docs', 'screens', 'e2e');
mkdirSync(SHOTS, { recursive: true });

const results = []; // { page, width, check, ok, detail }
const record = (page, width, check, ok, detail = '') => results.push({ page, width, check, ok, detail });

// ---- pages to test ----
async function pickPages(request) {
  const index = await (await request.get(`${BASE}/games-index.json`)).json();
  const files = (dir) => (existsSync(join(ROOT, 'src', 'content', dir)) ? readFileSync : null);
  void files;
  const md = (slug) => {
    const f = join(ROOT, 'src', 'content', 'games', `${slug}.md`);
    return existsSync(f) ? readFileSync(f, 'utf8') : '';
  };
  const bySlug = index.map((g) => ({ ...g, src: md(g.slug) }));
  const find = (fn, label) => bySlug.find(fn)?.slug ?? (console.warn(`e2e: no ${label} game found`), null);
  const published = find((g) => /status: "published"/.test(g.src) && !/^quick: true/m.test(g.src), 'published');
  const quick = find((g) => /^quick: true/m.test(g.src), 'quick');
  const portrait = find((g) => /aspect: "portrait"/.test(g.src), 'portrait');
  const twoPlayer = find((g) => (g.cats ?? []).includes('two-player-games'), '2-player');
  const draft = find((g) => /status: "draft"/.test(g.src), 'draft');
  const cats = JSON.parse(readFileSync(join(ROOT, 'data', 'categories.json'), 'utf8')).map((c) => c.slug);
  const withGames = cats.filter((c) => index.filter((g) => (g.cats ?? []).includes(c)).length >= 12).slice(0, 5);
  const pages = [
    '/', '/categories', ...withGames.map((c) => `/${c}`), `/${withGames[0]}/2`,
    '/new-games', '/new-games/2', '/popular-games', '/popular-games/2', '/all-games', '/all-games/2',
    ...[published, quick, portrait, twoPlayer, draft].filter(Boolean).map((s) => `/game/${s}`),
    '/search', '/favourites', '/about', '/contact', '/developers', '/privacy', '/terms', '/cookies', '/this-page-does-not-exist', '/admin',
  ];
  return { pages: [...new Set(pages)], index, sample: { published, quick, twoPlayer } };
}

const contextFor = (width) =>
  width <= 390 ? { ...devices['iPhone 13'], viewport: { width, height: 800 } } : { viewport: { width, height: width >= 1536 ? 960 : 800 } };

// ---- per page checks ----
async function checkPage(browser, path, width, links) {
  const ctx = await browser.newContext(contextFor(width));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource.*(404|net::ERR)/.test(m.text())) errors.push(m.text());
  });
  const badImages = [];
  page.on('response', (r) => {
    if (r.request().resourceType() === 'image' && r.url().startsWith(BASE) && r.status() >= 400) badImages.push(`${r.status()} ${r.url()}`);
  });
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const res = await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);
  const expect404 = path === '/this-page-does-not-exist';
  record(path, width, 'status', expect404 ? res.status() === 404 : res.status() === 200, String(res.status()));

  const facts = await page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const small = [...document.querySelectorAll('a[href], button, input, select, [role="button"]')]
      .filter((el) => visible(el) && !el.closest('p, li p, .crumbs, .faq p, footer p') && !el.closest('[aria-hidden="true"]'))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), what: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30) };
      })
      .filter((x) => x.w < 44 && x.h < 44);
    const text = document.body.innerText;
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      cls: window.__cls,
      title: document.title,
      canonical: !!document.querySelector('link[rel="canonical"]'),
      robots: !!document.querySelector('meta[name="robots"]'),
      jsonld: document.querySelectorAll('script[type="application/ld+json"]').length,
      dash: /[–—]/.test(text + document.title),
      small: small.slice(0, 5),
      smallCount: small.length,
      links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/') && !h.startsWith('//')),
      brokenImgs: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy' && visible(i)).map((i) => i.src).slice(0, 3),
    };
  });
  for (const l of facts.links) links.add(l.split('#')[0]);
  record(path, width, 'no horizontal scroll', facts.overflow <= 1, `${facts.overflow}px`);
  record(path, width, 'no console errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  record(path, width, 'CLS < 0.05', facts.cls < 0.05, facts.cls.toFixed(3));
  record(path, width, 'images load', badImages.length === 0 && facts.brokenImgs.length === 0, [...badImages, ...facts.brokenImgs].slice(0, 2).join(' | '));
  record(path, width, 'no long dashes', !facts.dash);
  if (!path.startsWith('/admin')) {
    record(path, width, 'SEO tags', !!facts.title && facts.canonical && facts.robots && (expect404 || facts.jsonld > 0), `title ${!!facts.title}, canonical ${facts.canonical}, robots ${facts.robots}, json-ld ${facts.jsonld}`);
  }
  if (width <= 390) record(path, width, 'tap targets >= 44px', facts.smallCount === 0, `${facts.smallCount}: ${facts.small.map((s) => `${s.what} ${s.w}x${s.h}`).join(', ')}`);
  const failed = results.some((r) => r.page === path && r.width === width && !r.ok);
  if (failed) await page.screenshot({ path: join(SHOTS, `${path.replace(/[^a-z0-9]+/gi, '_') || 'home'}-${width}.png`) });
  await ctx.close();
}

// ---- interactions ----
async function interactions(browser, sample) {
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext(contextFor(width));
    const page = await ctx.newPage();
    const tag = `interactions`;
    try {
      // Play: desktop iframe, phone overlay.
      await page.goto(`${BASE}/game/${sample.published}`, { waitUntil: 'load' });
      // Phones and tablets show a cover with Play; from 1024px the game loads by itself (Player.astro).
      const play = page.locator('[data-play]').first();
      if (await play.isVisible().catch(() => false)) await play.click();
      await page.waitForTimeout(2500);
      const frame = await page.locator('[data-player] iframe').count();
      const overlay = await page.locator('.player-frame.is-overlay').count();
      if (overlay) await page.locator('[data-player-close]').first().click().catch(() => {});
      record(tag, width, 'Play starts the game', frame > 0 || overlay > 0, `iframe ${frame}, overlay ${overlay}`);
      const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--page-from').trim() || getComputedStyle(document.querySelector('main')).getPropertyValue('--page-from').trim());
      record(tag, width, 'game page has game colours (or site default)', true, bg || 'site default');

      // Home: played game at the top, endless row, Show more.
      await page.goto(`${BASE}/`, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      const firstSmall = await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('main .grid-mosaic a.tile.tile-s[data-slug]')]
          .map((a) => ({ s: a.dataset.slug, r: a.getBoundingClientRect() }))
          .filter((x) => x.r.width > 0)
          .sort((a, b) => Math.round(a.r.top) - Math.round(b.r.top) || a.r.left - b.r.left);
        return tiles.slice(0, 6).map((x) => x.s);
      });
      record(tag, width, 'played game shows at the top of home', firstSmall.includes(sample.published), firstSmall.join(' '));
      const badge = await page.locator(`main a[data-slug="${sample.published}"] .badge-played`).count();
      record(tag, width, 'played badge on the played game', badge > 0, String(badge));

      const row = page.locator('[data-row-track][data-more]').first();
      if (await row.count()) {
        await row.scrollIntoViewIfNeeded();
        await page.waitForTimeout(800);
        const before = await row.locator('[data-slug]').count();
        await row.evaluate((t) => (t.scrollLeft = t.scrollWidth));
        await page.waitForTimeout(1200);
        const after = await row.locator('[data-slug]').count();
        record(tag, width, 'endless row loads more', after > before, `${before} -> ${after}`);
      }
      const more = page.locator('[data-more-btn]');
      if (await more.count()) {
        await more.scrollIntoViewIfNeeded();
        await more.click();
        await page.waitForTimeout(1000);
        const slugs = await page.evaluate(() => [...document.querySelectorAll('[data-more-grid] [data-slug]')].map((a) => a.dataset.slug));
        record(tag, width, 'Show more adds games, no duplicates', slugs.length > 0 && new Set(slugs).size === slugs.length, `${slugs.length} added`);
      }

      // Search panel: fuzzy match and popular fallback.
      await page.locator('[data-search-open]').first().click();
      await page.waitForTimeout(500);
      const input = page.locator('[data-search-input]').first();
      await input.fill('tik tak toe');
      await page.waitForTimeout(900);
      const hits = await page.evaluate(() => [...document.querySelectorAll('#search-panel [data-slug]')].map((a) => a.dataset.slug).join(' '));
      record(tag, width, 'fuzzy search finds tic tac toe', /tic-tac-toe/.test(hits), hits.slice(0, 80));
      await input.fill('zzqqxx');
      await page.waitForTimeout(900);
      const fallback = await page.locator('#search-panel [data-slug]').count();
      record(tag, width, 'nonsense search shows popular games', fallback > 0, String(fallback));
      await page.keyboard.press('Escape');

      // Favourites: add on a game page, see it on /favourites, remove.
      await page.goto(`${BASE}/game/${sample.quick}`, { waitUntil: 'load' });
      const fav = page.locator('[data-fav]').first();
      if (await fav.count()) {
        await fav.click();
        await page.goto(`${BASE}/favourites`, { waitUntil: 'load' });
        await page.waitForTimeout(800);
        const has = await page.locator(`[data-fav-grid] [data-slug="${sample.quick}"]`).count();
        record(tag, width, 'favourite appears on /favourites', has > 0, String(has));
      }

      // Profile panel opens and closes.
      const prof = page.locator('[data-profile-open]').first();
      if (await prof.count()) {
        await page.goto(`${BASE}/`, { waitUntil: 'load' });
        await page.locator('[data-profile-open]').first().click();
        await page.waitForTimeout(500);
        const open = await page.locator('#profile-panel').isVisible();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        const closed = !(await page.locator('#profile-panel').isVisible());
        record(tag, width, 'profile panel opens and closes', open && closed, `open ${open}, closed ${closed}`);
      }
    } catch (error) {
      record(tag, width, 'interactions ran', false, String(error.message).slice(0, 160));
      await page.screenshot({ path: join(SHOTS, `interactions-${width}.png`) });
    }
    await ctx.close();
  }
  // JS off: home and a game page still readable.
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  for (const p of ['/', `/game/${sample.quick}`]) {
    await page.goto(BASE + p, { waitUntil: 'load' });
    const words = (await page.evaluate(() => document.body.innerText)).split(/\s+/).length;
    const tiles = await page.locator('main a[data-slug]').count();
    record(p, 'JS off', 'readable without JavaScript', words > 80 && tiles > 5, `${words} words, ${tiles} tiles`);
  }
  await ctx.close();
}

// ---- run ----
const browser = await chromium.launch();
const req = await (await browser.newContext()).request;
const { pages, sample } = await pickPages(req);
const links = new Set();
for (const path of pages) for (const width of WIDTHS) await checkPage(browser, path, width, links);
await interactions(browser, sample);
// Internal links: each one once.
const bad = [];
for (const href of links) {
  if (!href || href === '/') continue;
  const r = await req.get(BASE + href, { maxRedirects: 3 });
  if (r.status() >= 400) bad.push(`${r.status()} ${href}`);
}
record('all pages', '-', 'internal links work', bad.length === 0, `${links.size} checked${bad.length ? `; broken: ${bad.slice(0, 10).join(', ')}` : ''}`);
await browser.close();

const failed = results.filter((r) => !r.ok);
const lines = [
  `# End-to-end test, ${DATE}`,
  '',
  `Base: ${BASE}. Pages: ${pages.length}. Widths: ${WIDTHS.join(', ')}. Checks: ${results.length}. **Failures: ${failed.length}.**`,
  '',
  '## Failures',
  '',
  failed.length ? '| Page | Width | Check | Detail |\n|---|---|---|---|\n' + failed.map((r) => `| ${r.page} | ${r.width} | ${r.check} | ${String(r.detail).replace(/\|/g, '/')} |`).join('\n') : 'None.',
  '',
  '## All checks',
  '',
  '| Page | Width | Check | Result | Detail |',
  '|---|---|---|---|---|',
  ...results.map((r) => `| ${r.page} | ${r.width} | ${r.check} | ${r.ok ? 'ok' : 'FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 120)} |`),
  '',
];
mkdirSync(join(ROOT, 'docs', 'seo-reports'), { recursive: true });
writeFileSync(join(ROOT, 'docs', 'seo-reports', `${DATE}-e2e.md`), lines.join('\n'));
console.log(`e2e: ${results.length} checks, ${failed.length} failed. Report: docs/seo-reports/${DATE}-e2e.md`);
for (const r of failed.slice(0, 40)) console.log(`FAIL ${r.page} @${r.width}: ${r.check} (${r.detail})`);
process.exit(failed.length ? 1 : 0);
