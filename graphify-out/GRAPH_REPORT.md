# Graph Report - playzoni-kit  (2026-11-10)

## Corpus Check
- 66 files · ~36,176 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 13, .css 2, .example 1)

## Summary
- 414 nodes · 622 edges · 24 communities (18 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c93558c2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- [slug].astro
- all-games/[...page].astro
- index.astro
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
- START-HERE build chat setup guide
- Start message for the build agent
- eslint.config.mjs
- car-games.md
- repository

## God Nodes (most connected - your core abstractions)
1. `getPublishedGames()` - 20 edges
2. `scripts` - 10 edges
3. `pageCount()` - 9 edges
4. `Approved tech stack` - 8 edges
5. `publishedCategoriesFrom()` - 7 edges
6. `astro` - 6 edges
7. `SITE_URL` - 6 edges
8. `Q7 five doc conflicts` - 6 edges
9. `Category taxonomy` - 6 edges
10. `pad()` - 5 edges

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

## Communities (24 total, 6 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @astrojs/check@^0.9.12, eslint@^10.14.0, pagefind@^1.6.0, prettier@^3.9.10, prettier-plugin-astro@^1.1.2, sharp@^0.35.5, tsx@^4.23.15 (+7 more)

### Community 1 - "[slug].astro"
Cohesion: 0.06
Nodes (29): backdrop, closeBtn, input, openBtn, panel, published, categories, Category (+21 more)

### Community 2 - "all-games/[...page].astro"
Cohesion: 0.06
Nodes (32): cat, t20, t45, t70, crumbs, items, jsonLd, Props (+24 more)

### Community 3 - "index.astro"
Cohesion: 0.06
Nodes (27): popular, year, desktop, Props, reduceMotion, Props, Props, popular (+19 more)

### Community 4 - "[category]/[...page].astro"
Cohesion: 0.08
Nodes (31): filterPublishedGames(), GameFlags, getPublishedGames(), pageCount(), PER_PAGE, getStaticPaths(), breadcrumbLd, children (+23 more)

### Community 5 - "Category taxonomy"
Cohesion: 0.07
Nodes (29): Header design, Category data model, Folder structure, Game data model, Header and footer, Game source provider adapters, Q8 keyword and search-results tool decision, Q2 game provider publisher accounts (+21 more)

### Community 6 - "Approved tech stack"
Cohesion: 0.06
Nodes (32): Playzoni project, Vedant Paliwal (owner), Brand and logo, Colour tokens, GameTile component, GameGrid mosaic and uniform modes, Player design, Space, radius and shadow scale (+24 more)

### Community 7 - "make-placeholders.ts"
Cohesion: 0.12
Nodes (21): brand, FONT_FILE, iconSvg, logoSvg(), main(), PUBLIC, ROOT, socialSvg() (+13 more)

### Community 8 - "dependencies"
Cohesion: 0.15
Nodes (12): dependencies, astro@^7.4.8, @astrojs/sitemap@^3.7.4, @fontsource-variable/nunito@^5.3.0, @tailwindcss/vite@^4.3.5, astro, @astrojs/sitemap, @fontsource-variable/nunito (+4 more)

### Community 9 - "Player.astro"
Cohesion: 0.11
Nodes (29): closeOverlay(), openOverlay(), paintFeedback(), Props, root, share(), showToast(), startGame() (+21 more)

### Community 10 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check, dev, icons, lint, placeholders, postbuild (+2 more)

### Community 11 - "categories.astro"
Cohesion: 0.10
Nodes (15): Props, GridCategory, GridGame, GridItem, LARGE_SLOTS, MEDIUM_SLOTS, Placed, placed (+7 more)

### Community 12 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): astro/tsconfigs/strict, exclude, extends, include

### Community 13 - "T6.1 AdSense and consent"
Cohesion: 0.50
Nodes (4): Ads plan (Phase 4), Q4 legal page text, Phase 6 ads, T6.1 AdSense and consent

### Community 14 - "package.json"
Cohesion: 0.15
Nodes (12): bugs, url, description, typescript@^6.0.3, directories, doc, homepage, name (+4 more)

### Community 21 - "eslint.config.mjs"
Cohesion: 0.29
Nodes (6): @eslint/js@^10.0.1, eslint-plugin-astro@^3.2.1, typescript-eslint@^8.72.2, @eslint/js, eslint-plugin-astro, typescript-eslint

### Community 22 - "car-games.md"
Cohesion: 0.29
Nodes (6): Car Games on Playzoni, Driving games, Parking games, Playing car games on mobile, Top car games to start with, Types of car games

### Community 23 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

## Knowledge Gaps
- **27 isolated node(s):** `astro/tsconfigs/strict`, `Bounce ball mechanic`, `Internal linking rules`, `T0.3 category keyword data (skipped)`, `Phase 1 foundation` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 212 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@fontsource-variable/nunito` connect `dependencies` to `index.astro`, `package.json`?**
  _High betweenness centrality (0.285) - this node is a cross-community bridge._
- **What connects `astro/tsconfigs/strict`, `Bounce ball mechanic`, `Internal linking rules` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `Approved tech stack` connect `Approved tech stack` to `Category taxonomy`?**
  _High betweenness centrality (0.274) - this node is a cross-community bridge._
- **Should `[slug].astro` be split into smaller, more focused modules?**
  _Cohesion score 0.05975609756097561 - nodes in this community are weakly interconnected._
- **Why does `tailwindcss` connect `Approved tech stack` to `package.json`?**
  _High betweenness centrality (0.268) - this node is a cross-community bridge._
- **Should `all-games/[...page].astro` be split into smaller, more focused modules?**
  _Cohesion score 0.06028368794326241 - nodes in this community are weakly interconnected._