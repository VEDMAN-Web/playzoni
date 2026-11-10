# Graph Report - playzoni-kit  (2026-11-10)

## Corpus Check
- 28 files · ~19,299 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 228 nodes · 280 edges · 21 communities (14 shown, 7 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Npm and Build Config
- Design Tokens and Visual Rules
- SEO Helper Tests
- Category Data and Nav
- Product Stack and Hosting
- Data Model and Sources
- Agent Rules and Procedure
- Sample Game Generator
- Astro Config Dependencies
- Icon and Logo Generator
- npm Scripts
- Font and Base Layout
- TypeScript Config
- Ads and Legal Tasks
- JSON-LD Component
- Phase 0 Setup
- README
- Setup Guide
- Build Agent Start Message

## God Nodes (most connected - your core abstractions)
1. `scripts` - 9 edges
2. `Approved tech stack` - 8 edges
3. `Category taxonomy` - 6 edges
4. `Q7 five doc conflicts` - 6 edges
5. `pad()` - 5 edges
6. `One-task procedure` - 5 edges
7. `Game data model` - 5 edges
8. `astro` - 4 edges
9. `sharp` - 4 edges
10. `gameMarkdown()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Approved tech stack` --references--> `tailwindcss`  [EXTRACTED]
  docs/PRD.md → package.json
- `One-task procedure` --references--> `R4 spacing token names`  [EXTRACTED]
  CLAUDE.md → docs/REVIEW.md
- `Never rules` --references--> `Helpful content golden rules`  [EXTRACTED]
  CLAUDE.md → docs/SEO-PLAN.md
- `Never rules` --conceptually_related_to--> `Poki reference findings`  [INFERRED]
  CLAUDE.md → docs/SEO-PLAN.md
- `Always rules` --references--> `Colour tokens`  [EXTRACTED]
  CLAUDE.md → docs/DESIGN.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Approved tech stack** — docs_prd_astro, ref_tailwindcss, docs_prd_nunito_font, docs_prd_pagefind, docs_prd_sharp, docs_prd_cloudflare_pages [EXTRACTED 1.00]
- **Tasks marked model sonnet** — docs_tasks_t2_5_player, docs_tasks_t3_3_validator, docs_tasks_t4_1_normalizer, docs_tasks_t4_2_gd_adapter [EXTRACTED 1.00]
- **Content quality gate** — docs_seo_plan_content_rules, docs_seo_plan_qa_notes, docs_seo_plan_validate_checks, docs_tasks_t3_3_validator [INFERRED 0.85]

## Communities (21 total, 7 thin omitted)

### Community 0 - "Npm and Build Config"
Cohesion: 0.07
Nodes (34): bugs, url, description, devDependencies, @astrojs/check@^0.9.12, eslint@^10.14.0, @eslint/js@^10.0.1, eslint-plugin-astro@^3.2.1 (+26 more)

### Community 1 - "Design Tokens and Visual Rules"
Cohesion: 0.10
Nodes (22): Colour tokens, GameTile component, GameGrid mosaic and uniform modes, Header design, Player design, Game page layout, Header and footer, Home page layout (+14 more)

### Community 2 - "SEO Helper Tests"
Cohesion: 0.13
Nodes (17): cat, t20, t45, t70, canonical, image, Props, assertDescription() (+9 more)

### Community 3 - "Category Data and Nav"
Cohesion: 0.11
Nodes (13): navItems, Props, popular, year, counts, Props, closeBtn, input (+5 more)

### Community 4 - "Product Stack and Hosting"
Cohesion: 0.12
Nodes (13): Brand and logo, Type scale, Astro framework, Cloudflare Pages hosting, Nunito variable font, Pagefind search, sharp image library, Approved tech stack (+5 more)

### Community 5 - "Data Model and Sources"
Cohesion: 0.14
Nodes (16): Category data model, Folder structure, Game data model, Game source provider adapters, Q2 game provider publisher accounts, QA notes file (data/qa), JSON-LD schema rules, Title and meta description templates (+8 more)

### Community 6 - "Agent Rules and Procedure"
Cohesion: 0.14
Nodes (10): Playzoni project, Vedant Paliwal (owner), Space, radius and shadow scale, R4 spacing token names, R2 and R5 STATUS duplicate heading fix, SEO KPIs, Performance budget, Current build state (Phase 1 done, next T2.1) (+2 more)

### Community 7 - "Sample Game Generator"
Cohesion: 0.23
Nodes (13): ASPECTS, categoriesFor(), EXTRA_CATEGORIES, gameMarkdown(), GAMES_DIR, main(), pad(), PALETTE (+5 more)

### Community 8 - "Astro Config Dependencies"
Cohesion: 0.18
Nodes (10): dependencies, astro@^7.4.8, @astrojs/sitemap@^3.7.4, @tailwindcss/vite@^4.3.5, astro, @astrojs/sitemap, @tailwindcss/vite, categories (+2 more)

### Community 9 - "Icon and Logo Generator"
Cohesion: 0.22
Nodes (8): brand, FONT_FILE, iconSvg, logoSvg(), main(), PUBLIC, ROOT, socialSvg()

### Community 10 - "npm Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, dev, icons, lint, placeholders, preview (+1 more)

### Community 11 - "Font and Base Layout"
Cohesion: 0.29
Nodes (3): @fontsource-variable/nunito@^5.3.0, @fontsource-variable/nunito, Props

### Community 12 - "TypeScript Config"
Cohesion: 0.40
Nodes (4): astro/tsconfigs/strict, exclude, extends, include

### Community 13 - "Ads and Legal Tasks"
Cohesion: 0.50
Nodes (4): Ads plan (Phase 4), Q4 legal page text, Phase 6 ads, T6.1 AdSense and consent

## Knowledge Gaps
- **27 isolated node(s):** `astro/tsconfigs/strict`, `START-HERE build chat setup guide`, `README install and run guide`, `Start message for the build agent`, `Vedant Paliwal (owner)` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 101 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Approved tech stack` connect `Product Stack and Hosting` to `Design Tokens and Visual Rules`?**
  _High betweenness centrality (0.411) - this node is a cross-community bridge._
- **What connects `astro/tsconfigs/strict`, `START-HERE build chat setup guide`, `README install and run guide` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Npm and Build Config` be split into smaller, more focused modules?**
  _Cohesion score 0.0746031746031746 - nodes in this community are weakly interconnected._
- **Why does `tailwindcss` connect `Product Stack and Hosting` to `Npm and Build Config`?**
  _High betweenness centrality (0.384) - this node is a cross-community bridge._
- **Should `Design Tokens and Visual Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `@fontsource-variable/nunito` connect `Font and Base Layout` to `Npm and Build Config`?**
  _High betweenness centrality (0.287) - this node is a cross-community bridge._
- **Should `SEO Helper Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.12681159420289856 - nodes in this community are weakly interconnected._