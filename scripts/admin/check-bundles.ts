// Bundle checks (docs/ADMIN.md §3, §7), run after every build:
// 1. The tracking script (src/lib/track.ts and what it imports), minified, is under 3 KB gzipped.
// 2. No public page (anything outside /admin) loads admin code: the scripts each public page references, and every
//    chunk they import, must not contain the admin API path or the chart library.
import { build } from 'esbuild';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = join(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'dist');
const TRACK_LIMIT = 3 * 1024;
const errors: string[] = [];

const out = await build({
  entryPoints: [join(ROOT, 'src', 'lib', 'track.ts')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  write: false,
});
const gz = gzipSync(out.outputFiles[0].contents).length;
if (gz > TRACK_LIMIT) errors.push(`track.ts is ${gz} bytes gzipped, the limit is ${TRACK_LIMIT}`);

function htmlFiles(dir: string): string[] {
  const list: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) list.push(...htmlFiles(path));
    else if (name.endsWith('.html')) list.push(path);
  }
  return list;
}

// A chunk and every chunk it imports (static or dynamic), as absolute paths.
function closure(file: string, seen: Set<string>): void {
  if (seen.has(file) || !existsSync(file)) return;
  seen.add(file);
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+\.js)["']/g)) {
    const spec = m[1];
    closure(spec.startsWith('/') ? join(DIST, spec) : resolve(dirname(file), spec), seen);
  }
}

const isAdmin = (file: string): boolean => {
  const rel = relative(DIST, file).split(sep).join('/');
  return rel === 'admin.html' || rel.startsWith('admin/');
};

const publicChunks = new Set<string>();
let adminPages = 0;
for (const file of htmlFiles(DIST)) {
  if (isAdmin(file)) {
    adminPages++;
    const page = readFileSync(file, 'utf8');
    if (!page.includes('<meta name="robots" content="noindex,nofollow"')) errors.push(`${relative(DIST, file)} is not noindex,nofollow`);
    if (page.includes('data-pagefind-body')) errors.push(`${relative(DIST, file)} would be in the Pagefind index`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  if (html.includes('/api/admin')) errors.push(`${relative(DIST, file)} mentions /api/admin`);
  for (const m of html.matchAll(/<script[^>]*\ssrc="(\/[^"]+\.js)"/g)) closure(join(DIST, m[1]), publicChunks);
}
for (const chunk of publicChunks) {
  const code = readFileSync(chunk, 'utf8');
  if (code.includes('/api/admin') || /uPlot|uplot/.test(code)) errors.push(`public page loads admin code: ${relative(DIST, chunk)}`);
}

for (const map of readdirSync(DIST).filter((f) => /^sitemap.*\.xml$/.test(f))) {
  if (/\/admin(\/|<)/.test(readFileSync(join(DIST, map), 'utf8'))) errors.push(`${map} lists an admin page`);
}
if (!/^Disallow: \/admin$/m.test(readFileSync(join(ROOT, 'public', 'robots.txt'), 'utf8'))) errors.push('robots.txt must have "Disallow: /admin"');

if (errors.length) {
  for (const e of errors) console.error(`check-bundles: ${e}`);
  process.exit(1);
}
console.log(`check-bundles: ok (track.ts ${gz} B gzipped; ${publicChunks.size} public chunks clean; ${adminPages} admin pages)`);
