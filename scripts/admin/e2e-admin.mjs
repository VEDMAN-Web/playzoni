/* global process, console, fetch */
// Admin end-to-end checks in a real browser (T10.16), against `npm run admin:dev` (local D1, demo seed, dev sign-in):
// 1. Sign-in gate: a second server WITHOUT the dev bypass must refuse every admin API call.
// 2. One edit flow: change a game title in the form and save (queued for GitHub, audit row written).
// 3. One instant control: pin a game to slot 14 of the home feed and save (T10.17).
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

// 3. Instant control: pin a game to a slot of the home feed (T10.17).
await page.goto(`${base}/admin/home-layout`, { waitUntil: 'networkidle' });
await page.waitForSelector('.adm-feed-tile');
const slots = await (await fetch(`${base}/home-slots.json`)).json();
const pinGame = games.find((g) => g.status === 'published' && !g.sample && !slots.some((s) => s.slug === g.slug));
await page.locator('.adm-feed-tile').nth(13).click();
await page.fill('.adm-feed-side input[type="search"]', pinGame.title);
await page.locator('.adm-feed-hit', { hasText: pinGame.title }).first().getByRole('button', { name: 'Put in slot 14' }).click();
await page.getByRole('button', { name: 'Save home feed' }).click();
await page.waitForTimeout(1200);
const layout = await (await fetch(`${base}/api/admin/home-layout?lang=*`)).json();
check(layout.slots.some((p) => p.i === 13 && p.slug === pinGame.slug), `instant: the pin on slot 14 was not saved (${JSON.stringify(layout.slots)})`);
await browser.close();

if (failures.length) {
  for (const f of failures) console.log(`e2e-admin: FAIL: ${f}`);
  process.exitCode = 1;
} else {
  console.log('e2e-admin: ok (sign-in gate, game edit saved and audited, home feed pin saved)');
}
