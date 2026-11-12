# RELAY 2: afternoon sprint with parallel Haiku agents (12 Nov 2026, written by the planner)

The overnight plan (RELAY 1: R1 to R7, R50, R51) is finished and merged into `main`. This sprint adds three features that need nothing from Vedant. All times are India time (IST).

## How to run it (build chat)
- Model: **Haiku** for you and for every agent (owner decision). Do the tasks marked `sonnet` too.
- Start with `git pull --rebase origin dev`, then read `docs/REVIEW.md` and fix any `open` row except R43.
- Run the agents in **two waves**. Agents in the same wave work at the same time, so each one touches only its own files (listed below).
- **Only you (the main chat) edit `docs/STATUS.md` and `docs/TASKS.md`, and only you commit and push.** Agents edit code files only and report back what they changed and how they tested it.
- After each agent finishes: run `npm run check`, commit that task alone (`T9.x: <title>`), and push to `dev`. If the check fails, fix it or send the agent back once; if it still fails, write it in QUESTIONS, revert that task's files and go on.
- Rules for every agent: give each one the task text from `docs/TASKS.md` plus the rules below.
  - Mobile first: check at 360, 390, 768 and 1280. Nothing overflows or is cut off, tap targets are 44px or more, and there is no layout shift (CLS under 0.05).
  - Design tokens only. Pages must stay readable with JS off.
  - No new dependencies, no long dashes (— or –), no invented numbers, no dark patterns.
  - Never push or merge to `main`.

## Wave 1 (start now, two agents at the same time; done by 17:30)
| Agent | Task | Files it may touch |
|---|---|---|
| A | **T9.5 Game of the day** (TASKS.md). One L tile after the featured tiles with a "Game of the day" pill; picks from published games; the build embeds 14 days of picks and a tiny script swaps to today's (no layout shift). | `src/lib/game-of-day.ts` (new), `src/pages/index.astro` (only the mosaic items), a small test in `scripts/` |
| B | **T9.1 Installable app** (TASKS.md). Manifest `id` and maskable 512px icon; `src/lib/install.ts`; service worker **only if** Chrome says it is needed, and then with no caching. | `public/site.webmanifest`, `public/icon-maskable-512.png` (new), `src/lib/install.ts` (new), `public/sw.js` only if needed, the one line that loads them in `src/layouts/BaseLayout.astro` |

## Wave 2 (after wave 1 is pushed; done by 18:30)
| Agent | Task | Files it may touch |
|---|---|---|
| C | **T9.6 "Because you played X"** (TASKS.md). Client-side row after "Recently played"; candidates by the same order as `related.ts`; local history only; the row is absent with JS off and for new visitors. | `src/components/BecauseYouPlayed.astro` (new), `src/pages/games-index.json.ts` (only if `c`/`t` fields are missing), `src/pages/index.astro` (one line) |
| D | **Full check** after C is merged: `npm run check` and `npm run e2e` (needs `npm run preview` of a build with `PUBLIC_INCLUDE_DRAFTS=true` in another terminal). Fix whatever fails that belongs to waves 1 and 2. Report in `docs/seo-reports/2026-11-12-e2e.md`. | Any file the failing check points to |

## Finish (by 19:00)
- Mark T9.1, T9.5, T9.6 `done` in TASKS, add one STATUS row per task.
- Add a short "SPRINT 2 READY" block at the top of STATUS: commit hash, checks run, anything left.
- Stop. The planner reviews and merges `dev` into `main` (Vedant's go-ahead covers it).

## Not in this sprint (do not start)
- Full game pages for the 95 quick games: waiting for Vedant's decision.
- Languages (Phase 8), accounts (Phase 7), ads (Phases 6 and 11), push (T9.9), hover previews (T5.9, on hold).
- Anything that needs an account, key, payment or DNS.
