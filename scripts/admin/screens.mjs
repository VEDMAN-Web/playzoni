/* global process, console, document, getComputedStyle, fetch */
// Screenshots of every admin screen at 390 and 1440 wide (T10.16), plus layout checks: no sideways scroll at 390,
// nothing wider than the screen, tap targets at least 44px. Runs against `npm run admin:dev` (wrangler pages dev with
// the local D1 and the demo seed). Run: NODE_PATH=$(npm root -g) node scripts/admin/screens.mjs [base] [only-screen]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

// Playwright is installed globally (not a project dependency).
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] ?? 'http://127.0.0.1:8788';
const only = process.argv[3];
const OUT = 'docs/screens/T10';
mkdirSync(OUT, { recursive: true });

export const SCREENS = [
  ['dashboard', '/admin'],
  ['realtime', '/admin/realtime'],
  ['games', '/admin/games'],
  ['game-detail', '/admin/game?slug=__FIRST__'],
  ['categories', '/admin/categories'],
  ['home-layout', '/admin/home-layout'],
  ['search', '/admin/search'],
  ['acquisition', '/admin/acquisition'],
  ['engagement', '/admin/engagement'],
  ['content', '/admin/content'],
  ['ads', '/admin/ads'],
  ['push', '/admin/push'],
  ['experiments', '/admin/experiments'],
  ['banners', '/admin/banners'],
  ['settings', '/admin/settings'],
  ['team', '/admin/team'],
  ['audit', '/admin/audit'],
];

const browser = await chromium.launch();
const problems = [];
let firstSlug = 'sample-game-01';
try {
  const r = await fetch(`${base}/admin/data/games.json`);
  if (r.ok) firstSlug = (await r.json())[0]?.slug ?? firstSlug;
} catch {
  // keep default
}
for (const width of [390, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`${width}: page error: ${e.message}`));
  for (const [name, path] of SCREENS) {
    if (only && only !== name) continue;
    await page.goto(base + path.replace('__FIRST__', firstSlug) + (path.includes('?') ? '&' : '?') + 'range=28', { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const report = await page.evaluate((w) => {
      const out = [];
      if (document.documentElement.scrollWidth > w + 1) out.push(`page is ${document.documentElement.scrollWidth}px wide`);
      for (const node of document.querySelectorAll('.adm-main *, .adm-top *')) {
        const r = node.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const scroller = node.closest('.adm-chart, .adm-table-wrap, .adm-controls, .adm-side');
        if (!scroller && r.right > w + 1) out.push(`cut off: ${node.tagName.toLowerCase()}.${node.className} right=${Math.round(r.right)}`);
        const tag = node.tagName.toLowerCase();
        const tappable = tag === 'button' || (tag === 'a' && !node.closest('td, .adm-bar-label, .adm-intro, .adm-card-note, .adm-empty, p')) || tag === 'select' || (tag === 'input' && node.type !== 'checkbox' && node.type !== 'radio');
        if (tappable && getComputedStyle(node).visibility !== 'hidden' && (r.height < 44 || r.width < 44) && !node.closest('.adm-chart')) {
          out.push(`small tap target: ${tag} "${(node.textContent || node.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      return [...new Set(out)].slice(0, 8);
    }, width);
    for (const p of report) problems.push(`${name} @${width}: ${p}`);
    await page.screenshot({ path: `${OUT}/${name}-${width}.jpg`, type: 'jpeg', quality: 70, fullPage: true });
  }
  await context.close();
}
await browser.close();
if (problems.length) {
  for (const p of problems) console.log(`screens: ${p}`);
  process.exitCode = 1;
} else {
  console.log(`screens: ok (${only ? 1 : SCREENS.length} screens x 2 widths in ${OUT})`);
}
