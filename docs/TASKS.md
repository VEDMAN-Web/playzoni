# Playzoni — task list

Rules: do tasks in order. Pick the first `todo` whose deps are `done`. Change `status:` in this file when you start (`doing`), finish (`done`) or stop (`blocked` + question in `QUESTIONS.md`). Never edit a task's text — if it is wrong, ask.
`model: sonnet` = see CLAUDE.md "Model note". UI tasks must pass the 4-width check (360/390/768/1280).

---
## Phase 0 — Setup and SEO research

### T0.1 — Create repo and project skeleton
- status: done · deps: — · model: haiku · docs: PRD §2 §3
- Do:
  1. The GitHub repo `VEDMAN-Web/playzoni` already exists with one commit on `main` (a README). In this folder: `git init`, `git remote add origin https://github.com/VEDMAN-Web/playzoni.git`, `git pull origin main`. If you can't reach the repo (not logged in, no access) → QUESTIONS.
  2. This folder already holds the kit files, so do **not** run `npm create astro` here. Instead: `npm init -y`, `npm i astro`, then `npx astro add tailwind --yes` and `npx astro add sitemap --yes`. Add `@fontsource-variable/nunito`; devDependencies `typescript`, `@astrojs/check`, `eslint`, `eslint-plugin-astro`, `typescript-eslint`, `prettier`, `prettier-plugin-astro`, `sharp`, `tsx`. `tsconfig.json` extends `astro/tsconfigs/strict`. Placeholder `src/pages/index.astro` ("Playzoni — coming soon").
  3. `astro.config`: `site: 'https://playzoni.com'`, `trailingSlash: 'never'`, `build.format: 'file'`, output static.
  4. npm scripts: `dev`, `build`, `preview`, `lint`, `validate` (`tsx scripts/validate.ts`, stub that prints "validate: ok" and exits 0), `check` (`astro check && npm run lint && npm run validate && npm run build`).
  5. Create folders from PRD §3 with `.gitkeep`. `.gitignore`: node_modules, dist, .env, data/staging/*, graphify-out/* except `graphify-out/GRAPH_REPORT.md`.
  6. `.env.example` with empty keys: `PUBLIC_SITE_URL`, `PUBLIC_CF_ANALYTICS_TOKEN`, `PUBLIC_ADS_ENABLED`, `PUBLIC_ADSENSE_CLIENT`, `PUBLIC_INCLUDE_SAMPLES`, `GD_FEED_URL`, `GM_FEED_URL`, `PG_FEED_URL`, `GP_FEED_URL`, `SOURCE_PRIORITY`.
  7. Keep `CLAUDE.md`, `START-HERE.md` and `docs/` exactly as they are. Create `docs/seo-reports/` and `docs/seo-research/` (with `.gitkeep`).
  8. Create branch `dev` from `main`, commit everything there, push `dev`. Never commit to `main`.
- Done when: `npm run check` passes; `dev` is pushed and `main` still has only the README commit; `README.md` has 5 lines: what it is, `npm install`, `npm run dev`, `npm run check`, "see docs/".

### T0.2 — Knowledge graph
- status: done · deps: T0.1 · model: haiku
- Do: run `/graphify .` and `graphify claude install` (project scope). Commit `graphify-out/GRAPH_REPORT.md` only.
- Done when: `graphify-out/GRAPH_REPORT.md` exists and is committed.

### T0.3 — Category keyword data
- status: skipped (Q8 answer C — volumes come later from Search Console / Keyword Planner) · deps: T0.1 · model: haiku · docs: SEO-PLAN §Categories §Strategy
- Do: with the installed SEO keyword-research skill, get monthly search volume and keyword difficulty for every category name in SEO-PLAN §Categories, in **United States** and **India**, plus these modifiers for the 12 nav categories: "`<name>` online", "`<name>` free", "`<name>` for mobile". If the skill needs a paid API key you don't have → QUESTIONS (do not invent numbers). Save `docs/seo-research/category-keywords.csv` with columns `keyword,country,volume,difficulty,source,date`.
- Done when: CSV has one row per keyword × country, every number came from the tool, `source` names the tool.

### T0.4 — SERP snapshot
- status: done (research-only: tool order, not Google positions; see Q8) · deps: T0.1 · model: haiku
- Do: for the 12 nav category head terms (e.g. "car games"), record the top 10 ranking domains (US) using the SEO skill or web search. Save `docs/seo-research/serp-snapshot.md` (one table per term: position, domain, URL). No analysis needed.
- Done when: 12 tables present, each with 10 rows or a note why fewer.

---
## Phase 1 — Foundation

### T1.1 — Design tokens and global styles
- status: done · deps: T0.1 · model: haiku · docs: DESIGN §Colours §Type §Space
- Do: `src/styles/tokens.css` with every token in DESIGN as CSS variables (responsive type via media queries). Map colours, radius, shadow, spacing into Tailwind theme. `src/styles/global.css`: import font, base body (bg, ink, font, 16px), focus ring rule, `prefers-reduced-motion` rule, link styles.
- Done when: every token name in DESIGN exists in tokens.css with the exact value; no hex colours anywhere else in `src/` (grep check).

### T1.2 — Content schemas, taxonomy and sample data
- status: done · deps: T1.1 · model: haiku · docs: PRD §4, SEO-PLAN §Categories §Templates §Content
- Do:
  1. `src/content.config.ts`: `games` collection with every field in PRD §4 plus `sample: boolean` (default false). `categories` collection for `src/content/categories/*.md` (body only, slug = filename).
  2. `data/categories.json`: all categories from SEO-PLAN §Categories with `slug,name,h1,shortName,parent,navOrder,description,intro`. `navOrder` 1–12 for the nav list, null otherwise. Write `description` (120–155 chars) and `intro` (2 sentences) originally for each, following §Templates rules.
  3. `scripts/make-placeholders.ts` (`npm run placeholders`): makes 24 sample games — names "Sample Game 01"…"24", spread over the 12 nav categories (each nav category ≥ 2, so some categories ≥ 12 when combined via `categories[]` — make `car-games`, `puzzle-games`, `action-games` have ≥ 12 each), varied aspect, `sample: true`, `status: published`, placeholder thumbnails (solid brand colours + number, via sharp) in `public/thumbs/<slug>/{s,m,l}.webp`, `embedUrl` = `/sample-game.html` (a tiny local HTML page showing "Sample game — tap to bounce" with a bouncing ball canvas, for player testing).
  4. Samples are only included when `PUBLIC_INCLUDE_SAMPLES=true` (helper `getPublishedGames()` in `src/lib/games.ts` is the only way pages read games).
- Done when: `npm run check` passes; `getPublishedGames()` returns 24 with the flag on and 0 with it off.

### T1.3 — Base layout and SEO components
- status: done · deps: T1.2 · model: haiku · docs: SEO-PLAN §Templates §Schema §Technical
- Do: `BaseLayout.astro` (html lang en, head, header/footer slots), `Seo.astro` (props: title, description, canonicalPath, ogImage, noindex) that enforces length limits by throwing at build time, `JsonLd.astro` (props: object or array → one `<script type="application/ld+json">`). Head also: viewport, theme-color, manifest, favicons, font preload, Cloudflare Web Analytics beacon only if `PUBLIC_CF_ANALYTICS_TOKEN` is set. `src/lib/seo.ts`: title builders for each page type exactly as §Templates (with the > 60 fallbacks).
- Done when: unit-style check script `scripts/test-seo.ts` (run inside `validate`) confirms the 3 title fallbacks for a 20-, 45- and 70-char title; a test page renders canonical `https://playzoni.com/...` with no trailing slash.

### T1.4 — Logo, favicons, manifest
- status: done · deps: T1.1 · model: haiku · docs: DESIGN §Brand
- Do: `public/logo.svg`, `public/icon.svg`, favicon 32 PNG, apple-touch-icon 180, 192/512 PNG (generated from icon.svg with sharp in `scripts/make-icons.ts`), `site.webmanifest`. Static og images `public/og/home.png`, `public/og/default.png` (1200×630: cream bg, logo, tagline).
- Done when: files exist, manifest valid JSON, logo readable at 28px height.

### T1.5 — Header, category nav, footer
- status: done · deps: T1.3, T1.4 · model: haiku · docs: DESIGN §Header, PRD §8
- Do: build `Header`, `CategoryNav` (12 nav categories from `categories.json` that are published — see SEO-PLAN §Categories rule; with samples, show all 12), `SearchBox` (plain GET form to `/search` with `q`, works without JS), mobile search overlay (small vanilla script; without JS the icon links to `/search`), favourites icon (links to `/favourites`, page built in T2.6), `Footer` per PRD §8. Active nav chip on category pages.
- Done when: 4-width check passes; nav scrolls sideways on 360px with no page overflow; all links are real `<a href>`.

---
## Phase 2 — Pages

### T1.6 — Light blue theme and Poki-style nav box
- status: done · deps: T1.5 · model: haiku · docs: DESIGN §Colours §Header §Category tile, PRD §8
- Do:
  1. Update `tokens.css` colours to the new DESIGN §Colours values (names unchanged). Update `brand.json` theme colour, `site.webmanifest` and regenerate icons/og images if they use the old colours.
  2. Replace the header bar and the category chip row with the nav box exactly as DESIGN §Header (fixed top-left; 3×1 cells ≥1024, one line 56px below). Remove `CategoryNav` from the header. Keep `SearchBox` logic but move it into the new search panel.
  3. Build the search panel (slide-in from the left; full screen on phones) with input + chips for all published categories. No-JS fallback: search button is a link to `/search`.
  4. Add the `nav-spacer` helper class and the page `padding-top` rules from DESIGN §Header in `global.css`. On the current placeholder home page, add top padding so nothing hides under the nav box.
  5. Add `emoji` (one emoji each, fitting the category) to every category in `data/categories.json` and make it required in the schema.
- Done when: `npm run check` passes; 4-width check passes; nav box never covers page text at any width; search panel opens/closes with mouse, keyboard (Escape) and touch; without JS the search button goes to `/search`; no old orange colour left (`grep -ri "FF5A36\|FFF7EE" src public data` returns nothing).

### T2.1 — Tiles, grid, rows
- status: done · deps: T1.6 · model: haiku · docs: DESIGN §Game tile §Grid §Rows
- Do: `GameTile` (S/M/L, badges, hover, srcset), `CategoryTile` (DESIGN §Category tile), `GameGrid` (mosaic + uniform modes, exact pattern from DESIGN, nav spacer as first item, category tiles inserted where DESIGN says), `GameRow` (scroll-snap, arrows ≥1024 via tiny script, works without JS as a swipe/scroll row). First 6 tiles on a page eager, first `fetchpriority=high` (prop `eagerCount`).
- Done when: on a temporary page `/dev-grid` (delete it at the end of the task) 24 sample tiles show the mosaic pattern; no gaps; no horizontal overflow at 4 widths; reduced-motion disables transforms.

### T2.2 — Home page
- status: done · deps: T2.1 · model: haiku · docs: PRD §6, SEO-PLAN §Templates §Schema, DESIGN §Content blocks
- Do: build `/` exactly in PRD §6 order. About block text: write original ~350 words (H1 "Free Online Games on Playzoni", H2s: "Play instantly on any device", "Popular categories" with 8 linked categories and one line each, "How we pick games" — real process: every game is played and checked on phone and desktop before it goes live). JSON-LD WebSite + Organization.
- Done when: one H1; JSON-LD present; 4-width check; Lighthouse mobile SEO = 100 on local preview.

### T2.3 — Category pages
- status: done · deps: T2.1 · model: haiku · docs: PRD §5, SEO-PLAN §Categories §Templates §Schema §Content, DESIGN §Content blocks
- Do: `src/pages/[category]/[...page].astro` (or equivalent) for every category: H1 at top, mosaic grid (page 1) / uniform grid (page ≥ 2), 60 games per page sorted by popularity, child + parent chips, pagination links, then the category's markdown text (if file exists) in a text card, FAQ. Noindex + excluded from nav when < 12 published games. JSON-LD CollectionPage + ItemList + BreadcrumbList (+ FAQPage if FAQ exists). Write `src/content/categories/` text **only** for `car-games` now (as the template example, 400–900 words, §Content template, may mention only sample games for "Top" section with a TODO comment `<!-- replace in T5.2 -->`).
- Done when: `/car-games` renders with all parts; a < 12 category has `noindex`; page 2 exists when > 60 games (test by temporarily setting per-page to 10, then set back to 60).

### T2.4 — Game page (static parts)
- status: done · deps: T2.1 · model: haiku · docs: PRD §7, SEO-PLAN §Templates §Schema §Internal linking, DESIGN §Content blocks
- Do: `src/pages/game/[slug].astro` with everything in PRD §7 **except** player interactivity: cover state of the player as static HTML (thumbnail, title, Play button that is a `<button>` with `data-embed`), breadcrumbs, H1, intro, markdown body, FAQ (`<details>`), info table (hide empty rows), related category chips with counts, "More games like this" 24 tiles. `src/lib/related.ts`: same primary category by popularity → shared tags → overall popularity, never the game itself, no duplicates. Rails ≥1280 with related tiles + `AdSlot` (renders an empty reserved 300×250 box only when `PUBLIC_ADS_ENABLED=true`, otherwise nothing). JSON-LD VideoGame + BreadcrumbList + FAQPage.
- Done when: a sample game page passes 4-width check; no iframe in the HTML source; JSON-LD has all fields in §Schema; related list has 24 items with samples on.

### T2.5 — Player
- status: done · deps: T2.4 · model: **sonnet** · docs: PRD §7, DESIGN §Player
- Do: vanilla TS island for the player: on Play click create the iframe (attributes from PRD §10) sized by aspect; ≥768 inline; <768 full-screen overlay with close button, body scroll lock, Escape closes, focus moves to iframe and returns to Play button on close; Fullscreen button (Fullscreen API on the player container, hidden if unsupported, iOS fallback = overlay); Share (Web Share API → fallback copy link + "Link copied" toast 2s); Report = `mailto:` with subject "Problem with {Title} ({slug})". Push slug to recently played (T2.6 helper; if T2.6 not done, write the helper here in `src/lib/storage.ts` with try/catch).
- Done when: sample game plays inline on desktop and in overlay at 360/390; close works; no console errors; Lighthouse TBT on game page ≤ 100 ms before click.

### T2.6 — Recently played, favourites, like/dislike
- status: done · deps: T2.4 · model: haiku · docs: PRD §6 §7 §8, DESIGN §States
- Do: `src/lib/storage.ts` (all localStorage access wrapped in try/catch, max 24 recent, max 100 favourites). Recently played row on home (rendered client-side after the mosaic, hidden when empty — no layout shift above the fold). Heart button in PlayerBar toggles favourite. `/favourites` page (noindex): renders saved games client-side from a small JSON index `/games-index.json` (slug, title, thumb) built at build time. Like/dislike: toggles state only, no counts shown.
- Done when: works in a normal and a private window (private: features silently do nothing, no errors); CLS on home ≤ 0.05.

### T2.7 — List pages
- status: done · deps: T2.1 · model: haiku · docs: PRD §5, SEO-PLAN §Templates §Internal linking
- Do: `/new-games` (addedDate desc), `/popular-games` (popularity desc) — uniform M grid, 60 per page with pagination; `/all-games` A–Z, 120 per page, letter jump links, small tile + text link per game; `/categories` — tile per published category with game count. Each with short original intro (2–3 sentences) and correct title/meta/canonical.
- Done when: all pages render, pagination self-canonical, 4-width check.

### T2.8 — Search
- status: done · deps: T2.4 · model: haiku · docs: PRD §5
- Do: Pagefind indexing game pages (title, intro, categories) after build (`postbuild` script). `/search` page (noindex) with Pagefind UI styled with tokens, reading `q` from the URL; no results → message + popular row. Header search submits to it.
- Done when: searching a sample game name finds it; `/search` has noindex; Pagefind JS loads only on `/search`.

### T2.9 — Static pages and 404
- status: done · deps: T1.5 · model: haiku · docs: PRD §5
- Do: `/about` (original ~300 words: Playzoni by SparkBeta Tech, Surat, India; how games are picked and tested; contact email placeholder `hello@playzoni.com`), `/developers` (how to submit a game: email with link + short description; we review every game), `/contact` (email + mailto button; no form yet), `/privacy`, `/terms`, `/cookies` (heading + "This page is being finalised." + `noindex` until owner text arrives — add Q in QUESTIONS for owner legal text), `404.astro` (message, search box, popular row).
- Done when: all pages render with correct meta; legal pages noindex.

---
## Phase 3 — Technical SEO and quality

### T3.1 — Sitemap and robots
- status: done · deps: T2.3, T2.4, T2.7 · model: haiku · docs: SEO-PLAN §Technical
- Do: configure sitemap (exclude noindex pages via a shared list in `src/lib/noindex.ts` that pages also use), `lastmod` from `updatedDate`, `public/robots.txt` exactly as §Technical.
- Done when: built sitemap contains every indexable page and no noindex page (script check in validate).

### T3.2 — Headers and redirects
- status: done · deps: T2.5 · model: haiku · docs: SEO-PLAN §Technical, PRD §10
- Do: `public/_headers` with security headers, cache rules, CSP (`default-src 'self'`; script/style/img/connect for self + Cloudflare analytics; `frame-src 'self'` + provider domains listed in `src/lib/providers.ts`). `public/_redirects` with `/index.html / 301` style basics only.
- Done when: `npx wrangler pages dev dist` (dev-only, via npx) serves pages with headers; sample game still plays (CSP allows it).

### T3.3 — Full content validator
- status: done · deps: T2.4, T2.3 · model: **sonnet** · docs: SEO-PLAN §Content "Validate checks"
- Do: implement every check in the list in `scripts/validate.ts`, with clear one-line errors (`file: rule: detail`). Samples are exempt from QA-file, word-count and feed-overlap checks only. Link checker runs on `dist/` after build (so `check` runs validate-links after build).
- Done when: a deliberately broken copy of a sample game (in a temp test) fails with the right messages; real build passes.

### T3.4 — Performance pass
- status: done (partial in 3f27b48; R11 in 8835e9a, 22ddbf4, eea754b; Q11 accepted) · deps: T2.2, T2.3, T2.4, T2.8 · model: haiku · docs: SEO-PLAN §Performance
- Do: run Lighthouse mobile on home, `/car-games`, one game page (local preview). Fix only what breaks the budget. Record scores before/after in STATUS.
- Done when: all three pages meet every number in §Performance.

### T3.5 — Phase 3 audit
- status: done (scoped audit, see docs/seo-reports/2026-11-11-phase3.md) · deps: T3.1–T3.4 · model: haiku
- Do: run the installed SEO skill audit on the local preview (or Cloudflare preview URL if set up); save `docs/seo-reports/<date>-phase3.md`; fix in-scope issues as separate commits `T3.5-fix: …`; run `/graphify .`.
- Done when: report saved; no "critical" issues left open without a QUESTIONS entry.

---
## Phase 4 — Game import pipeline (needs provider publisher accounts — owner)

### T4.1 — Normalizer, thumbnails, og images
- status: done · deps: T3.3 · model: **sonnet** · docs: PRD §10, SEO-PLAN §Technical
- Do: `scripts/import/normalize.ts`: slugify (unique, collision suffix `-2`), category mapping via `data/category-map.json` (unknown provider categories logged to `data/staging/unmapped.txt`, never guessed), de-duplication by normalised title across sources using `SOURCE_PRIORITY`, thumbnail download → s/m/l WebP + 1200×630 og image (square thumb on cream bg with title text) into `public/thumbs/<slug>/`, staging JSON `data/staging/<source>/<slug>.json` keeping the raw feed description in `feedText`. Download with timeout + 2 retries; skip game on failure and log it.
- Done when: running against `data/sample-feed.json` (create it: 20 fake entries with placeholder image URLs served from `public/` during the test) produces staging files and images.

### T4.2 — GameDistribution adapter
- status: deferred — GameDistribution rejected the publisher application on 11 Nov 2026 (low traffic). Re-apply after launch when traffic grows. Do not work on this task; start with GameMonetize (T4.3) and Playgama (T4.4) · deps: T4.1 · model: **sonnet**
- Do: `scripts/import/gd.ts` + `npm run import:gd`. Map fields; build `embedUrl` per GameDistribution's current embed documentation (including the referrer parameter set to the game page URL); mobile flag and aspect from feed.
- Done when: import of the real feed creates staging entries; one game embedded on a draft page plays in the preview.

### T4.3 — GameMonetize adapter
- status: done · deps: T4.1 · model: **sonnet** (first real adapter; T4.2 is deferred, so this one sets the pattern)
- Done when: same as T4.2 for GameMonetize.

### T4.4 — Playgama Partners adapter
- status: done · deps: T4.1 · model: haiku
- Done when: same as T4.2 for Playgama.

### T4.5 — Publish script and launch shortlist
- status: done · deps: T4.1 · model: haiku · docs: PRD §10, SEO-PLAN §Strategy
- Do: change the T4.1 import so thumbnails and og images go to `data/staging/thumbs/<slug>/` (gitignored). `npm run publish -- --slugs a,b` copies staging → `src/content/games/<slug>.md` as `status: draft` with fields filled from staging, empty text fields, **and copies that game's images into `public/thumbs/<slug>/`**. Game page uses `ogImage=/thumbs/<slug>/og.png` when the file exists, else the default (Q13). `npm run shortlist`: takes all staging games and writes `docs/seo-research/game-candidates.csv` (`slug,title,source,mobile,categories,providerRank`) sorted by the provider's own popularity order (mobile-ready first). Leave space for a `volume` column; it is filled later by the owner's SEO team from Google Keyword Planner. Owner picks the launch 300 from this file.
- Done when: both commands work on sample staging data.

### T4.6 — Launch list as drafts + draft preview (so the owner can see and play)
- status: done · deps: T4.5 · model: haiku · docs: PRD §4 §10, SEO-PLAN §Technical
- Do:
  1. `npm run publish -- --file data/launch-list.csv` publishes every slug in that CSV as `status: draft` (same as `--slugs`, reading the `slug` column). Skip and log any slug not found in staging.
  2. Add a preview mode: when `PUBLIC_INCLUDE_DRAFTS=true`, draft games are built like published games, show a small "Draft" badge on the game page, and **every page** gets `noindex,nofollow`. Draft games count towards the 12-game rule in this mode only.
  3. Safety: the production build must never include drafts. Fail the build if `PUBLIC_INCLUDE_DRAFTS=true` and `CF_PAGES_BRANCH=main`. Add `PUBLIC_INCLUDE_DRAFTS` to `.env.example` (empty).
  4. Content checks (word counts, QA file, feed overlap) skip drafts; schema and link checks still run.
  5. Build with drafts on, run `npm run preview`, and play one Playgama game and one GameMonetize game to the first level (check the CSP `frame-src` allows their real embed host; fix `src/lib/providers.ts` if not).
- Done when: `npm run check` passes with drafts off; with drafts on the home page shows the real games, categories with 12+ games appear, both test games play on desktop and phone width. Tell Vedant in plain words: "Open http://localhost:4321 while the preview is running."

---
## Phase P — Poki parity redesign (owner request, 11 Nov 2026) — do this **before** Phase 5
All tasks: follow DESIGN §Poki parity v2. After each task, take screenshots at 390px and 1280px of the pages you changed and save them in `docs/screens/<task>/` (commit them, PNG ≤ 300 KB each) so the planner can compare with Poki.

### TP.1 — Background, tokens, tile sizes and badges
- status: done · deps: T4.6 · model: **sonnet** · docs: DESIGN §V2.1 §V2.2
- Do: new gradient + original SVG pattern; new `--cell`/`--gap` values; S/L/XL sizes and the new home pattern; icon badges with the new rules; tile hover/press/load-in motion.
- Done when: home at 390/768/1280 shows the new look; never more than 12 badges per page; no horizontal scroll; `npm run check` passes.

### TP.2 — Nav box, floating nav bar, phone top bar
- status: done · deps: TP.1 · model: **sonnet** · docs: DESIGN §V2.3
- Do: 1×1 nav box in the grid on desktop, floating bar after 160px scroll, phone top bar, title tile 1×4 on category/list pages; remove the old 3×1 box and 4×1 title tile.
- Done when: behaviour works with mouse, keyboard and touch; works without JS (box and links still there); screenshots saved.

### TP.3 — Game page layout and auto-load
- status: done · deps: TP.2 · model: **sonnet** · docs: DESIGN §V2.4
- Do: Poki-style grid layout around the player, desktop auto-load after idle with spinner, player bar with labelled buttons, reserved ad blocks (only when ads enabled), text card below the tiles.
- Done when: a Playgama and a GameMonetize game auto-load on desktop and play; phones still use cover + overlay; Lighthouse (planner runs it) TBT ≤ 200 ms before the game starts.

### TP.4 — SEO card and footer
- status: done · deps: TP.1 · model: haiku · docs: DESIGN §V2.5 §V2.6
- Do: move home/category/list SEO text into the full-width white card just above the footer; rebuild the footer as specified; add empty `social` URLs to `data/brand.json`.
- Done when: footer matches §V2.6 at 390 and 1280; one H1 per page still; `npm run check` passes.

### TP.6 — Played badge, hover preview, search panel, category tiles
- status: done · deps: TP.4 · model: **sonnet** · docs: DESIGN §V2.8
- Do: everything in DESIGN §V2.8. First check both feeds for a preview video or screenshot list per game and record in STATUS what exists (field names, how many games have it); add optional `previewVideo` and `screenshots` to staging/game data only if the feeds have them (download nothing on import except what the hover needs, max 1 MB video / 4 screenshots per game; store under `public/thumbs/<slug>/`).
- Done when: played badge appears after playing a game and reloading; hover preview works with each of the three fallbacks; search panel matches §V2.8 at 390 and 1280; `/categories` uses 2×1 image tiles; screenshots saved in `docs/screens/TP.6/`; `npm run check` passes.

### TP.7 — Profile panel (local, no login)
- status: todo · deps: TP.6 · model: haiku · docs: DESIGN §V2.9
- Do: profile icon in nav box/bar/phone bar, profile panel, play/time tracking in `storage.ts`, "Played today" labels, clear-history with in-panel confirm.
- Done when: playing two games and reloading shows 2 games and a time; works in a private window without errors (shows the empty state); screenshots in `docs/screens/TP.7/`; `npm run check` passes.

### TP.5 — Poki-style URLs with a language folder
- status: cancelled (owner kept our URLs, SEO-PLAN §URLs final) — do not do · deps: TP.3 · model: **sonnet** · docs: SEO-PLAN §URLs (v2)
- Do: move every page to the v2 paths (`/en/g/<slug>`, `/en/<category>`, `/en/…`), home stays `/`. Update every internal link, canonical, breadcrumb JSON-LD, sitemap, `WebSite` SearchAction (`/en/search?q=`), robots/noindex lists, Pagefind, `games-index.json`, favourites/recently-played links, and the tests. Add `<html lang="en">` everywhere (already) — no hreflang yet.
- Done when: `npm run check` passes (the link checker finds 0 broken links); no page in `dist/` outside `/en/` except `/`, `404`, `robots.txt`, sitemap and assets.

---
## Phase 5 — Content and launch

### T5.1 — QA guide for the testing team
- status: done · deps: T4.5 · model: haiku · docs: SEO-PLAN §Content
- Do: `docs/QA-GUIDE.md` in very simple English (team members fill it): how to open a draft game on the preview, what to check on phone and desktop, how to fill `data/qa/<slug>.json` (with one filled example), when to mark a game "reject". Add `npm run qa:new -- <slug>` that creates the empty JSON from the template.
- Done when: guide ≤ 1 page, example valid against a zod schema used by validate.

### T5.1b — Play modes (local 2-player, online, invite link)
- status: todo · deps: T5.1 · model: haiku · docs: SEO-PLAN §Schema, DESIGN §Content blocks
- Do:
  1. QA notes schema (`scripts/qa/schema.ts`) gets a required `playModes` object: `localTwoPlayer` (two people on one screen/keyboard), `onlineMultiplayer` (plays with other people over the internet), `inviteLink` (the game itself lets you invite a friend with a link or room code) — each `true`/`false`. Update `npm run qa:new` template, the example, and `docs/QA-GUIDE.md` with one plain sentence per question ("Open the game's menu. Is there a 2 Players or Local button? …").
  2. Game frontmatter gets the same optional `playModes` (copied from the QA file when the game page is written).
  3. Game page: under the player bar, show small pill labels only for `true` values: "2 players on one keyboard", "Play online", "Invite a friend". Add an info-table row "Play modes".
  4. JSON-LD `VideoGame`: add `playMode` — `SinglePlayer` always, plus `MultiPlayer` if local or online is true, `CoOp` only if the QA notes say so (skip otherwise).
  5. Category rule in `validate` (published games only, drafts exempt): a game may be in `two-player-games` only if `localTwoPlayer` or `inviteLink` is true; in `multiplayer-games` or `io-games` only if `onlineMultiplayer` is true. Report violations as errors.
- Done when: `npm run check` passes; a test QA file with all three true shows all three pills; validate catches a wrong 2-player category.

### T5.2 — Category texts
- status: todo · deps: T4.5 · model: haiku · docs: SEO-PLAN §Content
- Do: write `src/content/categories/<slug>.md` for every category with ≥ 12 published real games, using only published games in "Top" sections. Repeatable task: run again whenever a category reaches 12.
- Done when: validate passes; each text is original (no shared sentences between categories).

### T5.3 — Game pages (repeat in batches of 20)
- status: todo · deps: T5.1 · model: haiku · docs: SEO-PLAN §Content
- Do: for 20 draft games that have a QA file and are not rejected: fill frontmatter text fields and body from the QA notes + feed facts (rewritten), set `status: published`, `addedDate`/`updatedDate` = today. Commit message `T5.3: batch <n> (<first-slug>…)`.
- Done when: validate passes for the batch. Repeat until 300.

### T5.4 — Production switch
- status: todo · deps: T5.3 (first 300) · model: haiku
- Do: set `PUBLIC_INCLUDE_SAMPLES` off for production builds, delete `/sample-game.html` from production output, confirm no `sample: true` page builds in production, final `npm run check`.
- Done when: production build has 0 sample pages.

### T5.5 — Deploy
- status: todo · deps: T3.5 · model: haiku
- Do: add `public/ads.txt` with the GameMonetize ads.txt lines (owner copies them from GameMonetize → Publisher → My Websites → View, into `data/ads-gamemonetize.txt`; the build copies that file to `public/ads.txt`). Write `docs/DEPLOY.md` (simple steps for Vedant: connect repo in Cloudflare Pages, build command `npm run build`, output `dist`, env vars, production branch `main`, preview branch `dev`; add domain playzoni.com; www → apex redirect rule). Put the steps in QUESTIONS as "Owner action needed". After owner confirms, verify preview URL works and record it in STATUS.
- Done when: preview URL from `dev` loads; production waits for Vedant's merge; the planner has re-run Lighthouse mobile on the preview (home, a category, a game page) and every number in SEO-PLAN §Performance is met, or a QUESTIONS entry explains the gap.

### T5.6 — Launch SEO
- status: todo · deps: T5.4, T5.5 · model: haiku · docs: SEO-PLAN §Launch checklist
- Do: IndexNow key file + `scripts/indexnow.ts` (pings changed URLs after deploy); `docs/SEARCH-CONSOLE.md` owner steps; Phase 5 audit report `docs/seo-reports/<date>-phase5.md`; `/graphify .`.
- Done when: report saved, owner steps written.

---
## Phase 6 — Ads (after AdSense approval)

### T6.1 — AdSense and consent
- status: blocked until owner has AdSense approval · deps: T5.5 · model: haiku · docs: PRD §11
- Do: `AdSlot` loads AdSense only when `PUBLIC_ADS_ENABLED=true`; slots exactly per PRD §11 with reserved sizes (no CLS); `public/ads.txt` from env; consent via Google's own CMP (owner enables in AdSense). 
- Done when: CLS still ≤ 0.05 with ads on; no ad inside or over the player.

---
## Phase 7 — Accounts (docs/ACCOUNTS.md) — after launch of the guest site
### T7.1 — API skeleton
- status: todo · deps: T5.5 · model: **sonnet** · docs: ACCOUNTS.md
- Do: `api/` Fastify + TypeScript app with health route, Better Auth (MongoDB adapter, Google, Microsoft, passkeys), CORS/cookie/rate-limit rules, `.env.example` (empty values), Dockerfile, DigitalOcean App spec `api/.do/app.yaml`. Tests with an in-memory MongoDB.
- Done when: tests pass locally; owner steps 1–4 written in plain words in `docs/DEPLOY-API.md`.
### T7.2 — Sync and stats endpoints
- status: todo · deps: T7.1 · model: **sonnet** · docs: ACCOUNTS.md §API
- Done when: every endpoint in the table has tests, including merge, export and delete.
### T7.3 — Website sign-in and sync
- status: todo · deps: T7.2, TP.7 · model: **sonnet** · docs: ACCOUNTS.md §Website side
- Done when: sign-in with Google works on the preview; guest data merges on first sign-in; site still works with the API switched off.

---
## Phase 8 — Languages (docs/I18N.md) — after English is indexed
### T8.1 — i18n framework, hreflang and footer language picker
- status: todo · deps: T5.6 · model: **sonnet** · docs: I18N.md
### T8.2 — Country suggestion bar (`/__geo` Pages Function) and home-page language memory
- status: todo · deps: T8.1 · model: haiku · docs: I18N.md §Choosing the language
### T8.3 — Translate UI strings + first 100 game pages per language (batches of 20)
- status: todo · deps: T8.1 · model: haiku · docs: I18N.md §Translation

---
## Phase 9 — Growth and retention (docs/GROWTH.md) — after launch
Starts only after the site is live (**after T5.6**) and only when the planner moves it up (R30). Anything that needs cookie consent waits for **T6.1** (ads + consent) — never load a cookie-based or ad-related script before that consent exists.
Owner work, not a build task: short gameplay videos for YouTube Shorts, Instagram Reels and TikTok that link to game pages (GROWTH tactic 8).
Rules for every Phase 9 task (each task repeats them in its "Always" line):
- Mobile first: works and looks right from 360px. UI parts are checked at 360, 390, 768 and 1280: nothing overflows, nothing is cut off, tap targets ≥ 44px.
- Pages stay fully readable with JavaScript off. New features are small vanilla TS islands added after load; with JS off they simply do not appear. Our JS stays ≤ 25 KB gzipped per page (SEO-PLAN §Performance). No layout shift: anything added after load goes below the mosaic or into a reserved box.
- Design tokens only (DESIGN.md) — no hard-coded colours or font sizes. New pills/cards reuse existing tile, pill and card styles.
- No dark patterns: nothing on the list in `docs/GROWTH.md` "Not allowed on Playzoni" (no fake urgency or countdowns, no fake counts, no confirm-shaming, no nagging, no full-screen popups, no disguised ads).
- No invented numbers: show a number only if real data produces it. No play counts are shown to visitors at all in this phase.
- All localStorage access goes through `src/lib/storage.ts` (try/catch, `pz-` key prefix) and must work silently in a private window.
- No new npm dependency (PRD §2). `npm run check` passes before every commit. At the end of the phase run `/graphify .`.

### T9.1 — Installable app (PWA check, service worker only if needed)
- status: todo · deps: T5.6 · model: **sonnet** · docs: DESIGN §Brand, GROWTH tactic 6
- Do:
  1. `public/site.webmanifest` already exists. Add only what is missing for installability: `id: "/"`, and a 512px icon entry with `purpose: "maskable"` (make `public/icon-maskable-512.png` from `icon.svg` with sharp: icon centred at 80% on `--c-bg` colour). Do not change name, colours or the other icons.
  2. On the preview URL (Chrome desktop and Chrome Android), check installability (DevTools → Application → Manifest, "Installability"). Record the result in STATUS.
  3. **Only if** Chrome says the site is not installable without a service worker: add `public/sw.js` — a minimal worker with `install`/`activate` that call `skipWaiting`/`clients.claim` and **no caching** (no fetch handler, or a network-only one). Never cache HTML, game iframes or provider files. Register it from the base layout after `load`, inside try/catch, only on `https:` or `localhost`. Add `Cache-Control: no-cache` for `/sw.js` in `public/_headers`. If no service worker is needed, do not add one (T9.9 adds OneSignal's own worker later).
  4. Add `src/lib/install.ts`: listens for `beforeinstallprompt` (store the event, call `preventDefault`), `appinstalled` (save `pz-install` = `installed`), and exposes `canInstall()`, `isIos()` (Safari on iPhone/iPad, no `beforeinstallprompt`), `isInstalled()` (`display-mode: standalone` or `pz-install` = `installed`), `promptInstall()`. No UI in this task.
- Always: mobile-first (360px+); pages readable with JS off; design tokens; no dark patterns (GROWTH "Not allowed"); no invented numbers; `npm run check` passes; check at 360/390/768/1280.
- Done when: Chrome reports the preview as installable; installing opens `/` in a standalone window; no page or game is served from a cache; `npm run check` passes.

### T9.2 — "Add to home screen" offer (once, after 2+ games)
- status: todo · deps: T9.1, TP.7 · model: haiku · docs: DESIGN §V2.9, GROWTH tactic 6
- Do:
  1. Eligible only when: the visitor has played **2 or more different games** (from `storage.ts` play history), `isInstalled()` is false, and either `canInstall()` or `isIos()` is true.
  2. **Small bar, shown once ever:** on the home page and category pages only (never on a game page, never over the player). A slim card in the page flow directly **after the mosaic** (not fixed, not over content, no layout shift above the fold): our icon, the text "Play faster: add Playzoni to your home screen.", a primary button "Add" and a plain text button "Not now". "Add" calls `promptInstall()`; on iPhone/iPad it instead shows one line inside the card: "Tap the Share button, then 'Add to Home Screen'." Any of Add / Not now / the close icon saves `pz-install` = `dismissed` (or `installed`) and the bar never shows again.
  3. **Profile panel entry:** at the bottom of the profile panel (TP.7), above "Clear my history", a small text button "Add to home screen" shown whenever eligible (even after the bar was dismissed — the visitor opened the panel themselves). Hidden once installed.
  4. Never a full-screen popup or modal, never a browser dialog on page load, never repeated after dismissal. No wording that shames ("No, I don't like games" etc.).
- Always: mobile-first (360px+); pages readable with JS off (bar simply absent); design tokens; no dark patterns (GROWTH "Not allowed"); no invented numbers; `npm run check` passes; check at 360/390/768/1280.
- Done when: in a fresh browser the bar appears only after playing 2 different games; "Not now" hides it for good (reload confirms); the profile entry still works; nothing shows on game pages; private window shows no errors; screenshots at 390 and 1280 in `docs/screens/T9.2/`.

### T9.3 — Own play counting (Cloudflare Function + D1)
- status: todo · deps: T5.6 · model: **sonnet** · docs: PRD §2 (Phase 2: Cloudflare Worker + D1), GROWTH "What Poki does" (own analytics events)
- Do:
  1. Owner action first: add a QUESTIONS entry "Owner action needed" with plain steps: create a D1 database `playzoni` in the Cloudflare dashboard, bind it to the Pages project as `DB` (production and preview), and paste `migrations/0001_plays.sql` into the D1 console. Continue building and testing with the fake DB below while waiting.
  2. `migrations/0001_plays.sql`: one table of **daily totals only** — `plays(day TEXT, slug TEXT, event TEXT, variant TEXT, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, slug, event, variant))`. No visitor id, no IP, no user agent, no timestamp finer than the UTC day.
  3. `functions/api/play.ts` (a Cloudflare Pages Function = the Worker approved in PRD §2, deployed with the site — no `wrangler` needed on the owner's PC): `POST` only, JSON body ≤ 200 bytes `{ e, g, v? }`. `e` must be `play_start`, `play_30s` or `play_end`; `g` must match `^[a-z0-9-]{1,80}$` **and** exist in the built `/games-index.json` (read through `env.ASSETS`, cached in memory); `v` is `a`, `b` or absent (stored as `-`). Upsert `n = n + 1` for (today UTC, g, e, v). Reply `204`. Bad input → `400`, no detail. Never set or read cookies. Never log the request body or headers.
  4. `functions/api/popular-week.ts`: `GET` returns `{ week, games: [slug…] }` — top 24 slugs by `play_30s` over the **last complete ISO week (Monday–Sunday, UTC)**, only slugs still in `/games-index.json`. `Cache-Control: public, max-age=3600`.
  5. Game page player script: send events with `navigator.sendBeacon('/api/play', …)` — `play_start` when the iframe is created (Play click or desktop auto-load), `play_30s` once when the TP.7 visible-time counter reaches 30 s, `play_end` once on `pagehide` if `play_start` was sent. Wrap in try/catch; a failed beacon changes nothing for the player. Add `connect-src 'self'` (or keep it if present) in `public/_headers`.
  6. Tests (in `npm run validate`, run with `tsx`, no wrangler): the handlers with a fake `DB` and fake `ASSETS` — valid event counted, each kind of bad input rejected, unknown slug rejected, week boundaries correct, response never contains personal data.
  7. Update the `/privacy` page in one short paragraph: "We count plays per game per day (no cookies, no personal data) to show which games are popular."
- Always: mobile-first (360px+); pages readable with JS off (no events are sent then — fine); design tokens; no dark patterns (GROWTH "Not allowed"); no invented numbers — counts are only ever used for ranking, never shown; `npm run check` passes; check the game page at 360/390/768/1280 (nothing visible changes).
- Done when: tests pass; after the owner binds D1, playing a game on the preview adds rows for `play_start`, `play_30s` and `play_end` (check in the D1 console, record in STATUS); `/api/popular-week` answers; game-page Lighthouse TBT unchanged.

### T9.4 — "Popular this week" row from real plays
- status: todo · deps: T9.3 · model: haiku · docs: PRD §6, DESIGN §Rows §V2.8 (search panel "Popular this week")
- Do:
  1. `scripts/popular-week.ts` runs before `astro build` (add to the `build` script): fetch `${PUBLIC_SITE_URL}/api/popular-week` (5 s timeout). Use the list only if it has **at least 12 published games** that each have ≥ 20 `play_30s` that week (the endpoint adds a `min` count per slug for this check; add it in this task). Otherwise — or on any error — fall back to the current popularity order (top 24 published games). Write `data/popular-week.json` `{ week, source: "plays" | "fallback", games: [slug…] }` (git-ignored; the build creates it every time).
  2. Home page: a "Popular this week" row (S tiles, same as other rows, with "See all" → `/popular-games`) as the **first** row, directly above "Popular games". To avoid a near-duplicate, the "Popular games" row skips games already shown in "Popular this week". The search panel's "Popular this week" grid (§V2.8) uses the same list.
  3. The list changes once a week by itself (the endpoint only counts complete weeks) and is refreshed on every deploy. Weekly automatic rebuild: add a QUESTIONS entry for the owner (A) Cloudflare deploy hook + a tiny scheduled Worker, B) a GitHub Actions schedule) — do not build either until answered.
  4. Show **no** numbers (no play counts, no "1.2k playing") anywhere.
- Always: mobile-first (360px+); row is static HTML, so readable with JS off; design tokens; no dark patterns (GROWTH "Not allowed"); no invented numbers; `npm run check` passes; check at 360/390/768/1280.
- Done when: with the endpoint unreachable the build still passes and uses the fallback (`source: "fallback"`); with a fake response of 12+ qualifying games the row follows it; no duplicate games between the two popular rows; screenshots at 390 and 1280 in `docs/screens/T9.4/`.

### T9.5 — "Game of the day" tile
- status: todo · deps: T5.6 · model: haiku · docs: DESIGN §V2.2 §V2.9 (pill style), GROWTH tactic 9
- Do:
  1. `src/lib/game-of-day.ts`: eligible = published games with `mobile: true`, sorted by slug A–Z. Day number `d` = whole days from 2026-01-01 00:00 UTC to the current UTC day. Pick = `eligible[(d × 7919) mod N]`. Same game for everyone in the world at the same moment (UTC), no randomness, no visitor data.
  2. Home mosaic: one **L tile (2×2)** placed directly after the 5 featured games from R29, with a small white pill "Game of the day" in the bottom-left (same pill style as "Played today" in §V2.9, no clock icon). The played badge still applies. The same game is not repeated elsewhere in the mosaic.
  3. The build computes the picks for the next 14 days and embeds them as a small JSON (`[{d, slug, title}]`) in the page; a tiny inline script right after the tile swaps link, image and accessible name to today's UTC pick (same tile size, so no layout shift). With JS off the tile shows the build-day pick.
  4. **No** countdown, no "ends in", no "X people played today", no streaks.
- Always: mobile-first (360px+); readable with JS off; design tokens; no dark patterns (GROWTH "Not allowed"); no invented numbers; `npm run check` passes; check at 360/390/768/1280.
- Done when: a unit test (in validate) gives the same pick for the same date and a different pick on the next day; changing the computer's time zone does not change the pick; tile matches the pill style at 390 and 1280 (screenshots in `docs/screens/T9.5/`); CLS on home unchanged.

### T9.6 — "Because you played X" row (local history only)
- status: todo · deps: T5.6, TP.7 · model: haiku · docs: PRD §6, DESIGN §Rows, `src/lib/related.ts`
- Do:
  1. If `/games-index.json` lacks them, add two short fields per game: primary category slug `c` and up to 5 tag slugs `t`. Keep the file as small as possible (record its size before/after in STATUS).
  2. Home page: client-side row "Because you played {title}" directly **after** the "Recently played" row (below the mosaic, like PRD §6.3 — no layout shift). X = the most recently played game in `storage.ts`. Candidates: same primary category as X, then shared tags, then popularity — the same order as `related.ts`, written as a small client function (do not import build-time code). Exclude X and every game already played. Max 12 S tiles; show the row only if there are at least 6, otherwise hide it. Title links to X's game page.
  3. Uses only localStorage + the static index. Nothing is sent to any server.
- Always: mobile-first (360px+); pages readable with JS off (row absent); design tokens; no dark patterns (GROWTH "Not allowed"); no invented numbers; `npm run check` passes; check at 360/390/768/1280.
- Done when: after playing one game and returning home the row shows similar, unplayed games; with no history it is absent; private window shows no errors; home JS still ≤ 25 KB gzipped; screenshots in `docs/screens/T9.6/`.

### T9.7 — Simple A/B switch (home page, 2 variants)
- status: todo · deps: T9.3, T9.4 · model: **sonnet** · docs: GROWTH "What Poki does" (A/B tests), PRD §2
- Do:
  1. `data/experiments.json`: at most **one** active experiment: `{ id, active, start, b: { rowOrder?, hotBadges?, mosaicOrder? } }`. Allowed knobs only: `rowOrder` (order of the home rows), `hotBadges` (`false` = no hot badges), `mosaicOrder` (`"popularity"` or `"newest"` for tiles after the 5 featured). Variant A = the normal site. Start with the planner's example: `{ "id": "rows-1", "active": false, "start": "", "b": { "rowOrder": ["new", "popular-week", "popular"] } }`.
  2. When an experiment is active, the build also outputs the variant-B home page at `/_ab/b` — `noindex,nofollow`, canonical `/`, left out of the sitemap, Pagefind and the link checker. Only the home page is tested.
  3. `functions/index.ts` (runs for `/` only, so other pages and files do not use Function requests): no experiment active → serve the normal page. Otherwise: visitors from the EEA, UK or Switzerland (`request.cf.country`), unknown countries and bots/crawlers (user agent contains bot, crawl, spider, lighthouse) always get A **with no cookie**. Everyone else: read cookie `pz_ab` (`<id>.a` / `<id>.b`); if missing or from an old experiment, pick A or B 50/50 and set `pz_ab` (Max-Age 30 days, Path=/, SameSite=Lax, Secure, value only the id and letter). Serve B through `env.ASSETS.fetch('/_ab/b')`. Response `Cache-Control: private, no-store`.
  4. Events: the home page sends one `home_view` beacon with `v` per page load when a variant cookie exists; game pages add `v` from the cookie to play events. Add `home_view` to the T9.3 event allowlist.
  5. Results: `functions/api/ab.ts` `GET ?exp=<id>` returns per variant the totals of `home_view`, `play_start`, `play_30s` since `start`. `npm run ab:report -- <id>` prints a small table and one plain sentence: "B gets X more/fewer 30-second plays per 100 home visits than A." If either variant has fewer than 1,000 home views it prints "Not enough data yet." instead.
  6. Add a QUESTIONS note for the owner: Function requests count toward Cloudflare's free daily limit (100,000/day); the planner decides when to turn an experiment on.
- Always: mobile-first (360px+); both variants readable with JS off; design tokens; no dark patterns (GROWTH "Not allowed"); no invented numbers; `npm run check` passes; check both variants at 360/390/768/1280.
- Done when: tests (fake ASSETS/DB) cover: no experiment → normal page, EEA/bot → A without cookie, cookie kept on return, old cookie reassigned; with `active: true` on the preview, a cleared browser lands on A or B and stays there; `/_ab/b` is not in the sitemap and has noindex; `ab:report` prints "Not enough data yet." on a fresh DB.

### T9.8 — Own promo in unfilled ad slots
- status: todo · deps: T6.1, T9.2 · model: haiku · docs: PRD §11, DESIGN §V2.8 (ad labels), GROWTH "What Poki does" (empty ad slots)
- Do:
  1. In `AdSlot`, watch the AdSense `<ins>` for `data-ad-status="unfilled"`. When unfilled, hide the `<ins>` and show our own promo card **inside the same reserved box** (same size, no layout shift) and remove the "ADVERTISEMENT" label for that box (it is not an ad).
  2. Three promo cards (our icons, our text, one button each), first one that applies, a different one per slot on the same page: Favourites — "Tap the heart to save games you love." → `/favourites`; Profile — "See your games and time played." → opens the profile panel; Add to home screen — only if T9.2 eligibility is true **and** `pz-install` is not `dismissed`/`installed` → calls the same install flow.
  3. Promo cards must not look like a game tile, a Play button or an ad (no game thumbnails, no "Play" wording). Never inside or over the player.
  4. When ads are off (`PUBLIC_ADS_ENABLED` not `true`) no slot and no promo is rendered (unchanged).
- Always: mobile-first (360px+); pages readable with JS off (box stays empty and reserved, as today); design tokens; no dark patterns (GROWTH "Not allowed"); no invented numbers; `npm run check` passes; check at 360/390/768/1280 for each slot size (300×250, 728×90, 320×100, in-grid).
- Done when: forcing `data-ad-status="unfilled"` in DevTools shows the right promo in every slot size with CLS unchanged; a filled ad is never replaced; screenshots in `docs/screens/T9.8/`.

### T9.9 — New-game alerts (web push with OneSignal)
- status: todo · deps: T9.1, TP.7 · model: **sonnet** · docs: GROWTH tactic 7, DESIGN §V2.9
- Note: **OneSignal is an owner-approved addition to the stack (11 Nov 2026)**. Use OneSignal's Web SDK only — no other push library or service.
- Do:
  1. Owner action: QUESTIONS entry "Owner action needed" — create the OneSignal account and web app for playzoni.com and send the App ID. App ID goes in `.env` as `PUBLIC_ONESIGNAL_APP_ID` (add it **empty** to `.env.example`). With the ID empty, the whole feature is off and nothing loads.
  2. Visits: count a "visit" in `storage.ts` (`pz-visits`) when a page loads more than 30 minutes after the last page view. Nothing about push is shown before the **3rd visit**.
  3. Soft opt-in (ours, never the browser prompt on page load): from the 3rd visit, a small in-flow card **after the mosaic** on the home page, shown once ever: "Get new-game alerts — at most 2 a week." with buttons "Get new-game alerts" and "No thanks". The same "Get new-game alerts" button sits in the profile panel. Only when the visitor clicks "Get new-game alerts" do we load the OneSignal SDK and ask for browser permission. "No thanks" saves `pz-push` = `no` and the card never shows again. Show none of this where the browser has no `PushManager` (e.g. iPhone Safari not installed as an app).
  4. Service worker: put OneSignal's worker file at the site root as OneSignal's docs say. If T9.1 added `public/sw.js`, merge them (one worker that `importScripts` OneSignal's worker) — never two workers on the same scope. Still no page caching.
  5. Easy unsubscribe: profile panel shows "New-game alerts: On" with a "Turn off" button (OneSignal opt-out, saves `pz-push` = `off`) and "Turn on" when off. One click either way, no confirm-shaming.
  6. Push image: generate a **4:3 landscape image per game** for notifications (large image shows on Android and Windows only; iPhone/Mac show icon + text): **1440×1080** (min 1350px wide), the game's `l` thumbnail centred at 75% of the height on a cover-fitted, blurred copy of itself, JPEG quality ~80, saved as `public/thumbs/<slug>/push.jpg`. Made with sharp (already approved) by the import script (staging) and copied by the publish script, like `og.jpg`; add `npm run images:push` to backfill games already published (skips existing files). Record the total added size in STATUS. Notification icon = `icon.svg` as a 192px PNG (`public/icon-192.png` already exists — reuse it).
  7. `docs/PUSH.md` for the owner in plain steps: how to send an alert in the OneSignal dashboard (title, short text, game URL, large image = `https://playzoni.com/thumbs/<slug>/push.jpg`, icon = `/icon-192.png`), and the rule **max 2 alerts per week**, only about new or updated games, never fake urgency.
  8. Update `/privacy` and `/cookies` pages: what OneSignal stores and how to turn alerts off.
- Always: mobile-first (360px+); pages readable with JS off (no card, no SDK); design tokens; no dark patterns (GROWTH "Not allowed": no nagging, no repeat prompts); no invented numbers; `npm run check` passes; check at 360/390/768/1280.
- Done when: in a fresh browser nothing appears on visits 1–2; on visit 3 the card appears once; no OneSignal request is made before the click (check the Network tab); subscribe and "Turn off" both work on Chrome desktop and Android with the owner's App ID; `push.jpg` exists for every published game at 1440×1080; screenshots in `docs/screens/T9.9/`.

- **Owner setup done (11 Nov 2026, by the planner in the owner's OneSignal account "SparkBeta Tech App"):** Web platform active, integration **Custom code**, site name **Playzoni** (default notification title), site URL `https://playzoni.com`, auto resubscribe on. App ID (public, it appears in page HTML) `7d35992a-3dba-4b38-a033-65061b8b35e5`; Safari web ID `web.onesignal.auto.165f55d2-2c2b-457d-b7b8-8b89270f4464`. Put both in `.env` (`PUBLIC_ONESIGNAL_APP_ID`, `PUBLIC_ONESIGNAL_SAFARI_WEB_ID`). Use SDK v16 (`https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js`), `notifyButton.enable: false` (we use our own button), and serve OneSignal's service worker file `OneSignalSDKWorker.js` from the site root (`public/`). Still open: default icon (256×256 PNG at an https URL) — set it in OneSignal once `https://playzoni.com/icon-256.png` is live.
### T9.10 — Remarketing tags (Google Ads + Microsoft Ads), only after consent
- status: todo · deps: T6.1 · model: haiku · docs: PRD §11, GROWTH "What Poki does" (paid re-marketing), SEO-PLAN §Performance
- Do:
  1. Owner action first: QUESTIONS entry "Owner action needed" — owner creates Google Ads and Microsoft Advertising accounts and sends the Google Ads tag ID + conversion label for "played a game" and the Microsoft UET tag ID. Env: `PUBLIC_GADS_ID`, `PUBLIC_GADS_PLAY_LABEL`, `PUBLIC_UET_ID` (all **empty** in `.env.example`). Empty ID = that tag never loads. Do not start step 2 until the owner answers.
  2. `src/lib/remarketing.ts`: wait for the consent from T6.1's Google CMP (TCF signal). Load Google's `gtag.js` and Microsoft's UET script **only after a positive advertising consent signal**. No signal (for example, a region where the CMP shows no message) = no tags; ask the owner in QUESTIONS if he wants that changed. Never load before consent, never on page load before interaction.
  3. Audience event: on `play_start` (same hook as T9.3) send the Google Ads conversion (`send_to: <ID>/<label>`) and UET `event play_start` — this builds the "played at least 1 game" lists. Nothing else is sent (no game title, no personal data).
  4. Update the `/cookies` and `/privacy` pages: list both tags, what they do, and that they load only after consent. The site stays general-audience, not directed at children (PRD §11).
- Always: mobile-first (360px+); pages readable with JS off (no tags); design tokens; no dark patterns (GROWTH "Not allowed": no trick questions in consent); no invented numbers; `npm run check` passes; check at 360/390/768/1280 (nothing visible changes).
- Done when: on the preview, with consent refused or not given, the Network tab shows no request to Google Ads or Microsoft (bat.bing.com); with consent given both load and fire on `play_start`; Lighthouse TBT and CLS unchanged before consent.
