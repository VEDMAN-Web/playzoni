# Playzoni — admin panel spec (v1, 11 Nov 2026)

Owner: "a pixel perfect admin panel that can control everything on the user website — from measuring clicks to users' spent time, everything; all types of data." Built in **Phase 10**, after the guest site launches (T5.6). Ads/data rules: docs/ADS-DATA.md. This spec is the single source for Phase 10.

## 1. Users and roles
| Role | Can |
|---|---|
| Owner | Everything, incl. team, ads, push, settings |
| Editor | Games, categories, home layout, banners, content; no team, no ads/push settings |
| Analyst | Read-only: all dashboards and exports |
Team members are listed by email; sign-in is Google through Cloudflare Access (§2), so we build **no password system**.

## 2. Architecture (decision)
- **Admin app** (changed 11 Nov 2026, planner decision, **deviation from the first plan**): the admin is part of the main site at **`playzoni.com/admin/`** (static Astro pages in `src/pages/admin/`, small vanilla TS islands, same tokens as the site), not a separate `admin.playzoni.com` project. Same origin as `/api/*`, one deploy. Admin pages are `noindex,nofollow`, left out of the sitemap and Pagefind, and `robots.txt` has `Disallow: /admin`. Admin JavaScript loads only on `/admin` pages (`npm run check` verifies no public page ships admin code). *First plan (replaced): a separate app at `admin.playzoni.com` in its own Pages project.*
- **Login**: **Cloudflare Access** in front of `playzoni.com/admin*` and `playzoni.com/api/admin/*` (Google login, allow-list of emails; free up to 50 users). Every admin API call verifies the Access JWT (`Cf-Access-Jwt-Assertion`) and reads the email → role from the `team` table.
- **Data**: Cloudflare **D1** (SQLite) for events, rollups, settings and audit log; **R2** for uploaded images (banners, thumbnails replaced by hand). Collection endpoint and admin API = **Pages Functions** in the main site project (`functions/api/…`) so they share the domain and deploy with the site.
- **Two kinds of control**:
  1. *Instant* (D1 + edge, no rebuild): home hero order, featured flags, row order/on-off per language, banners and notices, feature flags (hover previews, A/B tests), ad slot on/off, maintenance message, hide a broken game. The site reads them from `/api/config` (cached 60 s at the edge) and applies them in the browser; pages stay fully readable with JS off using the last built defaults.
  2. *Rebuild* (~1–3 min): game text, new games, categories, SEO text. The admin writes the change as a commit to `dev` via a GitHub App (token only as a Cloudflare secret), the build chat's checks run, Cloudflare builds the preview; promotion to `main` stays manual by the owner.
- Rejected: a separate Node/Mongo admin server (more to run and secure; MongoDB is only for accounts, Phase 7); a hosted CMS (cost, lock-in); building our own login (risk).
- New parts that need owner approval (Q24): chart library **uPlot** (MIT, ~45 KB, very fast) for admin charts only; Cloudflare Access; GitHub App. **Approved by the owner on 11 Nov 2026** (plus `wrangler` as a devDependency for local Functions/D1 tests only).
- Other build-time choices (11 Nov 2026): extra tables `outbox` (content changes waiting for the GitHub App; the admin shows "will be committed when GitHub is connected") and `push_messages` (composed alerts, 2-per-week limit); `start`/`end` columns are named `starts_at`/`ends_at` (END is an SQL keyword); `'*'` in a rollup breakdown column means "all".

## 3. Tracking ("all types of data")
Small script `src/lib/track.ts` (< 3 KB gzipped, loaded after `load`, never blocks, no layout change). Events are batched and sent with `navigator.sendBeacon('/api/e')` every 10 s and on page hide. **Anonymous only**: a random first-party ID in localStorage (`pz_vid`) + a session ID (new after 30 min idle). No IP stored (used in the function only for country and rate limiting), no fingerprinting, no names/emails. Honour "Do not measure me" (profile panel), Global Privacy Control, and consent where required (ADS-DATA §8). Bots filtered (Cloudflare bot score + UA list).

| Event | When | Properties |
|---|---|---|
| `page_view` | each page | path, page type, lang, referrer domain, utm_source/medium/campaign, device, OS, browser, screen bucket, country, region, new/returning |
| `session_start` / `session_end` | first event / page hide | engaged seconds (visible tab only), pages, plays |
| `tile_impression` | tile ≥50% visible 1 s (sampled 20%) | slug, list id (mosaic, row id, related, search), position |
| `tile_click` | click on a tile | slug, list id, position, page type |
| `category_click` | category tile/chip | category, source |
| `row_more` | endless row loads a batch | row id, batch number |
| `search` | 800 ms after typing stops / Enter | query (lowercased, max 60 chars), results count, zero-result flag |
| `search_click` | result clicked | query, slug, position, from popular fallback yes/no |
| `play_start` / `play_30s` / `play_end` | Play pressed / 30 s visible play / leave or close | slug, active seconds, fullscreen yes/no, device |
| `game_error` | iframe fails / report button | slug, kind |
| `favourite_add` / `favourite_remove`, `share`, `fullscreen` | user actions | slug |
| `profile_open`, `pwa_prompt`, `pwa_install`, `push_prompt`, `push_subscribe` | user actions | — |
| `lang_suggest_shown` / `lang_switch` | language bar | from, to |
| `ad_request` / `ad_impression` / `ad_viewable` / `ad_click` | ads (Phase 11) | slot id, network, personalised flag |
| `scroll_depth` | 25/50/75/100% per page | page type |
| `web_vitals` | sampled 10% | LCP, INP, CLS, page type |
`/api/e` validates every event against this list (unknown events dropped), max 50 events per request, rate limit per country+ASN.

**Retention**: raw events 90 days; daily rollups kept forever. **Phase 9 overlap**: this replaces T9.3's separate counter — build T10.2/T10.3 and mark T9.3 done-by-T10.

## 4. D1 schema (main tables)
- `events` (ts, day, vid, sid, name, path, page_type, lang, slug, list_id, position, country, region, device, os, browser, ref_domain, utm_source, utm_medium, utm_campaign, value_num, value_text) — indexes on (day, name), (day, slug), (sid).
- `sessions` (sid, vid, day, start_ts, end_ts, engaged_s, pages, plays, country, device, lang, ref_domain, utm_campaign, is_new).
- Rollups (built hourly + nightly by a Cron Trigger): `daily_site` (day, country, device, lang: visitors, new_visitors, sessions, page_views, engaged_s, plays), `daily_game` (day, slug, lang: impressions, clicks, plays, plays_30s, play_s, errors, favourites), `daily_list` (day, list_id, impressions, clicks), `daily_search` (day, query, count, zero_results, clicks), `daily_referrer` (day, ref_domain, utm_*: sessions, plays), `retention` (cohort_day, day_n, visitors), `daily_ads` (day, slot, country, device: requests, impressions, viewable, clicks, earnings from AdSense API).
- Control: `settings` (key, value json, updated_by, updated_at), `home_layout` (lang, item_type, ref, position, size, active), `banners` (id, lang, text, link, image_r2_key, start, end, pages, active), `game_flags` (slug, hidden, featured, hero_rank), `experiments` (id, name, variants json, traffic %, status, start, end), `team` (email, role, added_by), `audit_log` (ts, email, action, target, before json, after json).

## 5. Screens
Empty values show "No data" (KPI cards) or "n/a" (table cells) instead of a long dash (owner rule R41, 11 Nov 2026). All screens: date-range picker with "compare to previous period", country/device/language filters where they make sense, CSV export on every table, loading skeletons, empty states that explain why ("No plays yet — data starts after launch"), error states with retry. **No invented numbers**: when there is no data, show "—".

| # | Screen | Contents |
|---|---|---|
| 1 | Dashboard | KPI cards: visitors now (last 5 min), today's visitors, sessions, avg engaged time, plays, plays per visitor, D1 and D7 return rate, revenue (real, from AdSense API). Charts: visitors/plays over time; top 10 games; top categories; top countries map-free list; devices; top referrers |
| 2 | Realtime | Last 30 min: active visitors, pages being viewed, games being played, countries; auto-refresh 15 s |
| 3 | Games | Table of all games: thumbnail, title, status (draft/published/hidden), source, categories, featured, hero rank, QA status, impressions, CTR, plays, avg play time, 30-s rate, errors. Bulk actions: hide/unhide, feature, add to hero |
| 4 | Game detail / edit | Stats over time + every field from `content.config.ts` (title, categories 1–4, tags, controls, description ≤155, intro, FAQ ≤5, featured, popularity, status, preview video, screenshots) with the same validation as the build; "Save" commits to `dev` (rebuild) |
| 5 | Categories | Order, nav order, names, short names, emoji/picture, parent, SEO text editor, per-category stats |
| 6 | Home layout | Per language: drag-and-drop hero list (replaces editing `popularity` by hand), which tiles are big, rows on/off and order, category tiles position. Instant |
| 7 | Search insights | Top queries, zero-result queries, queries → clicked game, "add synonym" button that proposes a `CATEGORY_WORDS` change (commit) |
| 8 | Acquisition | Referrers, UTM campaigns, countries, languages, search engines (incl. Yandex/Bing), AI referrers (chatgpt.com, perplexity.ai, gemini, copilot) |
| 9 | Engagement | Engaged time per session, sessions per visitor, retention cohort table, funnel: visit → tile click → play start → 30 s → return within 7 days; scroll depth; endless-row batches loaded |
| 10 | Content & SEO | Pages per language, indexable flag, word counts and validate results, last updated; Search Console summary if the owner connects it (Q23) |
| 11 | Ads | Slot on/off per page type and country group, RPM per slot/country/device, viewability, A/B tests of placements (ADS-DATA §7); `ads.txt` viewer |
| 12 | Push | OneSignal subscriber count (API), compose an alert (title, text, game, large image `push.jpg`), schedule, history; hard limit 2 per week |
| 13 | Experiments | Create/stop A/B tests (variants, traffic %), results with plays per session and revenue per session |
| 14 | Banners & notices | Site notice bar, maintenance message, banners per language/page with start/end dates |
| 15 | Settings | Feature flags, default language rules, tracking on/off, data retention |
| 16 | Team | Add/remove emails, roles (Owner only) |
| 17 | Audit log | Every change: who, when, what, before/after; filter and export |

## 6. Design (pixel-perfect rules)
- Same brand tokens as the site (DESIGN §Colours, Nunito, radii, shadows) on a light neutral background (`--c-bg` for panels, white cards).
- Layout: left sidebar 248 px (icons + labels; collapses to icons at < 1280 px, becomes a bottom sheet menu on phones), top bar 64 px (page title, date range, search, user menu), content max 1440 px, spacing on the 4/8 px scale, cards radius 16, tables 44 px rows with sticky header.
- Charts: uPlot, brand blue for the main series, grey for "previous period", tooltips with exact values, no 3D, no pie charts except devices.
- Every screen works at 390 px: tables become stacked cards, charts scroll horizontally inside their card, filters in a sheet.
- Accessibility: focus rings, labels, contrast ≥ 4.5:1, keyboard drag-and-drop alternative (up/down buttons).
- Before building screens, the planner makes a clickable design of the dashboard and one table screen for the owner to approve (Q24).

## 7. Security and performance
- Access JWT verified on every `/api/admin/*` call; role checks server-side; CSRF not needed with JWT header but all writes are POST with JSON + origin check.
- Secrets (GitHub App key, AdSense/OneSignal API keys) only as Cloudflare secrets; never in the repo or logs.
- `/api/e`: size limits, schema validation, rate limit, no cookies, `Cache-Control: no-store`.
- Public site budget unchanged: tracking script < 3 KB gz, deferred; `/api/config` cached at the edge; no layout shift from instant settings (they only reorder or hide existing reserved boxes).

## 8. Owner actions (when Phase 10 starts)
Step-by-step guide for the owner: `docs/ADMIN-SETUP.md` (built 11 Nov 2026).
1. Cloudflare account and domain (Q3) — needed first.
2. Turn on Cloudflare Access (planner guides step by step) and list team emails + roles.
3. Approve uPlot and the GitHub App (Q24).
4. Later: connect AdSense API and OneSignal API keys as Cloudflare secrets (planner guides; keys never in chat).

## 9. Honest limits
- Numbers start at zero on launch day; nothing is back-filled.
- Text and new games need a rebuild (1–3 min); instant controls cover order, visibility, flags and banners.
- Revenue shown is only what AdSense and the game providers report; provider revenue (GameMonetize, Playgama) comes from their dashboards and may only be entered by hand or via their APIs if they offer one.
- D1 free/paid limits: fine for early traffic; the rollup design keeps queries small. If traffic grows very large, raw events move to Cloudflare Analytics Engine (same API shape).
