// Post-build sitemap check (T3.1). Runs after `astro build` (see package.json postbuild).
// 1. Removes every URL whose built page is noindex from dist/sitemap-0.xml.
// 2. Fails the build (exit 1) unless every indexable page is in the sitemap and no noindex page is.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist');
const SITE = 'https://playzoni.com';
const SITEMAP = join(DIST, 'sitemap-0.xml');

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...htmlFiles(path));
    else if (name.endsWith('.html')) out.push(path);
  }
  return out;
}

// Built file -> the URL path it serves: index.html -> "/", about.html -> "/about", car-games/2.html -> "/car-games/2".
function urlPathFor(file: string): string {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  return '/' + rel.replace(/\.html$/, '').replace(/\/index$/, '');
}

const isNoindex = (html: string): boolean => /<meta name="robots" content="[^"]*noindex/.test(html);

if (!existsSync(SITEMAP)) {
  console.error('sitemap-check: dist/sitemap-0.xml is missing. Run the build first.');
  process.exit(1);
}

const noindexPaths = new Set<string>();
const indexablePaths = new Set<string>();
for (const file of htmlFiles(DIST)) {
  const path = urlPathFor(file);
  if (isNoindex(readFileSync(file, 'utf8'))) noindexPaths.add(path);
  else indexablePaths.add(path);
}

// Remove <url> entries for noindex pages.
let xml = readFileSync(SITEMAP, 'utf8');
let removed = 0;
xml = xml.replace(/<url>[\s\S]*?<\/url>/g, (block) => {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '';
  const path = loc.startsWith(SITE) ? loc.slice(SITE.length) || '/' : loc;
  if (noindexPaths.has(path)) {
    removed++;
    return '';
  }
  return block;
});
writeFileSync(SITEMAP, xml, 'utf8');

// Verify both directions.
const inSitemap = new Set(
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => (m[1].startsWith(SITE) ? m[1].slice(SITE.length) || '/' : m[1])),
);
const missing = [...indexablePaths].filter((p) => !inSitemap.has(p));
const leaked = [...inSitemap].filter((p) => noindexPaths.has(p));

console.log(
  `sitemap-check: ${inSitemap.size} URLs in sitemap, ${removed} noindex URLs removed, ${indexablePaths.size} indexable pages`,
);
if (missing.length > 0 || leaked.length > 0) {
  console.error('sitemap-check FAILED');
  if (missing.length > 0) console.error('  indexable but not in sitemap:', missing.join(', '));
  if (leaked.length > 0) console.error('  noindex but in sitemap:', leaked.join(', '));
  process.exit(1);
}
console.log('sitemap-check: ok');
