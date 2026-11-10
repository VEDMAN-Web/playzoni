// npm run qa:new -- <slug>
// Creates data/qa/<slug>.json from data/qa/_template.json. Never overwrites an existing file.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from '../import/args';

const SLUG = /^[a-z0-9-]+$/;

// Returns the path of the new file. Throws with a plain message when the slug is wrong or the file exists.
export function createQaFile(qaDir: string, slug: string): string {
  if (!SLUG.test(slug)) throw new Error(`"${slug}" is not a valid slug (use a-z, 0-9 and -)`);
  const target = join(qaDir, `${slug}.json`);
  if (existsSync(target)) throw new Error(`${target} already exists; not overwritten`);
  const template = readFileSync(join(qaDir, '_template.json'), 'utf8');
  writeFileSync(target, template, { flag: 'wx' });
  return target;
}

function main(): void {
  const slug = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? parseArgs(process.argv.slice(2)).slug;
  if (!slug) throw new Error('usage: npm run qa:new -- <slug>');
  const file = createQaFile(join(import.meta.dirname, '..', '..', 'data', 'qa'), slug);
  console.log(`qa:new: created ${file}. Fill it in, then run npm run validate.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
