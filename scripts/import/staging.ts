// Reads the staging files written by the import scripts (data/staging/<source>/<slug>.json).
// Folders whose name starts with "_" (test output such as _sample) are skipped unless asked for.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SOURCE_KEYS, type SourceKey, type StagingGame } from './types';

export interface StagedFile {
  game: StagingGame;
  file: string;
}

export function readStagingGames(stagingRoot: string, includeTestFolders = false): StagedFile[] {
  if (!existsSync(stagingRoot)) return [];
  const found: StagedFile[] = [];
  for (const source of readdirSync(stagingRoot).sort()) {
    const dir = join(stagingRoot, source);
    if (!statSync(dir).isDirectory()) continue;
    if (source.startsWith('_') && !includeTestFolders) continue;
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
      const file = join(dir, name);
      const game = JSON.parse(readFileSync(file, 'utf8')) as StagingGame;
      if (typeof game.slug !== 'string' || game.slug === '') throw new Error(`${file}: no slug`);
      if (!(SOURCE_KEYS as readonly string[]).includes(game.source)) throw new Error(`${file}: unknown source "${game.source}"`);
      found.push({ game, file });
    }
  }
  return found;
}

export function sourceOf(file: StagedFile): SourceKey {
  return file.game.source;
}
