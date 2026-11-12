// Small log files in data/staging (unmapped.txt, failed.txt): a line is added once, never twice.

import { appendFileSync, existsSync, readFileSync } from 'node:fs';

export function appendNewLines(file: string, lines: string[]): void {
  const existing = new Set(existsSync(file) ? readFileSync(file, 'utf8').split('\n') : []);
  const fresh = [...new Set(lines)].filter((line) => !existing.has(line));
  if (fresh.length > 0) appendFileSync(file, `${fresh.join('\n')}\n`);
}
