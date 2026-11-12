// Provider category -> our category slugs, from data/category-map.json (docs/PRD.md §10).
// A provider category that is not in the map is reported, never guessed.

import { readFileSync } from 'node:fs';
import { appendNewLines } from './log';
import { SOURCE_KEYS, type SourceKey } from './types';

export const MAX_CATEGORIES = 4;

// source -> provider category (lower case) -> our slugs
export type CategoryMap = Partial<Record<SourceKey, Record<string, string[]>>>;

export interface CategoryResult {
  slugs: string[];
  unmapped: string[];
}

const keyOf = (name: string): string => name.trim().toLowerCase();

// Reads the map and fails fast if it points at a category that data/categories.json does not have.
export function loadCategoryMap(file: string, knownSlugs: ReadonlySet<string>): CategoryMap {
  const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Record<string, string[]>>;
  const map: CategoryMap = {};
  for (const [source, entries] of Object.entries(raw)) {
    if (!(SOURCE_KEYS as readonly string[]).includes(source)) {
      throw new Error(`${file}: "${source}" is not a source (${SOURCE_KEYS.join(', ')})`);
    }
    const normalised: Record<string, string[]> = {};
    for (const [providerName, slugs] of Object.entries(entries)) {
      for (const slug of slugs) {
        if (!knownSlugs.has(slug)) throw new Error(`${file}: ${source} "${providerName}" maps to unknown category "${slug}"`);
      }
      normalised[keyOf(providerName)] = slugs;
    }
    map[source as SourceKey] = normalised;
  }
  return map;
}

// Mapped slugs keep the provider's order (first = primary), without duplicates, at most 4.
export function mapCategories(source: SourceKey, providerCategories: string[], map: CategoryMap): CategoryResult {
  const slugs: string[] = [];
  const unmapped: string[] = [];
  for (const name of providerCategories) {
    const mapped = map[source]?.[keyOf(name)];
    if (!mapped) {
      if (name.trim() !== '') unmapped.push(name.trim());
      continue;
    }
    for (const slug of mapped) if (!slugs.includes(slug)) slugs.push(slug);
  }
  return { slugs: slugs.slice(0, MAX_CATEGORIES), unmapped };
}

// Adds "<source>\t<category>" lines that are not in the file yet.
export function appendUnmapped(file: string, entries: { source: SourceKey; category: string }[]): void {
  appendNewLines(file, entries.map(({ source, category }) => `${source}\t${category}`));
}
