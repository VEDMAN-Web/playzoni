// T10.3: /api/e checks events against the dictionary, drops bots, limits size, never stores the IP, and fills
// `events` + `sessions`.
import { collect, rateLimited } from '../../functions/api/_lib/collect';
import { checkBatch } from '../../functions/api/_lib/events';
import { isBot, parseUa } from '../../functions/api/_lib/ua';
import { expect, finish, same } from '../test-kit';
import { openDb } from './d1-shim';

const CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0';

same(parseUa(CHROME), { device: 'mobile', os: 'android', browser: 'chrome' }, 'android phone');
same(parseUa(IPAD), { device: 'tablet', os: 'ios', browser: 'safari' }, 'ipad');
same(parseUa(WIN), { device: 'desktop', os: 'windows', browser: 'edge' }, 'windows edge');
expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), 'googlebot is a bot');
expect(isBot('Mozilla/5.0 ... Chrome-Lighthouse'), 'lighthouse is a bot');
expect(isBot(CHROME, true), 'verified bot flag');
expect(isBot(CHROME, false, 5), 'low bot score');
expect(!isBot(CHROME), 'real chrome is not a bot');

const ctx = { country: 'IN', region: 'Gujarat', device: 'mobile', os: 'android', browser: 'chrome' };
const NOW = Date.UTC(2026, 10, 11, 12, 0, 0);
const vid = 'a'.repeat(24);
const sid = 'b'.repeat(24);
const good = {
  vid,
  sid,
  nw: 1,
  p: '/game/moto-x',
  lang: 'en',
  eng: 12,
  e: [
    { n: 'session_start', t: 1000 },
    { n: 'page_view', t: 1000, x: 'www.google.com|newsletter|email|launch|xs' },
    { n: 'tile_click', t: 2000, s: 'moto-x', l: 'row:popular-games', i: 3 },
    { n: 'play_start', t: 3000, s: 'moto-x' },
    { n: 'made_up_event', t: 3000 },
    { n: 'search', t: 3000, x: 'CAR Games', v: 12 },
    { n: 'tile_click', t: 3000, s: '../etc/passwd' },
  ],
};
const r = checkBatch(good, ctx, NOW);
expect(r.ok, 'good batch accepted');
if (r.ok) {
  same(r.rows.length, 6, 'unknown event dropped, the rest kept');
  same(r.dropped, 1, 'one dropped');
  const pv = r.rows.find((x) => x.name === 'page_view');
  same([pv?.ref_domain, pv?.utm_source, pv?.utm_campaign, pv?.value_text, pv?.page_type], ['google.com', 'newsletter', 'launch', 'xs', 'game'], 'page_view fields');
  same(r.rows.find((x) => x.name === 'search')?.value_text, 'car games', 'query lower-cased');
  same(r.rows.filter((x) => x.name === 'tile_click').map((x) => x.slug), ['moto-x', null], 'bad slug removed');
  same(Math.max(...r.rows.map((x) => x.ts)), NOW, 'newest event = server time');
  same(Math.min(...r.rows.map((x) => x.ts)), NOW - 2000, 'older events placed before');
  same([r.session.pages, r.session.plays, r.session.engaged_s, r.session.is_new], [1, 1, 12, 1], 'session counts');
  expect(!JSON.stringify(r).includes('ip'), 'no ip field anywhere');
}
same(checkBatch({ ...good, vid: 'x' }, ctx, NOW).ok, false, 'bad visitor id rejected');
same(checkBatch('[]', ctx, NOW).ok, false, 'non-object rejected');
const many = checkBatch({ ...good, e: Array.from({ length: 51 }, () => ({ n: 'scroll_depth', t: 1, v: 25 })) }, ctx, NOW);
same(many.ok ? 200 : many.status, 413, 'more than 50 events rejected');

// Through the endpoint with a real (SQLite) database.
const db = openDb();
const req = (body: string, ua = CHROME, cf: Record<string, unknown> = { country: 'IN', region: 'Gujarat', asn: 9829 }): Request => {
  const request = new Request('https://playzoni.com/api/e', { method: 'POST', body, headers: { 'user-agent': ua, 'cf-connecting-ip': '203.0.113.9' } });
  Object.defineProperty(request, 'cf', { value: cf });
  return request;
};
same((await collect(req(JSON.stringify(good)), db, NOW)).status, 202, 'stored with one dropped -> 202');
const second = { ...good, nw: 0, eng: 8, e: [{ n: 'page_view', t: 5, x: '|||||md' }, { n: 'play_start', t: 6, s: 'moto-x' }] };
same((await collect(req(JSON.stringify(second)), db, NOW + 5000)).status, 204, 'clean batch -> 204');
same((await collect(req(JSON.stringify(good), 'Googlebot/2.1 (+http://www.google.com/bot.html) compatible'), db, NOW)).status, 204, 'bot silently dropped');
same((await collect(req('not json'), db, NOW)).status, 400, 'not JSON -> 400');
same((await collect(req('x'.repeat(40000)), db, NOW)).status, 413, 'too large -> 413');

const events = await db.prepare('SELECT COUNT(*) AS n FROM events').first<{ n: number }>();
same(events?.n, 8, 'events stored (6 + 2, bot ignored)');
const s = await db.prepare('SELECT * FROM sessions').all();
same(s.results.length, 1, 'one session row');
const row = s.results[0];
same([row.pages, row.plays, row.engaged_s, row.ref_domain, row.utm_campaign, row.country, row.device, row.is_new], [2, 2, 20, 'google.com', 'launch', 'IN', 'mobile', 1], 'session upserted');
const cols = (await db.prepare('PRAGMA table_info(events)').all()).results.map((c) => String(c.name));
expect(!cols.some((c) => c.includes('ip')), 'events table has no IP column');
const dump = JSON.stringify((await db.prepare('SELECT * FROM events').all()).results);
expect(!dump.includes('203.0.113.9'), 'the IP is not stored');

// Rate limit.
let limited = false;
for (let i = 0; i < 601; i++) limited = rateLimited('XX:1', NOW);
expect(limited, 'rate limit after 600 a minute');
expect(!rateLimited('XX:1', NOW + 60000), 'resets next minute');
finish('test-collect');
