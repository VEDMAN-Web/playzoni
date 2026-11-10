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

export function aspectFrom(width: number, height: number): Aspect {
  const ratio = width / height;
  if (ratio >= ASPECT_RATIO_LIMIT) return 'landscape';
  if (ratio <= 1 / ASPECT_RATIO_LIMIT) return 'portrait';
  return 'square';
}
