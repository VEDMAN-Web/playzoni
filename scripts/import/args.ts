// Tiny command-line reader for "--name value" pairs (no extra dependency).

// Games taken from one provider in a normal run (docs/REVIEW.md R12). A whole catalogue is thousands of games,
// four pictures each, and takes more than 15 minutes.
export const DEFAULT_LIMIT = 500;

// "--limit 200" -> 200; no flag -> 500; "--limit 0" -> 0, which means every game.
export function parseLimit(value: string | undefined): number {
  if (value === undefined) return DEFAULT_LIMIT;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 0) throw new Error(`--limit must be a whole number, 0 or more (0 = all games), got "${value}"`);
  return limit;
}

export function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    if (!name.startsWith('--')) throw new Error(`unexpected argument "${name}"`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${name} needs a value`);
    args[name.slice(2)] = value;
    i++;
  }
  return args;
}
