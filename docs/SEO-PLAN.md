# Playzoni — SEO analysis and plan (v1.0, 10 Nov 2026)

Every rule here is mandatory unless marked "Phase N". Section names are referenced from `TASKS.md`.

## §Findings — what Poki does (studied 10 Nov 2026)
Sources: poki.com home, `/en/car`, `/en/g/drive-mad`, `/robots.txt`.

| Area | What Poki does | What we take |
|---|---|---|
| URLs | `/en/<category>` and `/en/g/<game>`; 34 language folders, one sitemap index each | Short flat URLs. We put the keyword in the URL (`/car-games`, `/game/drive-x`). Languages = Phase 3 |
| Titles | `Drive Mad - Play Online for Free! \| Poki`, `Car Games 🚗 - Play Online for Free! \| Poki` | Same intent pattern, our own wording (§Templates) |
| Meta descriptions | Unique, written by hand, ~150 chars, action words | Same |
| Category page | Grid first (above the fold), then sub-category chips, more games, then 600–900 words: H2 intro, "top games" table, "most played" list, "types of" with H3s, FAQ (4 Qs) | Same order. No invented scores |
| Game page | Player first. Then breadcrumbs, H1 (below player), 2-line intro, "How to play" with Controls, Features (H3s), "About", "Games like X" with links, info table (developer, genre, release, updated, platforms), related categories with counts, more games by developer, FAQ (4 Qs). 900–1,200 words | Same structure, 350–700 words (we must write 300+ pages; quality first) |
| Dates | "Release date" and "Latest update" shown on page | `addedDate`, `updatedDate` shown |
| Robots | `Disallow: /*?` (all query URLs), preview and CDN paths blocked | Same |
| Images | Square tiles in 94/204/314 px, served via image CDN, WebP/AVIF; `og:video` preview clip | 3 WebP sizes from our domain. og:video = not in MVP |
| Home | Mosaic of ~150 tiles, then rows (Popular, New, Play together, categories), then about text with H1 low on the page, "top 5 trending", category descriptions | Same pattern |
| Trust | "65-person team in Amsterdam since 2014", "every game is tested" | `/about` page: real team, real testing process |

Market facts (for planning, not for copy): Poki reports 100M+ monthly players and ~1,500 curated games ([Poki](https://poki.com/), [Poki blog, 25 Jun 2026](https://poki.com/blog/state-of-web-gaming-report-2026)). Car games = ~10% of Poki plays (Poki's own category page). US monthly searches (DataForSEO, Sep 2026, via tech-insider.org): "coolmath games" ~11.1M, "unblocked games" ~5M, "crazygames" ~5M, "poki games" ~1.83M.

## §Strategy — how a new domain wins
Playzoni.com is a brand-new domain with zero authority. Poki, CrazyGames, Coolmath own the head terms. We will **not** rank for "free online games" or "car games" in the first months. Order of attack:

1. **Game-name queries (months 1–6).** People search for a specific game ("<game> online", "<game> play free"). Distributor games appear on hundreds of portals, so we win on: unique useful page text, fast load on phones, the game actually working on mobile. We pick launch games by keyword data (T0.3), not by guess.
2. **Long-tail category queries (months 3–9).** Sub-categories and modifiers: "2 player games one keyboard", "car games for mobile", "bubble shooter free". Each sub-category page is a real page with ≥ 12 games.
3. **Category head terms (months 6–18).** "car games", "io games", "puzzle games". Built up by internal links from hundreds of game pages.
4. **Languages (Phase 3).** Hindi, Spanish, Portuguese, Indonesian first (big casual-game audiences, weaker competition).

Not targeted at launch: "unblocked games" (large volume, but it positions the site as a school-filter bypass and attracts ad and network blocks). Owner decision — see `QUESTIONS.md` Q1.

## §Categories
Main nav (12, in this order): action-games, car-games, puzzle-games, two-player-games, shooting-games, sports-games, io-games, racing-games, adventure-games, skill-games, multiplayer-games, dress-up-games. No "games for girls/boys" categories.

Full taxonomy (`data/categories.json`). `parent` builds breadcrumbs and "related categories". A category is published (in nav, in sitemap, indexable) only when it has **≥ 12 published games**; otherwise its page is built with `noindex` and not linked.

| slug | name | parent |
|---|---|---|
| action-games | Action Games | — |
| adventure-games | Adventure Games | — |
| arcade-games | Arcade Games | — |
| puzzle-games | Puzzle Games | — |
| skill-games | Skill Games | — |
| sports-games | Sports Games | — |
| racing-games | Racing Games | — |
| shooting-games | Shooting Games | — |
| strategy-games | Strategy Games | — |
| simulation-games | Simulation Games | — |
| two-player-games | 2 Player Games | — |
| multiplayer-games | Multiplayer Games | — |
| io-games | .io Games | multiplayer-games |
| car-games | Car Games | racing-games |
| driving-games | Driving Games | car-games |
| parking-games | Parking Games | car-games |
| bike-games | Bike Games | racing-games |
| soccer-games | Soccer Games | sports-games |
| basketball-games | Basketball Games | sports-games |
| fighting-games | Fighting Games | action-games |
| stickman-games | Stickman Games | action-games |
| zombie-games | Zombie Games | shooting-games |
| platform-games | Platform Games | adventure-games |
| obby-games | Obby Games | platform-games |
| match-3-games | Match 3 Games | puzzle-games |
| bubble-shooter-games | Bubble Shooter Games | puzzle-games |
| mahjong-games | Mahjong Games | puzzle-games |
| word-games | Word Games | puzzle-games |
| card-games | Card Games | — |
| solitaire-games | Solitaire Games | card-games |
| board-games | Board Games | strategy-games |
| chess-games | Chess Games | board-games |
| clicker-games | Clicker Games | simulation-games |
| idle-games | Idle Games | simulation-games |
| cooking-games | Cooking Games | simulation-games |
| dress-up-games | Dress Up Games | — |
| horror-games | Horror Games | adventure-games |
| 3d-games | 3D Games | — |

## §URLs (v2, 11 Nov 2026 — Poki-style, with a language folder)
- Base: `https://playzoni.com` (apex). `www` → apex 301 (Cloudflare rule, owner step). No trailing slash.
- Home: `/` (English). Everything else lives under a language folder so Hindi/Spanish/etc. can be added later without changing any URL:
  - Game: `/en/g/<slug>` (e.g. `/en/g/bubble-blast`)
  - Category: `/en/<category-slug>` (e.g. `/en/car-games`), pages `/en/car-games/2`
  - Lists: `/en/new-games`, `/en/popular-games`, `/en/all-games`, `/en/categories`
  - Static: `/en/about`, `/en/developers`, `/en/contact`, `/en/privacy`, `/en/terms`, `/en/cookies`
  - Search `/en/search`, favourites `/en/favourites`
- Old paths (`/game/<slug>`, `/<category>`, `/about`…) are not public yet, so no redirects are needed; just make sure nothing links to them.
- Slugs never change after launch. Lowercase, hyphens, ASCII only.

## §Templates (titles, meta, headings)
Hard limits: title ≤ 60 chars, meta description 120–155 chars, exactly one H1 per page.

| Page | `<title>` | H1 |
|---|---|---|
| Home | `Playzoni — Play Free Online Games Instantly` | `Free Online Games on Playzoni` (in the about block) |
| Game | `{Title} — Play Free Online \| Playzoni`; if > 60: `{Title} \| Playzoni`; if still > 60: `{Title}` | `{Title}` |
| Category | `{Name} — Play Free Online {Name} \| Playzoni`; if > 60: `{Name} — Play Free Online \| Playzoni` | `{Name}` |
| Category page N | `{Name} — Page {N} \| Playzoni` | `{Name} — Page {N}` |
| New / Popular / All | `New Games — Play the Latest Free Games \| Playzoni` / `Popular Games — Most Played Free Games \| Playzoni` / `All Games A–Z \| Playzoni` | page name |
| Static | `{Page} \| Playzoni` | page name |

Meta descriptions: written per page (game: in frontmatter `description`; category: in `categories.json`). Must include the main keyword once, a verb ("Play", "Race", "Match"), and "free" or "no download". No two pages share a description.

## §Schema (JSON-LD, via `JsonLd` component)
- Home: `WebSite` with `SearchAction` (`https://playzoni.com/search?q={search_term_string}`), `Organization` (name Playzoni, url, logo, `parentOrganization` SparkBeta Tech).
- Game: `VideoGame` — name, url, image (l thumb), description, genre (primary category name), `gamePlatform: ["Web browser"]`, `applicationCategory: "Game"`, `operatingSystem: "Any"`, `author` {Organization: developer} if known, `datePublished` = addedDate, `dateModified` = updatedDate, `offers` {price 0, priceCurrency USD, availability InStock}. Plus `BreadcrumbList`, plus `FAQPage`.
- Category: `CollectionPage` + `ItemList` (first 20 games, position + url + name) + `BreadcrumbList` + `FAQPage`.
- **Never** add `aggregateRating` or `review` (we have no real ratings in MVP).
- Validate with schema.org validator rules in `npm run validate` (required fields present, URLs absolute).

## §Technical
- `<link rel="canonical">` absolute, on every page, self-referencing (paginated pages canonical to themselves).
- `robots.txt`: `User-agent: *`, `Allow: /`, `Disallow: /*?`, `Sitemap: https://playzoni.com/sitemap-index.xml`.
- `noindex,follow`: `/search` (not blocked in robots.txt, so Google can see the noindex), empty or < 12-game categories, legal pages while placeholder, 404.
- Sitemap: `@astrojs/sitemap`, exclude noindex pages, `lastmod` from `updatedDate`.
- Open Graph + Twitter card on every page. Game og:image = 1200×630 WebP/PNG generated by the import script (square thumb centred on brand background with title). Category/home og images: one static image each in `public/og/`.
- Images: every `<img>` has `width`, `height`, `alt` (game title), `decoding="async"`; first 6 tiles `loading="eager"` + first one `fetchpriority="high"`, rest `loading="lazy"`.
- Headers (`public/_headers`): HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP with `frame-src` limited to provider domains, `Cache-Control: public, max-age=31536000, immutable` for `/_astro/*` and `/thumbs/*`.
- 404 page returns status 404 (Cloudflare Pages does this for `404.html`).
- HTML `lang="en"`. Phase 3 adds `hreflang`.
- Internal links: plain `<a href>` (crawlable), no JS navigation.

## §Internal linking
- Header category nav on every page (12 links). Footer: 8 popular categories + list pages.
- Game page links: primary category (breadcrumb), up to 6 related categories, 24 related games, developer name links to nothing in MVP.
- Category page links: parent + child categories as chips, all its games (paged, 60 per page), 5 "top picks" in text.
- `/all-games` lists every published game A–Z → every game is ≤ 3 clicks from home.
- Each published game belongs to at least one published category.

## §Content
### Golden rules (Google "helpful content" + "scaled content abuse" safe)
1. Every game page is written from **real play notes** (`data/qa/<slug>.json`, filled by a human tester after playing 3+ minutes on phone and desktop). No QA file → the game cannot be `published`.
2. Feed descriptions are input only. `validate` rejects any 8-word sequence shared with the feed text.
3. No invented facts: no ratings, play counts, "most popular", awards, level counts unless in QA notes.
4. Plain, friendly English, short sentences, second person ("you"). No filler ("In this exciting game…", "Look no further").
5. Never mention Poki or other portals.

### QA notes file (`data/qa/<slug>.json`)
`{ tester, date, worksMobile, worksDesktop, orientation, loadSeconds, controlsDesktop, controlsMobile, goal, threeFacts: [], tips: [], issues: "" }`

### Game page template (markdown body, 350–700 words)
```
## How to play {Title}
(goal in 2–4 sentences, from QA goal)
### Controls
- Desktop: …
- Mobile: …
## Tips for {Title}
(3–5 bullet tips, from QA tips)
## Features
(2–4 short H3 sub-sections from QA threeFacts)
## Games like {Title}
(2 sentences linking 2–3 related published games)
```
Plus frontmatter `intro` (2–3 sentences, what it is + why fun), `description` (meta), `faq` (2–5: e.g. "Can I play {Title} on mobile?", "Is {Title} free?", "How do I …?" — answers from QA).

### Category page template (`src/content/categories/<slug>.md`, 400–900 words, shown below the grid)
```
## {Name} on Playzoni      (what these games are, 2 short paragraphs)
## Top {name} to start with   (5 published games, each linked + one line why)
## Types of {name}         (H3 per child category or sub-style, 2–3 sentences each, link child categories)
## Playing {name} on mobile   (1 paragraph)
## FAQ                     (3–5 Qs)
```

### Validate checks (`npm run validate`, fails the build)
Title/description length; one H1; required sections present; word counts in range; FAQ count; QA file exists for every published game; no 8-word overlap with feed text; no duplicate `description` or `intro` across the site; banned words list (`poki`, `crazygames`, `#1`, `best game ever`, `unblocked` until Q1 is answered); every `categories[]` slug exists; every internal link resolves to a built page.

## §Performance
Budget per page type (home, one category, one game), Lighthouse **mobile**:
- Performance ≥ 95, SEO = 100, Accessibility ≥ 95, Best practices ≥ 95.
- LCP ≤ 2.0 s, CLS ≤ 0.05, TBT ≤ 100 ms.
- Our JS ≤ 25 KB gzipped per page (excludes Pagefind on `/search`, ads, and the game iframe).
- One self-hosted variable font (woff2, preloaded, `font-display: swap`).
- No third-party scripts before user interaction, except Cloudflare Web Analytics.
Run with `npx lighthouse <url> --preset=perf --form-factor=mobile` (or the SEO skill's audit) and save results in the phase report.

## §Launch checklist (Phase 5 — owner + agent)
- [ ] Google Search Console: domain property, submit sitemap (owner verifies via Cloudflare DNS).
- [ ] Bing Webmaster Tools: import from Search Console.
- [ ] IndexNow key file in `public/` and ping on each deploy (Phase 5 task).
- [ ] Social profiles with the same name and logo (YouTube, Instagram, X) linked from footer and `Organization.sameAs`.
- [ ] Submit to 5–10 web-game directories and developer communities (owner team).

## §KPIs (review monthly)
Indexed pages / published pages ≥ 90% · Search Console impressions and clicks trend up month on month · Core Web Vitals "Good" for ≥ 90% of URLs · games that fail on mobile = 0 · Phase 2: plays per visit.
