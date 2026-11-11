// Demo mode (LOCAL ONLY): fills the local D1 database used by `npm run admin:dev` with clearly fake sample visits, so
// every admin screen can be seen and screenshotted. It also sets settings.demo = true, which shows the yellow banner
// "Sample data, not real visitors" on every admin screen. It can never touch the real database: it only opens the
// SQLite file that wrangler keeps in .wrangler/ on this computer. `--clear` removes the sample data and the banner.
//
// Steps: npm run build, npm run admin:db, npm run admin:seed, npm run admin:dev (stop admin:dev while seeding).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runRollup } from '../../functions/api/_lib/rollup';
import { addDays, dayOf } from '../../functions/api/_lib/validate';
import { parseFrontmatter } from '../validate/frontmatter';
import { D1Shim, openDb } from './d1-shim';

const ROOT = join(import.meta.dirname, '..', '..');
const DIR = join(ROOT, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
const file = existsSync(DIR) ? readdirSync(DIR).find((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite') : undefined;
if (!file) {
  console.error('seed-demo: no local D1 database found. Run `npm run admin:db` first.');
  process.exit(1);
}
const db: D1Shim = openDb(join(DIR, file), false);
const raw = db.raw;

const DATA_TABLES = ['events', 'sessions', 'daily_site', 'daily_game', 'daily_list', 'daily_search', 'daily_referrer', 'retention', 'daily_ads'];
for (const t of DATA_TABLES) raw.exec(`DELETE FROM ${t}`);
if (process.argv.includes('--clear')) {
  raw.exec("DELETE FROM settings WHERE key = 'demo'");
  raw.exec("DELETE FROM team WHERE email LIKE '%@example.com'");
  console.log('seed-demo: sample data removed.');
  process.exit(0);
}

// Repeatable random numbers.
let seed = 20261111;
const rand = (): number => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T>(items: [T, number][]): T => {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = rand() * total;
  for (const [v, w] of items) if ((x -= w) <= 0) return v;
  return items[items.length - 1][0];
};
const hex = (n = 24): string => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join('');

// Games from the content folder (slug, popularity, categories).
const gamesDir = join(ROOT, 'src', 'content', 'games');
const games = readdirSync(gamesDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => parseFrontmatter(readFileSync(join(gamesDir, f), 'utf8')).data)
  .map((d) => ({ slug: String(d.slug), pop: Number(d.popularity) || 1, cats: (Array.isArray(d.categories) ? d.categories : []).map(String) }))
  .sort((a, b) => b.pop - a.pop)
  .slice(0, 120);
const gameWeights: [(typeof games)[number], number][] = games.map((g, i) => [g, 1 / (i + 3)]);

const COUNTRIES: [string, number][] = [['IN', 30], ['US', 14], ['BR', 9], ['ID', 7], ['PH', 6], ['GB', 5], ['DE', 4], ['PL', 4], ['TR', 4], ['MX', 4], ['RU', 3], ['FR', 3], ['VN', 3]];
const DEVICES: [string, number][] = [['mobile', 64], ['desktop', 29], ['tablet', 7]];
const REFS: [[string, string, string, string], number][] = [
  [['google.com', '', '', ''], 42],
  [['', '', '', ''], 28],
  [['bing.com', '', '', ''], 5],
  [['yandex.ru', '', '', ''], 2],
  [['chatgpt.com', '', '', ''], 3],
  [['perplexity.ai', '', '', ''], 1],
  [['gemini.google.com', '', '', ''], 1],
  [['copilot.microsoft.com', '', '', ''], 1],
  [['youtube.com', '', '', ''], 4],
  [['facebook.com', 'facebook', 'social', 'launch-week'], 5],
  [['', 'newsletter', 'email', 'new-games-nov'], 3],
  [['reddit.com', '', '', ''], 3],
];
const QUERIES: [string, number][] = [['car', 9], ['racing', 6], ['minecraft', 5], ['2 player', 6], ['obby', 5], ['puzzle', 4], ['subway surfers', 4], ['fnaf', 3], ['soccer', 3], ['geometry dash', 2], ['cooking', 2], ['moto x3m', 2], ['sonic', 2]];
const ZERO = new Set(['minecraft', 'subway surfers', 'fnaf', 'sonic', 'geometry dash']);
const LISTS: [string, number][] = [['mosaic', 50], ['row:popular-games', 15], ['row:new-games', 10], ['related', 18], ['recent', 7]];
const browserFor = (device: string): [string, string] => (device === 'desktop' ? pick([[['windows', 'chrome'], 60], [['macos', 'safari'], 15], [['windows', 'edge'], 15], [['linux', 'firefox'], 10]]) : pick([[['android', 'chrome'], 70], [['ios', 'safari'], 25], [['android', 'samsung'], 5]]));

const INSERT_E = raw.prepare(
  `INSERT INTO events (ts, day, vid, sid, name, path, page_type, lang, slug, list_id, position, country, region, device, os, browser, ref_domain, utm_source, utm_medium, utm_campaign, value_num, value_text)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const INSERT_S = raw.prepare(
  `INSERT INTO sessions (sid, vid, day, start_ts, end_ts, engaged_s, pages, plays, country, device, lang, ref_domain, utm_campaign, is_new)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);

interface Visitor {
  vid: string;
  country: string;
  device: string;
  os: string;
  browser: string;
  lang: string;
  seen: boolean;
}

const now = Date.now();
const today = dayOf(now);
const DAYS = 35;
const start = addDays(today, -(DAYS - 1));
let eventCount = 0;

function session(v: Visitor, day: string, startTs: number): void {
  const sid = hex();
  const [ref, us, um, uc] = pick(REFS);
  const pages = 1 + Math.floor(rand() * rand() * 7);
  let t = startTs;
  let plays = 0;
  let engaged = 0;
  const ev = (name: string, path: string, pt: string, extra: { slug?: string; list?: string; pos?: number; num?: number; text?: string; ref?: boolean } = {}): void => {
    INSERT_E.run(t, day, v.vid, sid, name, path, pt, v.lang, extra.slug ?? null, extra.list ?? null, extra.pos ?? null, v.country, v.device, v.os, v.browser, extra.ref ? ref || null : null, extra.ref ? us || null : null, extra.ref ? um || null : null, extra.ref ? uc || null : null, extra.num ?? null, extra.text ?? null);
    eventCount++;
    t += 1000 + Math.floor(rand() * 20000);
  };
  ev('session_start', '/', 'home');
  let path = rand() < 0.55 ? '/' : `/game/${pick(gameWeights).slug}`;
  for (let p = 0; p < pages; p++) {
    const pt = path === '/' ? 'home' : path.startsWith('/game/') ? 'game' : 'category';
    ev('page_view', path, pt, { ref: p === 0, text: v.device === 'desktop' ? 'md' : 'xs' });
    if (rand() < 0.2) for (let i = 0; i < 6; i++) ev('tile_impression', path, pt, { slug: pick(gameWeights).slug, list: pick(LISTS), pos: i + 1, num: 5 });
    for (const d of [25, 50, 75, 100]) if (rand() < 0.8 - d / 200) ev('scroll_depth', path, pt, { num: d });
    if (rand() < 0.1) ev('web_vitals', path, pt, { num: 1200 + Math.floor(rand() * 1800), text: `${1200 + Math.floor(rand() * 1800)},${80 + Math.floor(rand() * 200)},${(rand() * 0.08).toFixed(3)}` });
    if (pt === 'game') {
      const slug = path.slice(6);
      ev('play_start', path, pt, { slug });
      plays++;
      const secs = Math.floor(10 + rand() * rand() * 900);
      if (secs >= 30) ev('play_30s', path, pt, { slug });
      if (rand() < 0.06) ev('favourite_add', path, pt, { slug });
      if (rand() < 0.03) ev('share', path, pt, { slug });
      if (rand() < 0.08) ev('fullscreen', path, pt, { slug });
      if (rand() < 0.01) ev('game_error', path, pt, { slug, text: 'report' });
      t += secs * 1000;
      engaged += secs;
      ev('play_end', path, pt, { slug, num: secs, text: v.device === 'desktop' && rand() < 0.2 ? 'fs' : '' });
    }
    engaged += 10 + Math.floor(rand() * 60);
    if (rand() < 0.15) ev('row_more', path, pt, { list: pick([['row:popular-games', 3], ['row:new-games', 2]]), num: 1 + Math.floor(rand() * 3) });
    // Next page: a tile, a category or a search.
    const r = rand();
    if (r < 0.15) {
      const q = pick(QUERIES);
      ev('search', path, pt, { text: q, num: ZERO.has(q) ? 0 : 3 + Math.floor(rand() * 20) });
      if (rand() < 0.6) {
        const slug = pick(gameWeights).slug;
        ev('search_click', path, pt, { slug, text: q, list: ZERO.has(q) ? 'search-popular' : 'search', pos: 1 + Math.floor(rand() * 6) });
        path = `/game/${slug}`;
      }
    } else if (r < 0.28) {
      const cat = pick(gameWeights).cats[0] ?? 'action-games';
      ev('category_click', path, pt, { text: cat, list: pick([['tile', 3], ['chip', 2], ['nav', 2]]) });
      path = `/${cat}`;
    } else {
      const slug = pick(gameWeights).slug;
      ev('tile_click', path, pt, { slug, list: pick(LISTS), pos: 1 + Math.floor(rand() * 20) });
      path = `/game/${slug}`;
    }
  }
  ev('session_end', path, 'game', { num: engaged });
  INSERT_S.run(sid, v.vid, day, startTs, t, engaged, pages, plays, v.country, v.device, v.lang, ref || null, uc || null, v.seen ? 0 : 1);
  v.seen = true;
}

const visitors: Visitor[] = [];
raw.exec('BEGIN');
for (let d = 0; d < DAYS; d++) {
  const day = addDays(start, d);
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  const base = 60 + d * 4 + (weekday === 0 || weekday === 6 ? 35 : 0);
  const fresh = Math.round(base * (0.8 + rand() * 0.4));
  for (let i = 0; i < fresh; i++) {
    const country = pick(COUNTRIES);
    const device = pick(DEVICES);
    const [os, browser] = browserFor(device);
    visitors.push({ vid: hex(), country, device, os, browser, lang: country === 'PL' ? 'pl' : 'en', seen: false });
  }
  const dayStart = Date.parse(`${day}T00:00:00Z`);
  // Today's sessions end at least two hours ago, so only the few "right now" visitors below count as live.
  const dayEnd = day === today ? now - 2 * 3600000 : dayStart + 86400000;
  for (let i = 0; i < visitors.length; i++) {
    const v = visitors[i];
    // New visitors of the day always come; earlier visitors come back now and then.
    if (i < visitors.length - fresh && rand() > 0.07) continue;
    const ts = dayStart + Math.floor(rand() * Math.max(1, dayEnd - dayStart - 600000));
    session(v, day, ts);
  }
}
// A few visitors right now, for the Realtime screen.
for (let i = 0; i < 14; i++) session(visitors[Math.floor(rand() * visitors.length)], today, now - Math.floor(rand() * 25 * 60000));
raw.exec('COMMIT');

for (let d = 0; d < DAYS; d++) await runRollup(db, 'hourly', now, [addDays(start, d)]);
await runRollup(db, 'nightly', now, [today]);

const put = raw.prepare('INSERT INTO settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
put.run('demo', 'true', 'seed-demo', now);
raw.prepare("INSERT OR IGNORE INTO team (email, role, added_by, added_at) VALUES ('editor@example.com', 'editor', 'seed-demo', ?), ('analyst@example.com', 'analyst', 'seed-demo', ?)").run(now, now);
console.log(`seed-demo: ${visitors.length} sample visitors, ${eventCount} sample events over ${DAYS} days in the LOCAL database. Banner "Sample data" is on.`);
