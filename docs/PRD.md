# Playzoni — Product Requirements (v1.0, 10 Nov 2026)

Single source of truth for **what** to build. SEO rules are in `SEO-PLAN.md`, look and feel in `DESIGN.md`, order of work in `TASKS.md`.

## 1. What Playzoni is
A free website where anyone can play browser games instantly on phone, tablet or desktop. No download, no account. Games come from third-party game distributors and are embedded in an iframe. We earn from (a) the distributors' revenue share on ads inside games and (b) our own display ads around the game.

Reference model: Poki.com (structure only — see `CLAUDE.md` "Never"). Poki works with about 1,500 curated games, 100M+ monthly players, an ad-only business model, and a category-driven SEO structure. We copy the **pattern**, not the content.

**Launch goal:** 300 curated, working, mobile-tested games with unique pages. Grow by 20–50 games per week. Quality over quantity — never bulk-publish thousands of thin pages.

## 2. Tech stack (approved — do not add anything else without asking)
| Layer | Choice | Why |
|---|---|---|
| Framework | Astro (latest stable, check with `npm view astro version`), TypeScript strict | Static pages, near-zero JS, best Core Web Vitals |
| Styling | Tailwind CSS (latest stable, official Astro integration) | Fast, consistent, tokens via CSS variables |
| Font | `@fontsource-variable/nunito` (self-hosted) | One variable font, no Google Fonts request |
| Content | Astro content collections + zod schemas | Typed game/category data, build fails on bad data |
| Search | Pagefind (`pagefind` devDependency) | Static search index, no server |
| Images | `sharp` (in import script only) | Convert thumbnails to WebP in 3 sizes |
| Sitemap | `@astrojs/sitemap` | Standard |
| Lint/format | ESLint + Prettier (Astro plugins) | Consistency |
| Hosting | Cloudflare Pages (static `dist/`) | Free, unlimited bandwidth, global CDN |
| Analytics | Cloudflare Web Analytics (no cookies); GA4 only behind consent (Phase 4) | Privacy-safe |
| Phase 2 only | Cloudflare Worker + D1 (plays, likes), Keystatic (git-based admin) | Not in MVP |

Approved runtime JS on pages: small vanilla TS islands only (search box, recently played, favourites, like button, player controls). **No React/Vue/Svelte.**

Node: current LTS. Package manager: npm.

## 3. Folder structure
```
/
├─ CLAUDE.md
├─ docs/                 PRD, SEO-PLAN, DESIGN, TASKS, STATUS, QUESTIONS, seo-reports/
├─ data/
│  ├─ categories.json    taxonomy (given in SEO-PLAN §Categories)
│  ├─ staging/           raw imports from feeds (gitignored except .gitkeep)
│  ├─ qa/<slug>.json     human play-test notes (required to publish, see SEO-PLAN §Content)
│  ├─ category-map.json  provider category → our category slugs
│  └─ overrides.json     manual fixes per game (title, categories, hide)
├─ scripts/
│  ├─ import/            one adapter per provider + shared normalize.ts
│  ├─ publish.ts         moves selected staging games into src/content/games
│  └─ validate.ts        content checks (see SEO-PLAN §Content rules)
├─ public/
│  ├─ thumbs/<slug>/{s,m,l}.webp
│  ├─ _headers           security + cache headers (Cloudflare)
│  └─ _redirects
└─ src/
   ├─ content/games/<slug>.md      one file per game
   ├─ content/categories/<slug>.md SEO text shown below each category grid
   ├─ content.config.ts            zod schemas
   ├─ components/  layouts/  pages/  lib/  styles/
```

## 4. Data model

### Game (`src/content/games/<slug>.md` frontmatter)
| Field | Type | Rule |
|---|---|---|
| title | string | Display name, original casing |
| slug | string | lowercase, a–z 0–9 and `-`, unique, never changes after publish |
| source | enum `gd` \| `gm` \| `pg` \| `gp` \| `own` | GameDistribution, GameMonetize, Playgama, GamePix, our own |
| sourceId | string | Provider's game id |
| embedUrl | url | Built by the provider adapter |
| aspect | enum `landscape` \| `portrait` \| `square` | From feed width/height |
| width, height | number | From feed |
| mobile | boolean | Works on touch devices (from feed, confirmed in QA) |
| categories | string[] (1–4) | Category slugs; first = primary (breadcrumb, related) |
| tags | string[] | Optional, free text, lowercase |
| developer | string | From feed; "Unknown" not allowed — hide field if missing |
| releaseDate | date | Optional, from feed |
| addedDate | date | Date we published |
| updatedDate | date | Date page content last changed |
| description | string ≤ 155 chars | Meta description (original text) |
| intro | string 2–3 sentences | Shown under H1 |
| controls | `{ desktop: string, mobile: string }` | Required |
| featured | boolean | Home "hero" tiles |
| popularity | number | Provider order or our ranking; higher = more popular |
| status | enum `draft` \| `published` | Only `published` builds a page |
| faq | `{ q, a }[]` | 2–5 items |

Markdown body = "How to play", "Tips", "Features" sections (see SEO-PLAN §Content templates).

### Category (`data/categories.json`)
`{ slug, name, h1, shortName, parent | null, navOrder | null, description (≤155), intro, emoji? }` plus a markdown file `src/content/categories/<slug>.md` for the SEO text below the grid.

## 5. Pages
| Page | URL | Notes |
|---|---|---|
| Home | `/` | See §6 |
| Game | `/game/<slug>` | See §7 |
| Category | `/<category-slug>` (e.g. `/car-games`) | Grid first, SEO text below; paged `/car-games/2` when > 60 games |
| New games | `/new-games` | Sorted by addedDate desc |
| Popular games | `/popular-games` | Sorted by popularity desc |
| All games A–Z | `/all-games`, `/all-games/2`… | Text list + small tiles, 120 per page; gives every game a crawl path ≤ 3 clicks |
| All categories | `/categories` | Tile per category with game count |
| Search | `/search?q=` | Pagefind UI, `noindex` |
| Favourites | `/favourites` | Client-side list from localStorage + `/games-index.json`, `noindex` |
| About | `/about` | Who we are (SparkBeta Tech), how we test games |
| Contact | `/contact` | Email + simple form (Phase 4: form service) |
| For developers | `/developers` | How to submit a game, email |
| Privacy, Terms, Cookies | `/privacy`, `/terms`, `/cookies` | Text provided by owner; placeholders until then, marked `noindex` until final |
| 404 | `/404` | Search box + popular games |

Phase 3 (later, not MVP): language versions `/hi/`, `/es/`, `/pt/`, `/id/`… with hreflang.

## 6. Home page (top to bottom)
1. Header (see §8).
2. **Mosaic grid**: 60–90 tiles mixing sizes — L (2×2) for featured, M for popular, S for the rest. Dense packing, no gaps (`grid-auto-flow: dense`).
3. "Recently played" row (only if the visitor has history; client-side, localStorage). Hidden otherwise — no layout shift: render it after the mosaic, not above.
4. Rows: Popular games, New games, then one row per top-8 category (15 tiles each + "See all" link).
5. "Browse by category" tile list (all categories).
6. SEO text block (H1 + content from `SEO-PLAN` §Home). The H1 is visually in this block, not at the top.
7. Footer.

## 7. Game page (top to bottom)
1. Header.
2. **Player area**:
   - Before click: thumbnail (L), game title, big "Play" button. No iframe in the HTML.
   - After click: iframe replaces the cover (`src = embedUrl`), sized by `aspect`. Landscape on desktop fills the content width (max 1100px) at 16:9; portrait games are centred with side rails.
   - Bar under the player: game icon + title + developer, Like, Dislike (localStorage only in MVP, no counts shown), Fullscreen, Share (Web Share API, fallback copy link), Report a problem (mailto with game slug).
   - On phones (< 768px): Play opens the game in a full-viewport overlay with a close (×) button; lock body scroll while open.
   - Push the slug to "recently played" when Play is clicked.
3. Desktop (≥ 1280px): left and right rails of related game tiles (S), and one reserved ad slot (300×250) in the right rail. Rails hidden below 1280px.
4. Breadcrumbs: Home › {Primary category} › {Game}.
5. H1 = game title. Intro paragraph.
6. Body sections (How to play, Controls, Tips, Features), FAQ.
7. "About this game" table: Developer, Category, Platforms (Desktop / Mobile), Release date (if known), Added, Last updated.
8. Related categories (chips with game counts).
9. "More games like this" grid: 24 tiles (same primary category first, then shared tags, then popular).
10. Footer.

## 8. Header and footer
- Header (sticky, 64px desktop / 56px mobile): logo (left), search field (desktop) / search icon (mobile, opens overlay), category nav (12 main categories, horizontal scroll on mobile), "Favourites" icon (opens favourites drawer, localStorage).
- Footer: logo + one-line tagline, Popular categories (8 links), All games, New, Popular, About, For developers, Contact, Privacy, Terms, Cookies, © year SparkBeta Tech.

## 9. Components (build these, reuse everywhere)
`BaseLayout`, `Seo`, `JsonLd`, `Header`, `Footer`, `CategoryNav`, `SearchBox`, `GameTile` (S/M/L), `GameGrid` (mosaic + uniform modes), `GameRow` (horizontal scroll with "See all"), `Player`, `PlayerBar`, `Breadcrumbs`, `Faq`, `InfoTable`, `CategoryChip`, `AdSlot` (reserved fixed size, renders nothing until enabled by env flag), `RecentlyPlayed`, `Favourites`, `Pagination`.

## 10. Game sources (provider adapters)
Each adapter in `scripts/import/<source>.ts` exports `fetchGames(): Promise<RawGame[]>` and `toStaging(raw): StagingGame`. Shared `normalize.ts` handles slugs, category mapping (`data/category-map.json`: provider category → our slugs), de-duplication (same title from two providers → keep one, prefer higher revenue share source as set in `.env` order), and thumbnail download (`sharp` → `s` 150px, `m` 300px, `l` 600px square WebP, quality 78).

Feed URLs and keys come from `.env` (owner provides after signing up as a publisher). Until then, build against `data/sample-feed.json` (20 fake games, placeholder images generated locally — no real game names).

`npm run publish -- --slugs a,b,c` copies chosen staging games into `src/content/games/` as `draft`. A human (or the content step) fills the text, then sets `published`.

Embed rules: follow each provider's embed documentation exactly (e.g. GameDistribution requires the referrer URL parameter). iframe attributes: `allow="autoplay; fullscreen; gamepad; clipboard-write"`, `allowfullscreen`, `loading` not set (iframe is only created on click), `title="<Game> game"`. Add each provider's domains to `frame-src` in `public/_headers` CSP.

## 11. Ads (Phase 4)
- Our display ads: Google AdSense first (owner applies). Slots: desktop right rail 300×250, below player 728×90 (desktop) / 320×100 (mobile), category page in-grid every 30 tiles (responsive). Never inside or over the player. Never sticky over content on mobile.
- In-game ads are handled by the providers — we do nothing.
- Consent: use AdSense's own Google-certified CMP ("Privacy & messaging") for EEA/UK/CH. Our site loads AdSense only via `AdSlot` and only when `PUBLIC_ADS_ENABLED=true`.
- Audience: general audience, not directed at children under 13. No child-targeted categories or copy.

## 12. Out of scope for MVP
User accounts, comments, leaderboards, real-time play counts, our own games, multiple languages, blog, admin panel, push notifications, PWA install.
