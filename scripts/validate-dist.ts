// Post-build page checks (T3.3). Runs after `astro build` (see package.json postbuild).
// Every built page needs: one H1, a title of 60 characters or fewer, a description of 120-155
// characters, an absolute canonical without a trailing slash, no banned words in visible text,
// and internal links that point at a built page or file.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { DESCRIPTION_RANGE, TITLE_MAX, bannedWordsIn } from './validate/rules';

const DIST = join(import.meta.dirname, '..', 'dist');
const SITE = 'https://playzoni.com';
const SKIP_FILES = new Set(['sample-game.html']);

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === 'pagefind') continue;
    if (statSync(path).isDirectory()) out.push(...htmlFiles(path));
    else if (name.endsWith('.html') && !SKIP_FILES.has(name)) out.push(path);
  }
  return out;
}

const decode = (s: string): string =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const visibleText = (html: string): string =>
  decode(
    html
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  );

// A link like "/car-games" is fine when dist has car-games.html, car-games/index.html or that exact file.
function linkResolves(href: string): boolean {
  const path = decodeURI(href.split('#')[0].split('?')[0]);
  if (path === '' || path === '/') return existsSync(join(DIST, 'index.html'));
  if (path.startsWith('/pagefind/')) return true;
  const base = join(DIST, path);
  return existsSync(base + '.html') || existsSync(join(base, 'index.html')) || (existsSync(base) && statSync(base).isFile());
}

const errors: string[] = [];
const pages = htmlFiles(DIST);
for (const file of pages) {
  const rel = relative(DIST, file).split(sep).join('/');
  const html = readFileSync(file, 'utf8');
  // Draft preview pages (PUBLIC_INCLUDE_DRAFTS=true) are marked noindex,nofollow and may be unfinished: not checked.
  if (/name="robots" content="noindex,nofollow"/.test(html)) continue;
  const add = (rule: string, detail: string): void => {
    errors.push(`dist/${rel}: ${rule}: ${detail}`);
  };

  // At most 12 badges on a page (docs/DESIGN.md §V2.2).
  const badgeCount = (html.match(/class="badge /g) ?? []).length;
  if (badgeCount > 12) add('badge-count', `page has ${badgeCount} badges, at most 12`);
  const hotCount = (html.match(/class="badge badge-hot/g) ?? []).length;
  if (hotCount > 6) add('badge-hot-count', `page has ${hotCount} hot badges, at most 6`);

  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1s !== 1) add('h1-count', `page has ${h1s} H1 headings, must have 1`);

  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').trim();
  if (title === '') add('title-missing', 'no <title>');
  else if (title.length > TITLE_MAX) add('title-length', `title is ${title.length}, max ${TITLE_MAX}`);

  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  if (description === '') add('description-missing', 'no meta description');
  else if (description.length < DESCRIPTION_RANGE.min || description.length > DESCRIPTION_RANGE.max) {
    add('description-length', `description is ${description.length}, must be ${DESCRIPTION_RANGE.min}-${DESCRIPTION_RANGE.max}`);
  }

  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? '';
  if (canonical === '') add('canonical-missing', 'no canonical link');
  else if (!canonical.startsWith(SITE) || (canonical.endsWith('/') && canonical !== `${SITE}/`)) {
    add('canonical-form', `canonical "${canonical}" must be absolute (${SITE}) with no trailing slash`);
  }

  for (const word of bannedWordsIn(visibleText(html))) add('banned-word', `"${word}" must not appear on the page`);

  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]*)"/g)) {
    const href = decode(m[1]);
    if (!href.startsWith('/') || href.startsWith('//') || seen.has(href)) continue;
    seen.add(href);
    if (!linkResolves(href)) add('broken-link', `link "${href}" does not match any built page`);
  }
}

if (errors.length > 0) {
  for (const line of errors) console.error(line);
  console.error(`validate-dist: ${errors.length} problem(s) in ${pages.length} pages`);
  process.exit(1);
}
console.log(`validate-dist: ok (${pages.length} pages)`);
