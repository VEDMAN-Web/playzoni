/* global process, console, fetch */
// Admin end-to-end checks in a real browser (T10.16), against `npm run admin:dev` (local D1, demo seed, dev sign-in):
// 1. Sign-in gate: a second server WITHOUT the dev bypass must refuse every admin API call.
// 2. One edit flow: change a game title in the form and save (queued for GitHub, audit row written).
// 3. One instant control: move a game up in the hero list, save, and see the new order in /api/config.
// Run: NODE_PATH=$(npm root -g) node scripts/admin/e2e-admin.mjs [base] [gate-base]
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] ?? 'http://127.0.0.1:8788';
const gate = process.argv[3] ?? 'http://127.0.0.1:8790';
const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

// 1. Gate (server started with ENVIRONMENT=production and no Access settings).
try {
  const me = await fetch(`${gate}/api/admin/me`);
  check(me.status === 503 || me.status === 401, `gate: /api/admin/me answered ${me.status} without sign-in`);
  const post = await fetch(`${gate}/api/admin/game-flags`, { method: 'POST', headers: { 'content-type': 'application/json', origin: gate }, body: '{"slugs":["x"],"action":"hide"}' });
  check(post.status === 503 || post.status === 401, `gate: a write answered ${post.status} without sign-in`);
  const fake = await fetch(`${gate}/api/admin/me`, { headers: { 'cf-access-jwt-assertion': 'a.b.c' } });
  check(fake.status !== 200, 'gate: a fake token was accepted');
} catch (error) {
  failures.push(`gate: the second server at ${gate} is not running (${error.message})`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// 2. Edit flow.
const games = await (await fetch(`${base}/admin/data/games.json`)).json();
const slug = games[0].slug;
await page.goto(`${base}/admin/game?slug=${slug}`, { waitUntil: 'networkidle' });
const title = page.locator('form.adm-form input[type="text"]').first();
await title.fill(`${games[0].title} (edited)`);
await page.getByRole('button', { name: 'Save', exact: true }).click();
await page.waitForTimeout(1500);
const saved = await page.locator('.adm-status', { hasText: 'Saved' }).count();
check(saved > 0, 'edit: no "Saved" message after saving the game');
const audit = await (await fetch(`${base}/api/admin/audit?action=game.edit`)).json();
check(audit.rows.some((r) => r.target === slug && r.after?.includes('(edited)')), 'edit: no audit row with the new title');

// 3. Instant control: hero order.
await page.goto(`${base}/admin/home-layout`, { waitUntil: 'networkidle' });
const items = page.locator('ol.adm-sortable').first().locator('li');
if ((await items.count()) < 2) {
  await page.fill('#hl-find', games[1].title);
  await page.getByRole('button', { name: 'Add to hero' }).click();
  await page.fill('#hl-find', games[2].title);
  await page.getByRole('button', { name: 'Add to hero' }).click();
}
const firstBefore = await items.nth(0).locator('.adm-sort-label').textContent();
const second = await items.nth(1).locator('.adm-sort-label').textContent();
await items.nth(1).locator('[data-up]').click();
await page.getByRole('button', { name: 'Save layout' }).click();
await page.waitForTimeout(1200);
const layout = await (await fetch(`${base}/api/admin/home-layout?lang=*`)).json();
const titleOf = (s) => games.find((g) => g.slug === s)?.title;
check(titleOf(layout.hero[0]) === second && titleOf(layout.hero[1]) === firstBefore, `instant: hero order not saved (${layout.hero.slice(0, 2).join(', ')})`);
await browser.close();

if (failures.length) {
  for (const f of failures) console.log(`e2e-admin: FAIL: ${f}`);
  process.exitCode = 1;
} else {
  console.log('e2e-admin: ok (sign-in gate, game edit saved and audited, hero order saved)');
}
