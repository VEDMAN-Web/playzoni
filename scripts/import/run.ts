// Runs one provider's games through the shared normalizer and prints a summary.
// Used by every adapter's `npm run import:<source>` command.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parsePriority } from './dedupe';
import { createImageFetcher, type FetchOptions } from './images';
import { appendNewLines } from './log';
import { normalizeGames } from './normalize';
import { IMPORT_PATHS } from './paths';
import type { AdapterResult, ImportPaths, ImportReport, SourceKey } from './types';

// The first `limit` games in the provider's own order (its top or popular games first); 0 = all.
export function applyLimit(result: AdapterResult, limit: number): AdapterResult {
  return limit === 0 ? result : { ...result, games: result.games.slice(0, limit) };
}

export interface RunOptions {
  source: SourceKey;
  result: AdapterResult;
  paths?: ImportPaths;
  fetchOptions?: Partial<FetchOptions>;
  concurrency?: number;
  log?: (message: string) => void;
}

const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

export async function runImport(options: RunOptions): Promise<ImportReport> {
  const paths = options.paths ?? IMPORT_PATHS;
  mkdirSync(paths.stagingDir, { recursive: true });
  // One line per 100 imported games instead of one per game: a catalog can hold thousands.
  let imported = 0;
  const log = (message: string): void => {
    if (message.startsWith('imported ')) {
      imported++;
      if (imported % 100 === 0) options.log?.(`  ${imported} imported so far`);
      return;
    }
    options.log?.(`  ${message}`);
  };
  const report = await normalizeGames(options.result.games, paths, {
    priority: parsePriority(process.env.SOURCE_PRIORITY),
    fetchImage: createImageFetcher(options.fetchOptions),
    concurrency: options.concurrency,
    log,
  });
  appendNewLines(
    join(paths.stagingDir, 'failed.txt'),
    options.result.skipped.map((s) => `${options.source}\t${s.sourceId}\t${oneLine(s.title)}\t${oneLine(s.reason)}`),
  );
  return report;
}

export function summaryLine(source: SourceKey, adapterSkipped: number, report: ImportReport): string {
  return (
    `import:${source}: ${report.imported.length} imported, ${report.duplicates.length} duplicate, ` +
    `${adapterSkipped} left out by the adapter, ${report.failed.length + report.invalid.length} skipped on picture or checks ` +
    `(data/staging/failed.txt), ${report.unmapped.length} unmapped categories (data/staging/unmapped.txt), ` +
    `${report.withoutCategory.length} without a category`
  );
}
