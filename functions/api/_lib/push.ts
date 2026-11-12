// Push alert rules (docs/ADMIN.md §5.12, GROWTH tactic 7): at most 2 alerts in any 7 days. Pure, unit-tested.
export const WEEK_MS = 7 * 86400000;
export const MAX_PER_WEEK = 2;

/** True when adding an alert at `t` keeps every 7-day window at 2 alerts or fewer. */
export function pushAllowed(existing: number[], t: number): boolean {
  const all = [...existing, t].sort((a, b) => a - b);
  return all.every((start) => all.filter((x) => x >= start && x < start + WEEK_MS).length <= MAX_PER_WEEK);
}
