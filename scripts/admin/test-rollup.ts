// T10.4: a fixed, seeded test day produces exactly the expected rollup numbers (docs/ADMIN.md §4).
import { runRollup } from '../../functions/api/_lib/rollup';
import { finish, same } from '../test-kit';
import { openDb } from './d1-shim';

const D = '2026-11-10';
const D1 = '2026-11-11';
const NOW = Date.parse(`${D1}T12:00:00Z`);
const db = openDb();
const raw = db.raw;

const S = raw.prepare(
  `INSERT INTO sessions (sid, vid, day, start_ts, end_ts, engaged_s, pages, plays, country, device, lang, ref_domain, utm_campaign, is_new)
   VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
);
S.run('s1', 'v1', D, 100, 3, 2, 'IN', 'mobile', 'en', 'google.com', 1);
S.run('s2', 'v2', D, 20, 1, 0, 'US', 'desktop', 'en', null, 1);
S.run('s3', 'v1', D, 50, 2, 1, 'IN', 'mobile', 'en', null, 0);
S.run('s4', 'v1', D1, 30, 1, 1, 'IN', 'mobile', 'en', null, 0);
S.run('s5', 'v3', D1, 10, 1, 0, 'IN', 'mobile', 'pl', null, 1);

const E = raw.prepare(
  `INSERT INTO events (ts, day, vid, sid, name, slug, list_id, value_num, value_text, ref_domain, utm_source, country, device, lang)
   VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en')`,
);
const ev = (day: string, vid: string, sid: string, name: string, slug: string | null = null, list: string | null = null, num: number | null = null, text: string | null = null, ref: string | null = null, utm: string | null = null): void => {
  E.run(day, vid, sid, name, slug, list, num, text, ref, utm, vid === 'v2' ? 'US' : 'IN', vid === 'v2' ? 'desktop' : 'mobile');
};
ev(D, 'v1', 's1', 'page_view', null, null, null, 'xs', 'google.com', 'news');
ev(D, 'v1', 's1', 'tile_impression', 'a', 'mosaic', 5);
ev(D, 'v1', 's1', 'tile_impression', 'a', 'mosaic', 5);
ev(D, 'v1', 's1', 'tile_click', 'a', 'mosaic');
ev(D, 'v1', 's1', 'play_start', 'a');
ev(D, 'v1', 's1', 'play_30s', 'a');
ev(D, 'v1', 's1', 'play_end', 'a', null, 95);
ev(D, 'v1', 's1', 'favourite_add', 'a');
ev(D, 'v1', 's1', 'play_start', 'b');
ev(D, 'v1', 's1', 'play_end', 'b', null, 10);
ev(D, 'v1', 's1', 'game_error', 'b', null, null, 'report');
ev(D, 'v2', 's2', 'page_view');
ev(D, 'v2', 's2', 'search', null, null, 0, 'car');
ev(D, 'v2', 's2', 'search', null, null, 4, 'race');
ev(D, 'v2', 's2', 'search_click', 'c', 'search', null, 'race');
ev(D, 'v1', 's3', 'page_view');
ev(D, 'v1', 's3', 'tile_click', 'a', 'row:new');
ev(D, 'v1', 's3', 'play_start', 'a');
ev('2026-08-01', 'v9', 's9', 'page_view');
raw.prepare("INSERT INTO sessions (sid, vid, day, start_ts, end_ts) VALUES ('s9', 'v9', '2026-08-01', 0, 0)").run();

const q = (sql: string, ...args: unknown[]): Record<string, unknown>[] => raw.prepare(sql).all(...args);
const pick = (rows: Record<string, unknown>[], keys: string[]): unknown[][] => rows.map((r) => keys.map((k) => r[k]));

async function checkAll(label: string): Promise<void> {
  same(
    pick(q("SELECT * FROM daily_site WHERE day = ? AND country = '*' AND device = '*' AND lang = '*'", D), ['visitors', 'new_visitors', 'sessions', 'page_views', 'engaged_s', 'plays']),
    [[2, 2, 3, 6, 170, 3]],
    `${label}: site total`,
  );
  same(pick(q("SELECT * FROM daily_site WHERE day = ? AND country = 'IN' AND device = '*'", D), ['visitors', 'sessions', 'page_views', 'plays']), [[1, 2, 5, 3]], `${label}: site India`);
  same(pick(q("SELECT * FROM daily_site WHERE day = ? AND country = '*' AND device = 'desktop'", D), ['visitors', 'sessions']), [[1, 1]], `${label}: site desktop`);
  same(
    pick(q("SELECT * FROM daily_game WHERE day = ? AND lang = '*' ORDER BY slug", D), ['slug', 'impressions', 'clicks', 'plays', 'plays_30s', 'play_s', 'errors', 'favourites']),
    [
      ['a', 10, 2, 2, 1, 95, 0, 1],
      ['b', 0, 0, 1, 0, 10, 1, 0],
      ['c', 0, 1, 0, 0, 0, 0, 0],
    ],
    `${label}: games`,
  );
  same(pick(q('SELECT * FROM daily_list WHERE day = ? ORDER BY list_id', D), ['list_id', 'impressions', 'clicks']), [['mosaic', 10, 1], ['row:new', 0, 1], ['search', 0, 1]], `${label}: lists`);
  same(pick(q('SELECT * FROM daily_search WHERE day = ? ORDER BY query', D), ['query', 'count', 'zero_results', 'clicks']), [['car', 1, 1, 0], ['race', 1, 0, 1]], `${label}: search`);
  same(pick(q('SELECT * FROM daily_referrer WHERE day = ? ORDER BY ref_domain', D), ['ref_domain', 'utm_source', 'sessions', 'plays']), [['', '', 2, 1], ['google.com', 'news', 1, 2]], `${label}: referrers`);
}

await runRollup(db, 'nightly', NOW);
await checkAll('first run');
same(pick(q('SELECT * FROM retention ORDER BY cohort_day, day_n'), ['cohort_day', 'day_n', 'visitors']), [[D, 0, 2], [D, 1, 1], [D1, 0, 1]], 'retention cohorts');
same(q("SELECT COUNT(*) AS n FROM events WHERE day = '2026-08-01'")[0].n, 0, 'raw events older than 90 days deleted');
same(q("SELECT COUNT(*) AS n FROM sessions WHERE day = '2026-08-01'")[0].n, 0, 'old sessions deleted');
same(q("SELECT visitors FROM daily_site WHERE day = ? AND country = '*' AND device = '*' AND lang = '*'", D1)[0]?.visitors, 2, 'today rolled up too');

// Running again changes nothing (rebuild, not add).
await runRollup(db, 'nightly', NOW);
await checkAll('second run');
// Hourly run touches only today.
const r = await runRollup(db, 'hourly', NOW);
same(r.days, [D1], 'hourly = today only');
finish('test-rollup');
