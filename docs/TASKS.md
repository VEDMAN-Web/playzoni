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
- status: todo · deps: T2.1 · model: haiku · docs: PRD §5, SEO-PLAN §Templates §Internal linking
- Do: `/new-games` (addedDate desc), `/popular-games` (popularity desc) — uniform M grid, 60 per page with pagination; `/all-games` A–Z, 120 per page, letter jump links, small tile + text link per game; `/categories` — tile per published category with game count. Each with short original intro (2–3 sentences) and correct title/meta/canonical.
- Done when: all pages render, pagination self-canonical, 4-width check.

### T2.8 — Search
- status: todo · deps: T2.4 · model: haiku · docs: PRD §5
- Do: Pagefind indexing game pages (title, intro, categories) after build (`postbuild` script). `/search` page (noindex) with Pagefind UI styled with tokens, reading `q` from the URL; no results → message + popular row. Header search submits to it.
- Done when: searching a sample game name finds it; `/search` has noindex; Pagefind JS loads only on `/search`.

### T2.9 — Static pages and 404
- status: todo · deps: T1.5 · model: haiku · docs: PRD §5
- Do: `/about` (original ~300 words: Playzoni by SparkBeta Tech, Surat, India; how games are picked and tested; contact email placeholder `hello@playzoni.com`), `/developers` (how to submit a game: email with link + short description; we review every game), `/contact` (email + mailto button; no form yet), `/privacy`, `/terms`, `/cookies` (heading + "This page is being finalised." + `noindex` until owner text arrives — add Q in QUESTIONS for owner legal text), `404.astro` (message, search box, popular row).
- Done when: all pages render with correct meta; legal pages noindex.

---
## Phase 3 — Technical SEO and quality

### T3.1 — Sitemap and robots
- status: todo · deps: T2.3, T2.4, T2.7 · model: haiku · docs: SEO-PLAN §Technical
- Do: configure sitemap (exclude noindex pages via a shared list in `src/lib/noindex.ts` that pages also use), `lastmod` from `updatedDate`, `public/robots.txt` exactly as §Technical.
- Done when: built sitemap contains every indexable page and no noindex page (script check in validate).

### T3.2 — Headers and redirects
- status: todo · deps: T2.5 · model: haiku · docs: SEO-PLAN §Technical, PRD §10
- Do: `public/_headers` with security headers, cache rules, CSP (`default-src 'self'`; script/style/img/connect for self + Cloudflare analytics; `frame-src 'self'` + provider domains listed in `src/lib/providers.ts`). `public/_redirects` with `/index.html / 301` style basics only.
- Done when: `npx wrangler pages dev dist` (dev-only, via npx) serves pages with headers; sample game still plays (CSP allows it).

### T3.3 — Full content validator
- status: todo · deps: T2.4, T2.3 · model: **sonnet** · docs: SEO-PLAN §Content "Validate checks"
- Do: implement every check in the list in `scripts/validate.ts`, with clear one-line errors (`file: rule: detail`). Samples are exempt from QA-file, word-count and feed-overlap checks only. Link checker runs on `dist/` after build (so `check` runs validate-links after build).
- Done when: a deliberately broken copy of a sample game (in a temp test) fails with the right messages; real build passes.

### T3.4 — Performance pass
- status: todo · deps: T2.2, T2.3, T2.4, T2.8 · model: haiku · docs: SEO-PLAN §Performance
- Do: run Lighthouse mobile on home, `/car-games`, one game page (local preview). Fix only what breaks the budget. Record scores before/after in STATUS.
- Done when: all three pages meet every number in §Performance.

### T3.5 — Phase 3 audit
- status: todo · deps: T3.1–T3.4 · model: haiku
- Do: run the installed SEO skill audit on the local preview (or Cloudflare preview URL if set up); save `docs/seo-reports/<date>-phase3.md`; fix in-scope issues as separate commits `T3.5-fix: …`; run `/graphify .`.
- Done when: report saved; no "critical" issues left open without a QUESTIONS entry.

---
## Phase 4 — Game import pipeline (needs provider publisher accounts — owner)

### T4.1 — Normalizer, thumbnails, og images
- status: todo · deps: T3.3 · model: **sonnet** · docs: PRD §10, SEO-PLAN §Technical
- Do: `scripts/import/normalize.ts`: slugify (unique, collision suffix `-2`), category mapping via `data/category-map.json` (unknown provider categories logged to `data/staging/unmapped.txt`, never guessed), de-duplication by normalised title across sources using `SOURCE_PRIORITY`, thumbnail download → s/m/l WebP + 1200×630 og image (square thumb on cream bg with title text) into `public/thumbs/<slug>/`, staging JSON `data/staging/<source>/<slug>.json` keeping the raw feed description in `feedText`. Download with timeout + 2 retries; skip game on failure and log it.
- Done when: running against `data/sample-feed.json` (create it: 20 fake entries with placeholder image URLs served from `public/` during the test) produces staging files and images.

### T4.2 — GameDistribution adapter
- status: blocked until owner has a GameDistribution publisher account and feed URL (`GD_FEED_URL`) · deps: T4.1 · model: **sonnet**
- Do: `scripts/import/gd.ts` + `npm run import:gd`. Map fields; build `embedUrl` per GameDistribution's current embed documentation (including the referrer parameter set to the game page URL); mobile flag and aspect from feed.
- Done when: import of the real feed creates staging entries; one game embedded on a draft page plays in the preview.

### T4.3 — GameMonetize adapter
- status: blocked until `GM_FEED_URL` · deps: T4.1 · model: haiku (copy T4.2 structure)
- Done when: same as T4.2 for GameMonetize.

### T4.4 — Playgama Partners adapter
- status: blocked until `PG_FEED_URL` · deps: T4.1 · model: haiku
- Done when: same as T4.2 for Playgama.

### T4.5 — Publish script and launch shortlist
- status: todo · deps: T4.1 · model: haiku · docs: PRD §10, SEO-PLAN §Strategy
- Do: `npm run publish -- --slugs a,b` copies staging → `src/content/games/<slug>.md` as `status: draft` with fields filled from staging, empty text fields. `npm run shortlist`: takes all staging games and writes `docs/seo-research/game-candidates.csv` (`slug,title,source,mobile,categories,providerRank`) sorted by the provider's own popularity order (mobile-ready first). Leave space for a `volume` column; it is filled later by the owner's SEO team from Google Keyword Planner. Owner picks the launch 300 from this file.
- Done when: both commands work on sample staging data.

---
## Phase 5 — Content and launch

### T5.1 — QA guide for the testing team
- status: todo · deps: T4.5 · model: haiku · docs: SEO-PLAN §Content
- Do: `docs/QA-GUIDE.md` in very simple English (team members fill it): how to open a draft game on the preview, what to check on phone and desktop, how to fill `data/qa/<slug>.json` (with one filled example), when to mark a game "reject". Add `npm run qa:new -- <slug>` that creates the empty JSON from the template.
- Done when: guide ≤ 1 page, example valid against a zod schema used by validate.

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
- Do: write `docs/DEPLOY.md` (simple steps for Vedant: connect repo in Cloudflare Pages, build command `npm run build`, output `dist`, env vars, production branch `main`, preview branch `dev`; add domain playzoni.com; www → apex redirect rule). Put the steps in QUESTIONS as "Owner action needed". After owner confirms, verify preview URL works and record it in STATUS.
- Done when: preview URL from `dev` loads; production waits for Vedant's merge.

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
