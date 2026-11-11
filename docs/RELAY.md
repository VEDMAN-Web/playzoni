# RELAY: overnight finish plan (12 Nov 2026, written by the planner)

Vedant is asleep and cannot answer, push or merge. You (build chat) work alone until the deadlines below. The planner checks your pushes during the night, runs its own end-to-end test in the cloud, logs problems in `docs/REVIEW.md`, and merges `dev` into `main` when everything passes (Vedant gave that go-ahead on 12 Nov, 02:03).

All times are India time (IST). If a task is not done by its deadline, push what works, write what is left in STATUS, and move on to the next task.

## Rules for tonight
- Before each task: `git pull --rebase origin dev`, then read `docs/REVIEW.md` and fix every `open` row first (the planner adds rows during the night).
- One task = one commit, pushed to `dev` right away. Never push, merge or commit to `main`.
- `npm run check` must pass before every push.
- Every UI change: check at 360, 390, 768, 1280 and 1920 wide. Nothing overflows or is cut off, tap targets are 44px or more, there is no layout shift, and there are no console errors.
- No new dependencies. No long dashes (— or –) in any text. Never invent numbers.
- If something is unclear or blocked, or an error survives 2 attempts: write it in `docs/QUESTIONS.md`, set the task to `blocked`, and go to the next task. Do not wait for an answer.
- **Model: Haiku for the whole night (owner decision, 12 Nov 02:26).** This overrides the CLAUDE.md model note: do the tasks marked `sonnet` too, including R50, R5 and R6. Work in smaller steps, run `npm run check` after each step, and test more. If a step fails twice, write it in QUESTIONS and move on.
- Do not start: T5.9 (hover previews, on hold), Phase 6, 7, 8, 11 or 12 tasks, or anything that needs an account, key or payment.

## Tasks and deadlines

### R1. Hidden from Google until launch (by 03:00): DONE by the planner (12 Nov 03:40)
- Add an env switch `PUBLIC_LAUNCH`. Unless it is exactly `true`, every page gets `<meta name="robots" content="noindex,nofollow">` and `robots.txt` says `Disallow: /`. The sitemap is still built.
- The switch is off by default, so a merge to `main` can never publish an indexable site before the domain is bought. Document it in `docs/PRD.md` (Launch) and `.env.example`.
- Update `scripts/validate-dist.ts` and `scripts/sitemap-check.ts` so they understand this mode (it is not an error when `PUBLIC_LAUNCH` is off).
- Done when: a build without the flag has noindex on every page and a blocking robots.txt; a build with `PUBLIC_LAUNCH=true` is exactly as it is today; `npm run check` passes.

### R2. Production build is clean (by 03:30) = T5.4: DONE (build chat)
- Production builds (no `PUBLIC_INCLUDE_DRAFTS`) contain no sample games, no `/sample-game.html` and no draft pages.
- Make sure `npm run build` without any flags passes `validate-dist`.
- Done when: a plain build has 0 sample pages and 0 draft pages; mark T5.4 done (the "first 300" dependency is dropped by the planner).

### R3. Category texts (by 04:15) = T5.2: DONE (build chat)
- Write `src/content/categories/<slug>.md` for every category that has 12 or more published games. Quick pages count as published.
- Use only published games in the "Top" sections. The text is original: no shared sentences between categories, no feed text.
- Done when: `npm run validate` passes and each text follows SEO-PLAN §Content.

### R4. robots.txt and llms.txt (by 04:30) = T8.8: DONE by the planner
- Use the recommended Q20 answer: allow all search and answer bots; block only `Bytespider` and `CCBot`.
- Add `public/llms.txt`: site name, one-line description, and links to home, categories, new, popular and about.
- This must work together with R1: while `PUBLIC_LAUNCH` is off, robots.txt still disallows everything.

### R5. Full end-to-end test suite (by 06:30): DONE by the planner (04:20; `npm run e2e`, final run 1,249 checks, 0 failures, report docs/seo-reports/2026-11-12-e2e.md)
- Add `npm run e2e` (`scripts/e2e/site.mjs`), using the same Playwright the admin scripts already use. It runs against `npm run preview` of a build with `PUBLIC_INCLUDE_DRAFTS=true`.
- Widths: 360, 390, 768, 1280, 1536, 1920.
- Pages:
  - home; `/categories`; 5 category pages, including page 2 of one;
  - new, popular and all-games, each with page 2;
  - 5 game pages: one published, one quick, one portrait game, one 2-player game and one draft;
  - `/search` and the search panel;
  - favourites and the profile panel;
  - about, contact, developers, privacy, terms and cookies;
  - a 404 page;
  - `/admin` (shell only).
- Checks on every page:
  - no horizontal scroll and no console errors;
  - no broken links (all internal `<a href>` return 200);
  - no broken images;
  - CLS under 0.05;
  - every tap target 44px or more on phones;
  - title, canonical, robots and JSON-LD present;
  - no long dashes in the text.
- Interactions:
  - Play opens the game iframe on desktop and the overlay on phone;
  - endless rows load more when scrolled;
  - Show more games adds rows with no duplicates;
  - fuzzy search finds "tik tak toe" and shows popular games for nonsense;
  - after a play, the played badge appears and "your games" sit at the top of home;
  - favourites add and remove;
  - the game-page background has the game's colours;
  - the profile panel opens and closes;
  - with JS off, home and a game page are still readable.
- Output: `docs/seo-reports/2026-11-12-e2e.md` with a table of page × width × result, and screenshots of failures in `docs/screens/e2e/`.
- Then fix every failure that is in scope and re-run until it reports 0 failures. Anything out of scope goes into QUESTIONS.

### R6. Look-and-feel pass (by 07:45)
- Take screenshots of every page type at 390 and 1280 into `docs/screens/final/`.
- Compare them with DESIGN.md (V2 sections), and fix anything that looks broken, crowded, misaligned or cut off:
  - long names must end in "…";
  - tiles in a grid must line up with their headings;
  - cards must be centred;
  - nothing may overlap the player.
- List what you changed in STATUS.

### R7. Ready for merge (by 08:15)
- Every `open` REVIEW row is fixed, or answered in the row with a reason. The only exceptions are R43 (needs the owner) and anything marked "needs owner".
- `npm run check` and `npm run e2e` pass.
- STATUS starts with a short "READY FOR MERGE" block listing: commit hash, tests run, anything left open.

### After R7: keep watching until 10:00
- Every 20 minutes: pull `dev`, read REVIEW, and fix any new `open` row the planner added. Then push.
- Stop at 10:00 IST, or earlier when REVIEW has no open rows for 1 hour.

## What the planner does
- Checks around 03:30, 05:00, 06:45 and 08:30 IST.
- Pulls dev, runs `npm run check`, runs its own Playwright test on the Cloudflare preview and the Vercel copy, and logs problems as REVIEW rows.
- When R7 is done and its own test passes, merges `dev` into `main`. That builds `playzoni.pages.dev`, still hidden from Google because of R1.
- Writes a morning summary for Vedant.
