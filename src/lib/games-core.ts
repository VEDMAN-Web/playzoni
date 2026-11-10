// Pure filter for game entries. No Astro imports, so it can be tested with plain tsx.

export interface GameFlags {
  status: 'draft' | 'published';
  sample: boolean;
}

// Drafts are shown only in the owner's preview (includeDrafts, PUBLIC_INCLUDE_DRAFTS=true; docs/TASKS.md T4.6).
export function filterPublishedGames<T extends { data: GameFlags }>(
  entries: T[],
  includeSamples: boolean,
  includeDrafts = false,
): T[] {
  return entries.filter(
    (entry) =>
      (entry.data.status === 'published' || (includeDrafts && entry.data.status === 'draft')) &&
      (includeSamples || !entry.data.sample),
  );
}
