# Playzoni — review notes

Written by the reviewer (senior planning chat) or Vedant after checking pushed work.
Build agent: at the start of every session fix every `open` item first (one commit per item, message `R<n>: <title>`), then set it to `fixed` with the commit id. Do not argue in code — if you disagree, add a QUESTIONS entry.

| # | Date | Task | Problem | Fix wanted | Status |
|---|---|---|---|---|---|
| R1 | 10 Nov 2026 | T0.1 | `package.json` has `"type": "commonjs"`; Astro projects should be ES modules | Set `"type": "module"`, run `npm run check`, fix anything it breaks | fixed in 8dd6730 (`npm run check` passes) |
| R2 | 10 Nov 2026 | T0.2 | `STATUS.md` has the "Log (newest first)" heading and table header twice | Keep one heading + one table header above the rows | fixed in 3bb7042 (one heading, one table header) |
| R3 | 10 Nov 2026 | — | Planner pushed doc fixes for Q7 and Q8 to `dev` | Run `git pull --rebase origin dev` before your next task (now rule 0 in CLAUDE.md). Nothing else to change | fixed (rebased onto e25ba02 before T1.1 push) |
