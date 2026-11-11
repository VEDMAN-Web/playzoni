// T10.1: the D1 migrations parse (applied to an empty SQLite database) and contain every table and column of
// docs/ADMIN.md §4, plus the three required event indexes.
import { finish, expect } from '../test-kit';
import { openDb } from './d1-shim';

// ADMIN §4 (start/end are named starts_at/ends_at because END is an SQL keyword).
const EXPECTED: Record<string, string[]> = {
  events: ['ts', 'day', 'vid', 'sid', 'name', 'path', 'page_type', 'lang', 'slug', 'list_id', 'position', 'country', 'region', 'device', 'os', 'browser', 'ref_domain', 'utm_source', 'utm_medium', 'utm_campaign', 'value_num', 'value_text'],
  sessions: ['sid', 'vid', 'day', 'start_ts', 'end_ts', 'engaged_s', 'pages', 'plays', 'country', 'device', 'lang', 'ref_domain', 'utm_campaign', 'is_new'],
  daily_site: ['day', 'country', 'device', 'lang', 'visitors', 'new_visitors', 'sessions', 'page_views', 'engaged_s', 'plays'],
  daily_game: ['day', 'slug', 'lang', 'impressions', 'clicks', 'plays', 'plays_30s', 'play_s', 'errors', 'favourites'],
  daily_list: ['day', 'list_id', 'impressions', 'clicks'],
  daily_search: ['day', 'query', 'count', 'zero_results', 'clicks'],
  daily_referrer: ['day', 'ref_domain', 'utm_source', 'utm_medium', 'utm_campaign', 'sessions', 'plays'],
  retention: ['cohort_day', 'day_n', 'visitors'],
  daily_ads: ['day', 'slot', 'country', 'device', 'requests', 'impressions', 'viewable', 'clicks', 'earnings'],
  settings: ['key', 'value', 'updated_by', 'updated_at'],
  home_layout: ['lang', 'item_type', 'ref', 'position', 'size', 'active'],
  banners: ['id', 'lang', 'text', 'link', 'image_r2_key', 'starts_at', 'ends_at', 'pages', 'active'],
  game_flags: ['slug', 'hidden', 'featured', 'hero_rank'],
  experiments: ['id', 'name', 'variants', 'traffic', 'status', 'starts_at', 'ends_at'],
  team: ['email', 'role', 'added_by'],
  audit_log: ['ts', 'email', 'action', 'target', 'before', 'after'],
  outbox: ['ts', 'email', 'kind', 'path', 'payload', 'status'],
  push_messages: ['title', 'body', 'slug', 'image', 'scheduled_at', 'status'],
};

const INDEXES: [string, string[]][] = [
  ['events', ['day', 'name']],
  ['events', ['day', 'slug']],
  ['events', ['sid']],
];

let db;
try {
  db = openDb();
} catch (error) {
  console.error(`test-migrations: FAIL: migrations do not apply: ${(error as Error).message}`);
  process.exit(1);
}
const raw = db.raw;
for (const [table, columns] of Object.entries(EXPECTED)) {
  const have = raw.prepare(`PRAGMA table_info(${table})`).all().map((r) => String(r.name));
  expect(have.length > 0, `table ${table} is missing`);
  for (const c of columns) expect(have.includes(c), `table ${table} has no column ${c}`);
}
for (const [table, cols] of INDEXES) {
  const indexes = raw.prepare(`PRAGMA index_list(${table})`).all().map((r) => String(r.name));
  const found = indexes.some((name) => {
    const ic = raw.prepare(`PRAGMA index_info(${name})`).all().map((r) => String(r.name));
    return JSON.stringify(ic) === JSON.stringify(cols);
  });
  expect(found, `index on ${table} (${cols.join(', ')}) is missing`);
}
// Applying twice must be safe (IF NOT EXISTS everywhere).
try {
  raw.exec((await import('./d1-shim')).migrationSql());
} catch (error) {
  expect(false, `migrations are not repeatable: ${(error as Error).message}`);
}
finish('test-migrations');
