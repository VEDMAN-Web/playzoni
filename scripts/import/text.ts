// Slugs, title matching and aspect for imported games (docs/PRD.md §4).

import type { Aspect } from './types';

export const MAX_SLUG_LENGTH = 60;
// A game counts as landscape or portrait when one side is at least 1.2 times the other.
const ASPECT_RATIO_LIMIT = 1.2;

const MARKS = /\p{M}/gu;

// "Kiki & Momo: Jump!" -> "kiki-and-momo-jump". Letters outside a-z are dropped, so a title with
// no Latin letters becomes "game" (the unique-slug step then adds -2, -3, ...).
export function slugify(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(MARKS, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base === '') return 'game';
  if (base.length <= MAX_SLUG_LENGTH) return base;
  // Cut at a word boundary when there is one.
  const window = base.slice(0, MAX_SLUG_LENGTH + 1);
  const boundary = window.lastIndexOf('-');
  return boundary > 0 ? window.slice(0, boundary) : base.slice(0, MAX_SLUG_LENGTH);
}

// First free slug: base, base-2, base-3, ... The caller adds the result to `taken`.
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// Key for "same game from two providers": case, accents, spaces and punctuation do not matter.
export function normaliseTitle(title: string): string {
  const key = title
    .normalize('NFKD')
    .replace(MARKS, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
  return key === '' ? title.trim().toLowerCase() : key;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '\u2013', mdash: '\u2014',
  hellip: '\u2026', lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D',
};

// "&amp;" -> "&", "&#39;" -> "'". Unknown entities stay as they are.
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith('#')) {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

// Feed text as plain words: tags removed, entities decoded, white space collapsed.
// Block tags (paragraph, line break, list item ...) separate words; inline tags such as <b> just vanish.
const BLOCK_TAGS = /<\/?(br|p|div|li|ul|ol|h[1-6]|tr|td|table)\b[^>]*>/gi;
export function plainText(html: string): string {
  return decodeEntities(html.replace(BLOCK_TAGS, ' ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

export function aspectFrom(width: number, height: number): Aspect {
  const ratio = width / height;
  if (ratio >= ASPECT_RATIO_LIMIT) return 'landscape';
  if (ratio <= 1 / ASPECT_RATIO_LIMIT) return 'portrait';
  return 'square';
}
