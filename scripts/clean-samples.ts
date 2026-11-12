// Removes the sample game files from dist/ unless samples are included (R2, T5.4): a production build must not ship
// /sample-game.html or /sample-game.js. Runs in postbuild, before validate-dist.
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SAMPLE_FILES = ['sample-game.html', 'sample-game.js'];

export function cleanSamples(dist: string, includeSamples: boolean): string[] {
  if (includeSamples) return [];
  const removed: string[] = [];
  for (const name of SAMPLE_FILES) {
    const file = join(dist, name);
    if (existsSync(file)) {
      rmSync(file);
      removed.push(name);
    }
  }
  return removed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const removed = cleanSamples(join(import.meta.dirname, '..', 'dist'), process.env.PUBLIC_INCLUDE_SAMPLES === 'true');
  console.log(removed.length ? `clean-samples: removed ${removed.join(', ')}` : 'clean-samples: nothing to remove');
}
