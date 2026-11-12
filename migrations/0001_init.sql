-- Playzoni admin database (Cloudflare D1 / SQLite). docs/ADMIN.md §4.
-- Apply once in the Cloudflare dashboard (D1 -> playzoni -> Console) or with `wrangler d1 migrations apply DB`.
-- Anonymous data only: no IP address, no name, no email of visitors. Emails appear only for the admin team.

-- ---------- Raw data (kept 90 days, then deleted by the rollup job) ----------
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,            -- unix milliseconds (server clock)
  day TEXT NOT NULL,              -- YYYY-MM-DD (UTC)
  vid TEXT NOT NULL,              -- random first-party visitor id (pz_vid)
  sid TEXT NOT NULL,              -- session id (new after 30 min idle)
  name TEXT NOT NULL,             -- event name from the dictionary (ADMIN §3)
  path TEXT,
  page_type TEXT,
  lang TEXT,
  slug TEXT,
  list_id TEXT,
  position INTEGER,
  country TEXT,
  region TEXT,
  device TEXT,
  os TEXT,
  browser TEXT,
  ref_domain TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  value_num REAL,
  value_text TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_day_name ON events (day, name);
CREATE INDEX IF NOT EXISTS idx_events_day_slug ON events (day, slug);
CREATE INDEX IF NOT EXISTS idx_events_sid ON events (sid);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);

CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  vid TEXT NOT NULL,
  day TEXT NOT NULL,
  start_ts INTEGER NOT NULL,
  end_ts INTEGER NOT NULL,
  engaged_s INTEGER NOT NULL DEFAULT 0,
  pages INTEGER NOT NULL DEFAULT 0,
  plays INTEGER NOT NULL DEFAULT 0,
  country TEXT,
  device TEXT,
  lang TEXT,
  ref_domain TEXT,
  utm_campaign TEXT,
  is_new INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_day ON sessions (day);
CREATE INDEX IF NOT EXISTS idx_sessions_vid ON sessions (vid);

-- ---------- Daily rollups (kept forever). '*' in a breakdown column = all values together ----------
CREATE TABLE IF NOT EXISTS daily_site (
  day TEXT NOT NULL,
  country TEXT NOT NULL,
  device TEXT NOT NULL,
  lang TEXT NOT NULL,
  visitors INTEGER NOT NULL DEFAULT 0,
  new_visitors INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0,
  engaged_s INTEGER NOT NULL DEFAULT 0,
  plays INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, country, device, lang)
);

CREATE TABLE IF NOT EXISTS daily_game (
  day TEXT NOT NULL,
  slug TEXT NOT NULL,
  lang TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  plays INTEGER NOT NULL DEFAULT 0,
  plays_30s INTEGER NOT NULL DEFAULT 0,
  play_s INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  favourites INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, slug, lang)
);

CREATE TABLE IF NOT EXISTS daily_list (
  day TEXT NOT NULL,
  list_id TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, list_id)
);

CREATE TABLE IF NOT EXISTS daily_search (
  day TEXT NOT NULL,
  query TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  zero_results INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, query)
);

CREATE TABLE IF NOT EXISTS daily_referrer (
  day TEXT NOT NULL,
  ref_domain TEXT NOT NULL,
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 0,
  plays INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, ref_domain, utm_source, utm_medium, utm_campaign)
);

CREATE TABLE IF NOT EXISTS retention (
  cohort_day TEXT NOT NULL,       -- first day the visitor was seen
  day_n INTEGER NOT NULL,         -- 0 = cohort day, 1 = next day, ...
  visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (cohort_day, day_n)
);

CREATE TABLE IF NOT EXISTS daily_ads (
  day TEXT NOT NULL,
  slot TEXT NOT NULL,
  country TEXT NOT NULL,
  device TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  viewable INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  earnings REAL,                  -- only from the AdSense API; NULL until connected
  PRIMARY KEY (day, slot, country, device)
);

-- ---------- Control tables (instant settings, team, audit) ----------
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,            -- JSON
  updated_by TEXT,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS home_layout (
  lang TEXT NOT NULL,
  item_type TEXT NOT NULL,        -- hero | row | category
  ref TEXT NOT NULL,              -- game slug, row id or category slug
  position INTEGER NOT NULL,
  size TEXT,                      -- S | L | XL (hero tiles)
  active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (lang, item_type, ref)
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY,
  lang TEXT NOT NULL DEFAULT '*',
  text TEXT NOT NULL,
  link TEXT,
  image_r2_key TEXT,
  starts_at TEXT,                 -- YYYY-MM-DD (ADMIN §4 "start")
  ends_at TEXT,                   -- YYYY-MM-DD (ADMIN §4 "end")
  pages TEXT NOT NULL DEFAULT '*',-- * | home | game | category, comma separated
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS game_flags (
  slug TEXT PRIMARY KEY,
  hidden INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  hero_rank INTEGER
);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  variants TEXT NOT NULL,         -- JSON array of variant names
  traffic INTEGER NOT NULL,       -- percent of visitors in the test
  status TEXT NOT NULL,           -- draft | running | stopped
  starts_at TEXT,
  ends_at TEXT
);

CREATE TABLE IF NOT EXISTS team (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL,             -- owner | editor | analyst
  added_by TEXT,
  added_at INTEGER
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,
  email TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  before TEXT,                    -- JSON
  after TEXT                      -- JSON
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log (ts);

-- ---------- Extra tables (not in ADMIN §4; see ADMIN §2 deviations) ----------
-- Content changes waiting for the GitHub App (written when no GitHub token is set; committed later).
CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,
  email TEXT NOT NULL,
  kind TEXT NOT NULL,             -- game | category | synonym
  path TEXT NOT NULL,             -- data/admin-outbox/<timestamp>.json
  payload TEXT NOT NULL,          -- JSON
  status TEXT NOT NULL DEFAULT 'pending', -- pending | committed | failed
  commit_sha TEXT,
  error TEXT
);

-- Push alerts composed in the admin (sent through OneSignal once the keys exist). Hard limit: 2 per 7 days.
CREATE TABLE IF NOT EXISTS push_messages (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  slug TEXT,
  image TEXT,
  scheduled_at INTEGER NOT NULL,  -- unix milliseconds
  status TEXT NOT NULL,           -- scheduled | sent | cancelled | failed
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
