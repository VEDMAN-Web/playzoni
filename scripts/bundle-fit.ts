// npm run fit:bundle (R47): builds public/mosaic-fit.js (one small plain script) from src/lib/fit-boot.ts. It runs before
// every build (prebuild), so the file is never stale; it is committed so `npm run dev` works without a build.
// `--check` fails when the committed file is stale.
import { build } from 'esbuild';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'public', 'mosaic-fit.js');
const result = await build({
  entryPoints: [join(ROOT, 'src', 'lib', 'fit-boot.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2019',
  minify: true,
  legalComments: 'none',
  write: false,
});
const code = result.outputFiles[0].text;
if (process.argv.includes('--check')) {
  if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== code) {
    console.error('fit-bundle: public/mosaic-fit.js is out of date. Run `npm run fit:bundle`.');
    process.exit(1);
  }
  console.log('fit-bundle: ok');
} else {
  writeFileSync(OUT, code);
  console.log(`fit-bundle: wrote public/mosaic-fit.js (${code.length} bytes)`);
}
