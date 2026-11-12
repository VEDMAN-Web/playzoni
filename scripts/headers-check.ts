// Builds public/_headers from src/lib/providers.ts, so the CSP frame-src always matches the providers list.
// Run by `npm run headers`. The result is committed; `npm run check` runs `headers:check` to fail if it is stale.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const TEMPLATE = join(ROOT, 'scripts', '_headers.template');
const OUT = join(ROOT, 'public', '_headers');

// Providers are read from the TypeScript source with a simple pattern, so this script needs no bundler.
const providers = readFileSync(join(ROOT, 'src', 'lib', 'providers.ts'), 'utf8');
const domains = [...providers.matchAll(/frameDomains:\s*\[([^\]]*)\]/g)]
  .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]))
  .map((d) => `https://${d}`);

const frameSrc = ["'self'", ...domains].join(' ');
const built = readFileSync(TEMPLATE, 'utf8').replace('__FRAME_SRC__', frameSrc);
const check = process.argv.includes('--check');
if (check) {
  if (readFileSync(OUT, 'utf8') !== built) {
    console.error('headers-check: public/_headers is out of date. Run `npm run headers`.');
    process.exit(1);
  }
  console.log('headers-check: ok');
} else {
  writeFileSync(OUT, built, 'utf8');
  console.log('headers: wrote public/_headers (frame-src: ' + frameSrc + ')');
}
