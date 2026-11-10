// Pure filter for game entries. No Astro imports, so it can be tested with plain tsx.

export interface GameFlags {
  status: 'draft' | 'published';
  sample: boolean;
}

export function filterPublishedGames<T extends { data: GameFlags }>(
  entries: T[],
  includeSamples: boolean,
): T[] {
  return entries.filter(
    (entry) =>
      entry.data.status === 'published' && (includeSamples || !entry.data.sample),
  );
}
