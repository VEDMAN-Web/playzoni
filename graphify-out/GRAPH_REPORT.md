# Graph Report - playzoni-kit  (2026-11-11)

## Corpus Check
- 77 files · ~42,243 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: (none) 15, .css 2, .example 1)
- WARNING: 21 of 100 files seen (21%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 512 nodes · 771 edges · 34 communities (25 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2bf9c977`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- [slug].astro
- all-games/[...page].astro
- BaseLayout.astro
- [category]/[...page].astro
- Category taxonomy
- Approved tech stack
- make-placeholders.ts
- dependencies
- Player.astro
- scripts
- categories.astro
- tsconfig.json
- T6.1 AdSense and consent
- package.json
- Phase 0 setup and SEO research
- README install and run guide
- sitemap-check.ts
- START-HERE build chat setup guide
- Start message for the build agent
- eslint.config.mjs
- car-games.md
- repository
- content.ts
- [category]/[...page].astro
- index.astro
- categories.astro
- published.ts
- Playzoni Phase 3 SEO audit — 11 Nov 2026
- providers.ts
- JsonLd.astro
- 2026-11-11-t3.4-lighthouse.md

## God Nodes (most connected - your core abstractions)
1. `getPublishedGames()` - 20 edges
2. `validateContent()` - 14 edges
3. `scripts` - 12 edges
4. `pageCount()` - 9 edges
5. `Approved tech stack` - 8 edges
6. `publishedCategoriesFrom()` - 7 edges
7. `astro` - 6 edges
8. `parseFrontmatter()` - 6 edges
9. `SITE_URL` - 6 edges
10. `Category taxonomy` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Approved tech stack` --references--> `tailwindcss`  [EXTRACTED]
  docs/PRD.md → package.json
- `Sample game placeholder page` --references--> `Colour tokens`  [INFERRED]
  public/sample-game.html → docs/DESIGN.md
- `Never rules` --references--> `Approved tech stack`  [EXTRACTED]
  CLAUDE.md → docs/PRD.md
- `Never rules` --conceptually_related_to--> `Poki reference findings`  [INFERRED]
  CLAUDE.md → docs/SEO-PLAN.md
- `One-task procedure` --references--> `R4 spacing token names`  [EXTRACTED]
  CLAUDE.md → docs/REVIEW.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Approved tech stack** — docs_prd_astro, ref_tailwindcss, docs_prd_nunito_font, docs_prd_pagefind, docs_prd_sharp, docs_prd_cloudflare_pages [EXTRACTED 1.00]
- **Tasks marked model sonnet** — docs_tasks_t2_5_player, docs_tasks_t3_3_validator, docs_tasks_t4_1_normalizer, docs_tasks_t4_2_gd_adapter [EXTRACTED 1.00]
- **Content quality gate** — docs_seo_plan_content_rules, docs_seo_plan_qa_notes, docs_seo_plan_validate_checks, docs_tasks_t3_3_validator [INFERRED 0.85]

## Communities (34 total, 9 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @astrojs/check@^0.9.12, eslint@^10.14.0, pagefind@^1.6.0, prettier@^3.9.10, prettier-plugin-astro@^1.1.2, tsx@^4.23.15, typescript@^6.0.3 (+7 more)

### Community 1 - "[slug].astro"
Cohesion: 0.10
Nodes (17): RelatableGame, relatedGames(), breadcrumbLd, chips, countOf(), crumbs, getStaticPaths(), jsonLd (+9 more)

### Community 2 - "all-games/[...page].astro"
Cohesion: 0.07
Nodes (29): cat, t20, t45, t70, crumbs, items, jsonLd, Props (+21 more)

### Community 3 - "BaseLayout.astro"
Cohesion: 0.07
Nodes (15): desktop, Props, reduceMotion, backdrop, closeBtn, input, openBtn, panel (+7 more)

### Community 4 - "[category]/[...page].astro"
Cohesion: 0.12
Nodes (20): astro, categories, collections, games, filterPublishedGames(), GameFlags, getPublishedGames(), pageCount() (+12 more)

### Community 5 - "Category taxonomy"
Cohesion: 0.10
Nodes (17): Category data model, Folder structure, Game data model, Game source provider adapters, Q2 game provider publisher accounts, Q1 unblocked games target, QA notes file (data/qa), JSON-LD schema rules (+9 more)

### Community 6 - "Approved tech stack"
Cohesion: 0.05
Nodes (42): Playzoni project, Vedant Paliwal (owner), Brand and logo, Colour tokens, GameTile component, GameGrid mosaic and uniform modes, Header design, Player design (+34 more)

### Community 7 - "make-placeholders.ts"
Cohesion: 0.11
Nodes (23): sharp@^0.35.5, sharp, brand, FONT_FILE, iconSvg, logoSvg(), main(), PUBLIC (+15 more)

### Community 8 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, astro@^7.4.8, @astrojs/sitemap@^3.7.4, @fontsource-variable/nunito@^5.3.0, tailwindcss@^4.3.5, @tailwindcss/vite@^4.3.5, @astrojs/sitemap, @fontsource-variable/nunito (+2 more)

### Community 9 - "Player.astro"
Cohesion: 0.11
Nodes (29): closeOverlay(), openOverlay(), paintFeedback(), Props, root, share(), showToast(), startGame() (+21 more)

### Community 10 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, check, dev, headers, headers:check, icons, lint (+4 more)

### Community 11 - "categories.astro"
Cohesion: 0.14
Nodes (9): Props, GridCategory, GridGame, LARGE_SLOTS, MEDIUM_SLOTS, Placed, placed, Props (+1 more)

### Community 12 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): astro/tsconfigs/strict, exclude, extends, include

### Community 13 - "T6.1 AdSense and consent"
Cohesion: 0.50
Nodes (4): Ads plan (Phase 4), Q4 legal page text, Phase 6 ads, T6.1 AdSense and consent

### Community 14 - "package.json"
Cohesion: 0.18
Nodes (10): bugs, url, description, directories, doc, homepage, name, private (+2 more)

### Community 18 - "sitemap-check.ts"
Cohesion: 0.05
Nodes (28): gamesDir, gameUpdated, built, check, domains, frameSrc, OUT, providers (+20 more)

### Community 21 - "eslint.config.mjs"
Cohesion: 0.29
Nodes (6): @eslint/js@^10.0.1, eslint-plugin-astro@^3.2.1, typescript-eslint@^8.72.2, @eslint/js, eslint-plugin-astro, typescript-eslint

### Community 22 - "car-games.md"
Cohesion: 0.29
Nodes (6): Car Games on Playzoni, Driving games, Parking games, Playing car games on mobile, Top car games to start with, Types of car games

### Community 23 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

### Community 24 - "content.ts"
Cohesion: 0.09
Nodes (38): asList(), asObject(), asString(), mdFiles(), QA_KEYS, validateContent(), decode(), DIST (+30 more)

### Community 25 - "[category]/[...page].astro"
Cohesion: 0.11
Nodes (14): breadcrumbLd, children, collectionLd, crumbs, entry, gameItems, itemListLd, jsonLd (+6 more)

### Community 26 - "index.astro"
Cohesion: 0.12
Nodes (18): badgeFor(), browseItems, byNew, byPopularity, categoryRows, firstSentence(), gameItem(), hotSlugs (+10 more)

### Community 27 - "categories.astro"
Cohesion: 0.19
Nodes (10): popular, year, GridItem, countGamesIn(), getPublishedCategories(), publishedCategoriesFrom(), crumbs, items (+2 more)

### Community 28 - "published.ts"
Cohesion: 0.32
Nodes (5): categories, Category, categorySchema, HasCategories, MIN_PUBLISHED_GAMES

### Community 29 - "Playzoni Phase 3 SEO audit — 11 Nov 2026"
Cohesion: 0.33
Nodes (5): Checks run, Findings, Playzoni Phase 3 SEO audit — 11 Nov 2026, Summary, What was not covered

## Knowledge Gaps
- **27 isolated node(s):** `astro/tsconfigs/strict`, `Ads plan (Phase 4)`, `Q4 legal page text`, `Phase 6 ads`, `Phase 0 setup and SEO research` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 268 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Approved tech stack` connect `Approved tech stack` to `dependencies`, `Category taxonomy`?**
  _High betweenness centrality (0.223) - this node is a cross-community bridge._
- **What connects `astro/tsconfigs/strict`, `Ads plan (Phase 4)`, `Q4 legal page text` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `tailwindcss` connect `dependencies` to `Approved tech stack`, `package.json`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Should `[slug].astro` be split into smaller, more focused modules?**
  _Cohesion score 0.09956709956709957 - nodes in this community are weakly interconnected._
- **Why does `@fontsource-variable/nunito` connect `dependencies` to `BaseLayout.astro`, `package.json`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Should `all-games/[...page].astro` be split into smaller, more focused modules?**
  _Cohesion score 0.06553911205073996 - nodes in this community are weakly interconnected._