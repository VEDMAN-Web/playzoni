# Graph Report - playzoni-kit  (2026-11-10)

## Corpus Check
- Corpus is ~10,512 words - fits in a single context window. You may not need a graph.

## Summary
- 143 nodes · 182 edges · 18 communities (11 shown, 7 thin omitted)
- Extraction: 79% EXTRACTED · 18% INFERRED · 3% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Npm and Build Config
- Agent Rules and Design Rules
- Product Scope and Stack
- Categories and Game Sources
- Astro Config Dependencies
- Content Schemas and Templates
- Project Docs Index
- npm Scripts
- Launch, Deploy and Ads Tasks
- TypeScript Config
- Git Remote Config
- Stop-and-Ask Rules
- Brand Spec
- Type Tokens
- SEO KPIs
- Setup Guide

## God Nodes (most connected - your core abstractions)
1. `scripts` - 7 edges
2. `Read order for every session` - 6 edges
3. `Reusable component list` - 6 edges
4. `Always rules (mobile first, static output, tokens, SEO components)` - 5 edges
5. `Start message for the build agent` - 5 edges
6. `GameTile component spec (S 1x1, M 2x2, L 3x3 cells)` - 5 edges
7. `Player and mobile overlay spec` - 5 edges
8. `Technical SEO rules (canonical, robots, sitemap, headers)` - 5 edges
9. `Golden content rules (real play notes, no invented facts, feed text is input only)` - 5 edges
10. `Colour tokens` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Build commands (dev, build, check, validate, import)` --references--> `T0.1 Create repo and project skeleton (done)`  [INFERRED]
  CLAUDE.md → docs/TASKS.md
- `Read order for every session` --references--> `DESIGN design system v1.0`  [EXTRACTED]
  CLAUDE.md → docs/DESIGN.md
- `Read order for every session` --references--> `REVIEW reviewer notes log (currently empty)`  [EXTRACTED]
  CLAUDE.md → docs/REVIEW.md
- `Read order for every session` --references--> `SEO-PLAN analysis and plan v1.0`  [EXTRACTED]
  CLAUDE.md → docs/SEO-PLAN.md
- `Per-task procedure (plan, build, verify, record, commit)` --references--> `STATUS build progress log`  [EXTRACTED]
  CLAUDE.md → docs/STATUS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Game page content pipeline (QA notes to published page)** — docs_seo_plan_qa_notes, docs_seo_plan_game_template, docs_seo_plan_content_rules, docs_seo_plan_validate_checks, docs_tasks_t5_3_game_pages [INFERRED 0.75]
- **Launch readiness gates** — docs_tasks_t3_5_phase3_audit, docs_seo_plan_performance, docs_seo_plan_validate_checks, docs_tasks_t5_5_deploy, docs_seo_plan_launch_checklist [INFERRED 0.75]
- **Four-width UI verification (360, 390, 768, 1280 px)** — claude_task_procedure, docs_design_grid, docs_design_header, docs_design_player, docs_design_accessibility [INFERRED 0.75]

## Communities (18 total, 7 thin omitted)

### Community 0 - "Npm and Build Config"
Cohesion: 0.08
Nodes (31): bugs, url, description, devDependencies, @astrojs/check@^0.9.12, eslint@^10.14.0, @eslint/js@^10.0.1, eslint-plugin-astro@^3.2.1 (+23 more)

### Community 1 - "Agent Rules and Design Rules"
Cohesion: 0.13
Nodes (19): Always rules (mobile first, static output, tokens, SEO components), Owner is non-technical, messages must be short plain English, Colour tokens, Content blocks (text card, FAQ, info table, chips, breadcrumbs), GameTile component spec (S 1x1, M 2x2, L 3x3 cells), GameGrid mosaic pattern (18-tile repeat), Header and category nav spec, Player and mobile overlay spec (+11 more)

### Community 2 - "Product Scope and Stack"
Cohesion: 0.18
Nodes (13): Never rules (no main commits, no invented numbers, no Poki name), Ads plan (AdSense, consent, slot sizes), Repository folder structure, Out of scope for MVP (accounts, comments, leaderboards, own games), Playzoni product definition (free instant browser games, no download or account), Q6 game testers for QA notes (owner action), Poki study findings (structure only, copy no content), Game page markdown template (350-700 words) (+5 more)

### Community 3 - "Categories and Game Sources"
Cohesion: 0.18
Nodes (12): Category data model, Page inventory and URLs, Game source provider adapters and embed rules, Q1 unblocked games target (owner decision), Q2 game provider publisher accounts (owner action), Q5 contact email (hello@playzoni.com placeholder), Category taxonomy and 12-game publishing threshold, Category text template (400-900 words) (+4 more)

### Community 4 - "Astro Config Dependencies"
Cohesion: 0.20
Nodes (11): dependencies, astro@^7.4.8, @astrojs/sitemap@^3.7.4, @fontsource-variable/nunito@^5.3.0, tailwindcss@^4.3.5, @tailwindcss/vite@^4.3.5, astro, @astrojs/sitemap (+3 more)

### Community 5 - "Content Schemas and Templates"
Cohesion: 0.20
Nodes (11): Build commands (dev, build, check, validate, import), CLAUDE.md build agent rules, Game data model (frontmatter fields), Home page section order (mosaic, recently played, rows, categories), JSON-LD schema rules (VideoGame, CollectionPage, no ratings), Title, meta description and heading templates, Validate checks (npm run validate), T1.2 Content schemas, taxonomy and sample data (+3 more)

### Community 6 - "Project Docs Index"
Cohesion: 0.33
Nodes (10): Model note (Haiku vs Sonnet tasks), Read order for every session, DESIGN design system v1.0, PRD product requirements v1.0, REVIEW reviewer notes log (currently empty), SEO-PLAN analysis and plan v1.0, STATUS build progress log, TASKS task list (phases 0 to 6) (+2 more)

### Community 7 - "npm Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, check, dev, lint, preview, validate

### Community 8 - "Launch, Deploy and Ads Tasks"
Cohesion: 0.40
Nodes (5): Q3 domain and Cloudflare setup (owner action), Q4 legal page text (owner action), Launch checklist (Search Console, Bing, IndexNow, social), T5.5 Deploy to Cloudflare Pages, T6.1 AdSense and consent (blocked on approval)

### Community 9 - "TypeScript Config"
Cohesion: 0.40
Nodes (4): astro/tsconfigs/strict, exclude, extends, include

### Community 10 - "Git Remote Config"
Cohesion: 0.67
Nodes (3): repository, type, url

## Ambiguous Edges - Review These
- `GameTile component spec (S 1x1, M 2x2, L 3x3 cells)` → `Home page section order (mosaic, recently played, rows, categories)`  [AMBIGUOUS]
  docs/PRD.md · relation: conceptually_related_to
- `Player and mobile overlay spec` → `T2.6 Recently played, favourites and like/dislike`  [AMBIGUOUS]
  docs/TASKS.md · relation: conceptually_related_to
- `Approved tech stack` → `T0.1 completion log (repo and project skeleton, with deviations)`  [AMBIGUOUS]
  docs/STATUS.md · relation: conceptually_related_to
- `Page inventory and URLs` → `Technical SEO rules (canonical, robots, sitemap, headers)`  [AMBIGUOUS]
  docs/SEO-PLAN.md · relation: conceptually_related_to
- `Header and footer content` → `T1.5 Header, category nav and footer`  [AMBIGUOUS]
  docs/TASKS.md · relation: conceptually_related_to

## Knowledge Gaps
- **24 isolated node(s):** `astro/tsconfigs/strict`, `Stop and ask rule`, `Owner is non-technical, messages must be short plain English`, `START-HERE build chat setup guide`, `Brand and logo spec` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 45 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Always rules (mobile first, static output, tokens, SEO components)` connect `Agent Rules and Design Rules` to `Product Scope and Stack`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `Reusable component list` (e.g. with `Always rules (mobile first, static output, tokens, SEO components)` and `Content blocks (text card, FAQ, info table, chips, breadcrumbs)`) actually correct?**
  _`Reusable component list` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `astro/tsconfigs/strict`, `Stop and ask rule`, `Owner is non-technical, messages must be short plain English` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Npm and Build Config` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `Golden content rules (real play notes, no invented facts, feed text is input only)` connect `Product Scope and Stack` to `Categories and Game Sources`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `GameTile component spec (S 1x1, M 2x2, L 3x3 cells)` and `Home page section order (mosaic, recently played, rows, categories)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Player and mobile overlay spec` and `T2.6 Recently played, favourites and like/dislike`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._