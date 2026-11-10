// Title, description and canonical rules from docs/SEO-PLAN.md §Templates.
// Pure functions only (no Astro imports) so scripts/test-seo.ts can run them with tsx.

export const SITE_URL = 'https://playzoni.com';
export const SITE_NAME = 'Playzoni';
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 120;
export const DESCRIPTION_MAX = 155;

const BRAND_SUFFIX = ` | ${SITE_NAME}`;
const PLAY_FREE = 'Play Free Online';

// Game: "{Title} — Play Free Online | Playzoni"; if > 60: "{Title} | Playzoni"; if still > 60: "{Title}"
export function buildGameTitle(title: string): string {
  const full = `${title} — ${PLAY_FREE}${BRAND_SUFFIX}`;
  if (full.length <= TITLE_MAX) return full;
  const short = `${title}${BRAND_SUFFIX}`;
  if (short.length <= TITLE_MAX) return short;
  return title;
}

// Category: "{Name} — Play Free Online {Name} | Playzoni"; if > 60: "{Name} — Play Free Online | Playzoni"; if still > 60 the same fallback chain as games.
export function buildCategoryTitle(name: string): string {
  const full = `${name} — ${PLAY_FREE} ${name}${BRAND_SUFFIX}`;
  if (full.length <= TITLE_MAX) return full;
  const short = `${name} — ${PLAY_FREE}${BRAND_SUFFIX}`;
  if (short.length <= TITLE_MAX) return short;
  return name;
}

// Category page N: "{Name} — Page {N} | Playzoni"
export function buildCategoryPageTitle(name: string, page: number): string {
  return `${name} — Page ${page}${BRAND_SUFFIX}`;
}

// Canonical URL: absolute, no trailing slash (the home page is the only exception: "/").
export function canonicalUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`canonicalPath must start with "/": ${path}`);
  }
  if (path.length > 1 && path.endsWith('/')) {
    throw new Error(`canonicalPath must not end with "/": ${path}`);
  }
  return `${SITE_URL}${path}`;
}

// Throws at build time when a title is too long.
export function assertTitle(title: string): void {
  if (title.length > TITLE_MAX) {
    throw new Error(`title is ${title.length} chars (max ${TITLE_MAX}): "${title}"`);
  }
}

// Throws at build time when a meta description is outside 120–155 chars.
export function assertDescription(description: string): void {
  const len = description.length;
  if (len < DESCRIPTION_MIN || len > DESCRIPTION_MAX) {
    throw new Error(
      `description is ${len} chars (must be ${DESCRIPTION_MIN}–${DESCRIPTION_MAX}): "${description}"`,
    );
  }
}

// Meta description for page 2 and later of a paged list (no two pages share a description).
// Returns the first wording that fits 120–155 characters.
export function buildPagedDescription(name: string, page: number): string {
  const options = [
    `Page ${page} of ${name} to play free online. Pick a game and press Play to start. No download is needed on any device.`,
    `Page ${page} of ${name} to play free online. Pick a game and press Play to start. No download is needed, and every game is free to play in your browser.`,
    `Page ${page} of ${name}. Pick a free game, press Play and start in your browser. No download is needed on a phone or a computer.`,
  ];
  return options.find((d) => d.length >= DESCRIPTION_MIN && d.length <= DESCRIPTION_MAX) ?? options[0];
}
