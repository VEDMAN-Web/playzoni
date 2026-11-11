/* global process, console, document, Event */
// Manual end-to-end check of the tracking script against `wrangler pages dev` (T10.2/T10.3).
// Build with PUBLIC_TRACKING_ENABLED=true first, start: npx wrangler pages dev dist --d1 DB=00000000-0000-0000-0000-000000000000
// Run: NODE_PATH=$(npm root -g) node scripts/admin/e2e-track.mjs [base url]
import { createRequire } from 'node:module';

// Playwright is installed globally (not a project dependency): run with NODE_PATH=$(npm root -g).
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:8788';
const browser = await chromium.launch();
// A normal desktop Chrome user agent: the endpoint drops "HeadlessChrome" as a bot.
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
});
const page = await context.newPage();
const posts = [];
page.on('request', (r) => {
  if (r.url().endsWith('/api/e')) posts.push(JSON.parse(r.postData() ?? '{}'));
});
await page.goto(base + '/');
await page.waitForTimeout(1500);
await page.mouse.wheel(0, 3000);
await page.waitForTimeout(1200);
const tile = page.locator('main a[data-slug]').first();
const slug = await tile.getAttribute('data-slug');
await tile.click();
await page.waitForLoadState('load');
await page.waitForTimeout(2500);
await page.locator('[data-fav]').first().click();
await page.waitForTimeout(11000);
await page.goto(base + '/about');
await page.waitForTimeout(11000);
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await browser.close();
console.log(JSON.stringify({ slug, requestsSeen: posts.length }));
console.log('Now read the events from the local D1 (they are written by /api/e).');
