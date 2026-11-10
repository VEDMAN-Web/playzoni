# Playzoni — rules for the build agent

You are building **playzoni.com**: a free browser-games website in the style of Poki.com (instant play, no download, big tile grid, categories, game pages). Planning was done by a senior model. **Your job is to execute the plan exactly, one small task at a time.** Do not redesign, re-plan or add features.

Owner: Vedant Paliwal (SparkBeta Tech). He is non-technical. Any message you write for him must be short, plain English, one step at a time.

## Read order (every session)
1. This file.
2. `docs/REVIEW.md` — notes from the reviewer (senior model / Vedant). Fix every item marked `open` **before** starting a new task.
3. `docs/STATUS.md` — where the work stands.
4. `docs/TASKS.md` — pick the first task whose status is `todo` and whose dependencies are `done`.
5. Only the sections of `docs/PRD.md`, `docs/SEO-PLAN.md`, `docs/DESIGN.md` that the task names. Do not read whole docs "just in case".
6. If `graphify-out/GRAPH_REPORT.md` exists, read it before searching files.

## How to do one task (follow every step)
0. **Sync**: `git pull --rebase origin dev` (the reviewer also pushes to `dev`). If it conflicts, stop and ask. Then re-read `docs/REVIEW.md` and fix every `open` item before the task — even in the middle of a session. Only mark an item `fixed` after you have checked the change is really in the file.
1. **Plan first** (Karpathy guidelines): write a 3–6 line plan under "Current task" in `docs/STATUS.md`: what you will change, which files, how you will verify. Keep it the simplest thing that meets the acceptance criteria.
2. **Build** only what the task says. Surgical changes. Touch only files the task needs.
3. **Verify**: run `npm run check` (must pass with zero errors). Then check every acceptance criterion in the task, one by one. UI tasks: check at 360px, 390px, 768px and 1280px widths — nothing overflows, nothing is cut off, tap targets ≥ 44px.
4. **Record** in `docs/STATUS.md`: task id, what changed (files), how you verified, anything left open.
5. **Commit and push** to the `dev` branch: message `T<id>: <short title>`. One task = one commit.
6. Mark the task `done` in `docs/TASKS.md`. Move to the next.

## Stop and ask (never guess)
Write the question in `docs/QUESTIONS.md` (format there), set the task to `blocked`, and move to the next task that does not depend on it, when:
- the spec is unclear, missing, or two docs disagree;
- the task needs a decision not written down (a new library, a new page, a new data field, a design change);
- the same error survives 2 fix attempts (paste the exact error);
- something you need is outside the repo (an account, an API key, a feed URL, DNS).

## Never
- Never push, merge or commit to `main`. Only `dev`. Vedant merges after review.
- Never print, log, or commit secrets or `.env` values. Use `.env` (gitignored) + `.env.example` with empty values.
- Never add a dependency that is not in the approved list (`docs/PRD.md` §Tech stack). Ask instead.
- Never use the name "Poki" or its logo, mascot, text, images, game thumbnails, screenshots or code. Copying Poki's layout, page flow and features is intended (see DESIGN.md). Logo, wording and images must be our own.
- Never invent ratings, review counts, play counts, player numbers or awards. Show a number only if real data produces it.
- Never copy a game's description from the provider feed onto the page as-is. Feed text is input only (see `docs/SEO-PLAN.md` §Content).
- Never delete or rewrite files outside the current task. Never "clean up" other code.
- Never hotlink images from other sites at runtime. Thumbnails are downloaded by the import script and served from our own domain.
- Never block the page with ads, popups or the game iframe. The game iframe loads only after the player clicks Play.

## Always
- Mobile first. Every page and component must work and look right on phones (360px+) and desktop.
- Static output (Astro). Pages must be fully readable with JavaScript off, except the game itself.
- Use the design tokens in `docs/DESIGN.md`. No hard-coded colours or font sizes in components.
- Use the SEO components for every page (title, meta, canonical, JSON-LD). No page ships without them.
- Keep the performance budget in `docs/SEO-PLAN.md` §Performance.
- Run `/graphify .` at the end of each phase so the graph stays current.
- At the end of Phase 3 and Phase 5, run the installed SEO skill's audit (Open SEO / claude-seo, whichever is installed) against the preview URL and save the report to `docs/seo-reports/<date>-phase<N>.md`. Fix only issues that are in scope; list the rest in `docs/QUESTIONS.md`.

## Model note
Tasks marked `model: sonnet` in `TASKS.md` are harder. If you are running on Haiku and reach one, stop and write in `STATUS.md`: "Next task T<id> is marked for Sonnet — switch model with /model and say continue." Do not attempt it on Haiku unless Vedant says so.

## Commands (keep these working)
- `npm run dev` — local server
- `npm run build` — static build to `dist/`
- `npm run check` — `astro check` + lint + `npm run validate` + build
- `npm run validate` — content checks (word counts, required sections, required fields, duplicate text)
- `npm run import:<source>` — pull games from a provider feed into `data/staging/`
