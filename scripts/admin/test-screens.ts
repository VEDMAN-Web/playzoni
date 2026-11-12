// T10.6, T10.10, T10.16: screen numbers match direct SQL on seeded data, empty data gives null (never 0), channel
// rules, percentiles, CSV export and number formats.
import { channelOf, engineOf } from '../../functions/api/_lib/channels';
import { readRange } from '../../functions/api/_lib/query';
import { runRollup } from '../../functions/api/_lib/rollup';
import type { Kpi, Screen } from '../../functions/api/_lib/screen';
import { buildAcquisition } from '../../functions/api/_lib/screens/acquisition';
import { buildDashboard } from '../../functions/api/_lib/screens/dashboard';
import { buildEngagement, p75 } from '../../functions/api/_lib/screens/engagement';
import { buildGame } from '../../functions/api/_lib/screens/game';
import { buildRealtime } from '../../functions/api/_lib/screens/realtime';
import { buildSearch } from '../../functions/api/_lib/screens/search';
import { addDays, dayOf } from '../../functions/api/_lib/validate';
import { delta, fmt, toCsv } from '../../src/admin/format';
import { expect, finish, same } from '../test-kit';
import { openDb } from './d1-shim';

const user = { email: 'a@example.com', role: 'analyst' as const };
const now = Date.now();
const today = dayOf(now);
const D = addDays(today, -1);
const url = (q: string): URL => new URL(`https://playzoni.com/api/admin/x?${q}`);
const kpi = (s: Omit<Screen, 'demo'>, id: string): Kpi | undefined => s.kpis?.find((k) => k.id === id);

// Empty database: every KPI is null, every table empty, charts have no numbers.
const empty = openDb();
const r0 = readRange(url(`from=${D}&to=${today}`));
for (const build of [buildDashboard, buildRealtime, buildSearch, buildAcquisition, buildEngagement]) {
  const s = await build(empty, r0, url(''), user);
  for (const k of s.kpis ?? []) same(k.value, null, `${build.name}: ${k.id} is null without data`);
  for (const t of s.tables ?? []) same(t.rows.length, 0, `${build.name}: ${t.id} is empty without data`);
  for (const c of s.charts ?? []) expect(c.series.every((x) => x.values.every((v) => v === null || v === 0)), `${build.name}: ${c.id} has no invented numbers`);
}

// Seeded data.
const db = openDb();
const raw = db.raw;
const S = raw.prepare(
  `INSERT INTO sessions (sid, vid, day, start_ts, end_ts, engaged_s, pages, plays, country, device, lang, ref_domain, utm_campaign, is_new) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en', ?, NULL, ?)`,
);
const E = raw.prepare(
  `INSERT INTO events (ts, day, vid, sid, name, path, page_type, slug, list_id, value_num, value_text, ref_domain, utm_source, utm_medium, country, device, lang) VALUES (?, ?, ?, ?, ?, '/', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en')`,
);
const t0 = Date.parse(`${D}T10:00:00Z`);
S.run('s1', 'v1', D, t0, t0, 120, 3, 2, 'IN', 'mobile', 'google.com', 1);
S.run('s2', 'v2', D, t0, t0, 60, 1, 0, 'US', 'desktop', 'chatgpt.com', 1);
S.run('s3', 'v1', today, now - 60000, now, 30, 1, 1, 'IN', 'mobile', null, 0);
const ev = (ts: number, day: string, vid: string, sid: string, name: string, pt: string, slug: string | null, list: string | null, num: number | null, text: string | null, ref: string | null = null, src: string | null = null, med: string | null = null): void => {
  E.run(ts, day, vid, sid, name, pt, slug, list, num, text, ref, src, med, vid === 'v2' ? 'US' : 'IN', vid === 'v2' ? 'desktop' : 'mobile');
};
ev(t0, D, 'v1', 's1', 'page_view', 'home', null, null, null, 'xs', 'google.com');
ev(t0, D, 'v1', 's1', 'tile_click', 'home', 'g1', 'mosaic', null, null);
ev(t0, D, 'v1', 's1', 'play_start', 'game', 'g1', null, null, null);
ev(t0, D, 'v1', 's1', 'play_30s', 'game', 'g1', null, null, null);
ev(t0, D, 'v1', 's1', 'play_end', 'game', 'g1', null, 300, null);
ev(t0, D, 'v1', 's1', 'play_start', 'game', 'g2', null, null, null);
ev(t0, D, 'v1', 's1', 'web_vitals', 'game', null, null, 2000, '2000,100,0.010');
ev(t0, D, 'v2', 's2', 'page_view', 'home', null, null, null, 'lg', 'chatgpt.com');
ev(t0, D, 'v2', 's2', 'search', 'home', null, null, 0, 'minecraft');
ev(t0, D, 'v2', 's2', 'search', 'home', null, null, 5, 'car');
ev(t0, D, 'v2', 's2', 'search_click', 'home', 'g3', 'search', null, 'car');
ev(now - 60000, today, 'v1', 's3', 'page_view', 'home', null, null, null, 'xs');
ev(now - 30000, today, 'v1', 's3', 'play_start', 'game', 'g1', null, null, null);
await runRollup(db, 'nightly', now);

const r = readRange(url(`from=${D}&to=${today}`));
const dash = await buildDashboard(db, r, url(''), user);
const q1 = (sql: string, ...a: unknown[]): number => Number(Object.values(raw.prepare(sql).get(...a) ?? {})[0]);
same(kpi(dash, 'visitors')?.value, q1('SELECT COUNT(DISTINCT vid) FROM sessions WHERE day BETWEEN ? AND ?', D, today), 'dashboard visitors = SQL');
same(kpi(dash, 'sessions')?.value, q1('SELECT COUNT(*) FROM sessions WHERE day BETWEEN ? AND ?', D, today), 'dashboard sessions = SQL');
same(kpi(dash, 'plays')?.value, q1('SELECT SUM(plays) FROM sessions WHERE day BETWEEN ? AND ?', D, today), 'dashboard plays = SQL');
same(kpi(dash, 'engaged')?.value, q1('SELECT AVG(engaged_s) FROM sessions WHERE day BETWEEN ? AND ?', D, today), 'dashboard engaged time = SQL');
same(kpi(dash, 'ppv')?.value, 3 / 2, 'plays per visitor');
same(kpi(dash, 'now')?.value, 1, 'visitors in the last 5 minutes');
same(kpi(dash, 'today')?.value, 1, "today's visitors");
same(kpi(dash, 'd1')?.value, q1('SELECT 1.0 * SUM(CASE WHEN day_n = 1 THEN visitors END) / SUM(CASE WHEN day_n = 0 THEN visitors END) FROM retention WHERE cohort_day = ?', D), 'day 1 return = retention table');
same(kpi(dash, 'revenue')?.value, null, 'no revenue without AdSense');
same(dash.tables?.find((t) => t.id === 'top-games')?.rows.map((x) => [x.slug, x.plays]), [['g1', 2], ['g2', 1]], 'top games by plays');
const filtered = await buildDashboard(db, readRange(url(`from=${D}&to=${today}&country=US`)), url(''), user);
same([kpi(filtered, 'visitors')?.value, kpi(filtered, 'plays')?.value], [1, 0], 'country filter');

const rt = await buildRealtime(db, r, url(''), user);
same([kpi(rt, 'active5')?.value, kpi(rt, 'plays')?.value], [1, 1], 'realtime');

const search = await buildSearch(db, r, url(''), user);
same([kpi(search, 'searches')?.value, kpi(search, 'zero')?.value], [2, 0.5], 'search KPIs');
same(search.tables?.find((t) => t.id === 'zero-results')?.rows.map((x) => x.query), ['minecraft'], 'zero-result queries');
same(search.tables?.find((t) => t.id === 'query-game')?.rows.map((x) => [x.query, x.slug]), [['car', 'g3']], 'query to clicked game');

const acq = await buildAcquisition(db, r, url(''), user);
same(acq.tables?.find((t) => t.id === 'ai')?.rows.map((x) => [x.ref, x.sessions]), [['chatgpt.com', 1]], 'AI referrers');
same(acq.tables?.find((t) => t.id === 'engines')?.rows.map((x) => x.engine), ['google'], 'search engines');

const eng = await buildEngagement(db, r, url(''), user);
same(eng.tables?.find((t) => t.id === 'funnel')?.rows.map((x) => x.visitors), [2, 2, 1, 1, 1], 'funnel: visit, click, play, 30 s, came back');
same(eng.tables?.find((t) => t.id === 'vitals')?.rows.map((x) => [x.page_type, x.lcp, x.inp, x.cls]), [['game', 2000, 100, 0.01]], 'web vitals');

const game = await buildGame(db, r, url('slug=g1'), user);
same([kpi(game, 'plays')?.value, kpi(game, 'p30')?.value, kpi(game, 'avg')?.value], [2, 0.5, 150], 'game detail');
same(kpi(await buildGame(db, r, url('slug=nothing'), user), 'plays')?.value, null, 'unknown game has no numbers');

// Channels.
same(['google.co.in', 'bing.com', 'yandex.ru', 'ya.ru', 'duckduckgo.com'].map((d) => channelOf(d)), ['search', 'search', 'search', 'search', 'search'], 'search engines');
same(['chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'copilot.microsoft.com'].map((d) => channelOf(d)), ['ai', 'ai', 'ai', 'ai'], 'AI assistants');
same([channelOf(''), channelOf('reddit.com'), channelOf('example.org'), channelOf('', 'email')], ['direct', 'social', 'referral', 'campaign'], 'other channels');
same([engineOf('www.google.com'), engineOf('ya.ru'), engineOf('yandex.com.tr')], ['google', 'yandex', 'yandex'], 'engine names');
same([p75([]), p75([1, 2, 3, 4]), p75([5])], [null, 3, 5], 'p75');

// CSV and formats.
same(toCsv([{ key: 'a', label: 'Name' }, { key: 'b', label: 'Plays' }], [{ a: 'Hi, "you"', b: 3 }, { a: '=cmd()', b: null }]), 'Name,Plays\r\n"Hi, ""you""",3\r\n\'=cmd(),\r\n', 'CSV escaping and formula guard');
same([fmt(null, 'int'), fmt(0.1234, 'pct'), fmt(125, 'sec'), fmt(12345, 'int'), fmt(1.5, 'money')], ['n/a', '12.34%', '2m 5s', '12,345', '$1.50'], 'formats');
same(delta(110, 100)?.text, '+10% vs previous', 'delta');
same(delta(5, null), null, 'no delta without previous');
expect(!/[–—]/.test(`${fmt(null)}${delta(1, 2)?.text}`), 'no long dashes');
finish('test-screens');
