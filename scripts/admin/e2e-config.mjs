/* global process, console, document, window, PerformanceObserver */
// Manual end-to-end check of the instant controls (T10.9) against `npm run admin:dev`, with the site built with
// PUBLIC_ADMIN_CONFIG_ENABLED=true and PUBLIC_INCLUDE_SAMPLES=true and a hero order / hidden game / banner saved in
// the admin. Prints which games the big tiles show, whether the hidden game is gone, the banner, and the layout shift.
// Run: NODE_PATH=$(npm root -g) node scripts/admin/e2e-config.mjs [base] [shot.jpg]
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] ?? 'http://127.0.0.1:8788';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// "off" as the 4th argument blocks /api/config, to measure the page's own layout shift for comparison.
if (process.argv[4] === 'off') await page.route('**/api/config', (route) => route.abort());
await page.addInitScript(() => {
  window.__cls = 0;
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
  }).observe({ type: 'layout-shift', buffered: true });
});
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const result = await page.evaluate(() => ({
  big: [...document.querySelectorAll('main a.tile-xl, main a.tile-l')].slice(0, 3).map((a) => a.dataset.slug),
  hiddenShown: [...document.querySelectorAll('a[data-slug]')].filter((a) => a.dataset.slug === 'sample-game-02').length,
  bar: document.querySelector('.pz-cfg')?.textContent ?? null,
  cls: window.__cls,
}));
if (process.argv[3]) await page.screenshot({ path: process.argv[3], type: 'jpeg', quality: 70 });
await browser.close();
console.log(JSON.stringify(result));
