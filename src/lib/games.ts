import { getCollection } from 'astro:content';
import { filterPublishedGames } from './games-core';

// The only way pages read games. Sample games are included only when
// PUBLIC_INCLUDE_SAMPLES is 'true' (see CLAUDE.md and docs/PRD.md §4).
export async function getPublishedGames() {
  const entries = await getCollection('games');
  return filterPublishedGames(entries, import.meta.env.PUBLIC_INCLUDE_SAMPLES === 'true');
}
