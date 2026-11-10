# Playzoni — build status

Updated by the build agent after every task. The reviewer reads this first.

- Last updated: 10 Nov 2026
- Phase: 0 (T0.3 blocked on Q8; Phase 0 not yet finished)
- Preview URL: — (after T5.5)
- Next task: T1.2 (T0.3 still blocked on Q8)

## Current task
(none — T1.1 finished)

## Log (newest first)
| Date | Task | What changed (files) | How verified | Left open |
|---|---|---|---|---|
| 10 Nov 2026 | T1.1 | src/styles/tokens.css (every DESIGN token; type tokens are font shorthands `--t-h1` etc., responsive H1 at 768px, gutter/cell/gap by breakpoint); src/styles/global.css (font import, Tailwind v4 `@theme inline` mapping of colours, spacing, radius, shadow; body base, focus ring, link styles, reduced-motion rule); src/pages/index.astro imports global.css | `npm run check` exit 0 (0 errors, 0 warnings, 0 hints, validate ok, build complete); grep: no hex colour outside tokens.css; every `--name` in DESIGN exists in tokens.css | Tailwind's default `font-sans` utility is not remapped (a self-referencing mapping broke the build and was removed). Body and type tokens use `--font-sans` from tokens.css. No visual check yet (placeholder page; the 4-width check belongs to UI tasks). |
| 10 Nov 2026 | T0.4 | docs/seo-research/serp-snapshot.md (12 tables, 10 rows each) | 12 WebSearch calls, one per nav term; tables built from the returned link lists | Not real Google positions: the tool returns links in its own order and does not confirm US top 10. Research only. Needs a real SERP tool (Q8). |
| 10 Nov 2026 | T0.3 | none | Checked: no keyword tool installed; the "open-seo" package is not on npm | BLOCKED: needs a keyword tool or account decision (Q8). No numbers were invented. |
| 10 Nov 2026 | T0.2 | graphify-out/GRAPH_REPORT.md (committed); graph.json, graph.html, manifest and cost.json kept local (gitignored); docs/QUESTIONS.md Q7 (5 doc conflicts) | `/graphify .`: 16 files, 143 nodes, 182 edges, 18 communities; coverage check OK (all 10 docs read to last line); graph health OK | Token cost shows 0: the docs subagent's usage was not written back, so the real figure is higher (about 183k tokens for that agent). Doc conflicts are open in Q7. |
| 10 Nov 2026 | T0.1 | git repo on `dev` (from origin `main`); package.json, package-lock.json, astro.config.mjs (site, trailingSlash never, static, build.format file, sitemap + Tailwind Vite plugin), tsconfig.json, eslint.config.mjs, src/pages/index.astro (placeholder), scripts/validate.ts (stub), .gitignore, .env.example, README.md (5 lines), folders with .gitkeep | `npm run check` exit 0: astro check 0 errors/0 warnings, lint clean, validate: ok, build complete | Deviations: `astro add` failed (npm allow-scripts policy), so integrations installed by hand. Tailwind uses official `@tailwindcss/vite` (the `@astrojs/tailwind` route is deprecated). `@astrojs/sitemap` added. `@eslint/js` added as a dev dep (needed by eslint config). Installed GitHub CLI via winget at your request. |
