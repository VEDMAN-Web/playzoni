# Playzoni — review notes

Written by the reviewer (senior planning chat) or Vedant after checking pushed work.
Build agent: at the start of every session fix every `open` item first (one commit per item, message `R<n>: <title>`), then set it to `fixed` with the commit id. Do not argue in code — if you disagree, add a QUESTIONS entry.

| # | Date | Task | Problem | Fix wanted | Status |
|---|---|---|---|---|---|
| R1 | 10 Nov 2026 | T0.1 | `package.json` has `"type": "commonjs"`; Astro projects should be ES modules | Set `"type": "module"`, run `npm run check`, fix anything it breaks | fixed in 8dd6730 (`npm run check` passes) |
| R2 | 10 Nov 2026 | T0.2 | `STATUS.md` has the "Log (newest first)" heading and table header twice | Keep one heading + one table header above the rows | fixed in 3bb7042 (one heading, one table header) |
| R3 | 10 Nov 2026 | — | Planner pushed doc fixes for Q7 and Q8 to `dev` | Run `git pull --rebase origin dev` before your next task (now rule 0 in CLAUDE.md). Nothing else to change | fixed (rebased onto e25ba02 before T1.1 push) |
| R4 | 10 Nov 2026 | T1.1 | In `global.css`, `--spacing-1`…`--spacing-8` reuse Tailwind's own number names with different sizes (`p-5` becomes 24px instead of Tailwind's 20px, `p-6` 32px instead of 24px). Later tasks will pick the wrong size by mistake | Rename them `--spacing-s1`…`--spacing-s8` (utilities become `p-s1`…`p-s8`). Use only these for spacing in components. Run `npm run check` | fixed in e14b084 (`.p-s5` builds to `var(--s-5)`; `npm run check` passes) |
| R5 | 10 Nov 2026 | R2 | `STATUS.md` still has "## Log (newest first)" and the table header twice (lines 13–16). Top lines still say T0.3 is blocked, but Q8 is answered: T0.3 is **skipped** | Delete the first duplicate heading + header row. Set Phase to "1" and Next task to the real next task. Do not mention Q8 as blocking | fixed: Phase set to 1, Next task set to T1.2 (in 48ee995). The duplicate heading and header row were already gone (fixed in 3bb7042), so nothing else was deleted |
