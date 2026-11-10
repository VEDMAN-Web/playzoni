// Same title from two providers: keep one, by SOURCE_PRIORITY (docs/PRD.md §10).

import { normaliseTitle } from './text';
import { SOURCE_KEYS, type RawGame, type SourceKey } from './types';

// Used when SOURCE_PRIORITY is empty. Our own games first, then the providers in PRD order.
export const DEFAULT_PRIORITY: SourceKey[] = ['own', 'gd', 'gm', 'pg', 'gp'];

// "gd,gm" -> [gd, gm, own, pg, gp]: sources not listed come after, in default order.
export function parsePriority(value: string | undefined): SourceKey[] {
  const listed = (value ?? '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part !== '');
  for (const key of listed) {
    if (!(SOURCE_KEYS as readonly string[]).includes(key)) {
      throw new Error(`SOURCE_PRIORITY has "${key}", expected a list of ${SOURCE_KEYS.join(', ')}`);
    }
  }
  const order = [...new Set(listed as SourceKey[])];
  for (const key of DEFAULT_PRIORITY) if (!order.includes(key)) order.push(key);
  return order;
}

export interface DedupeResult {
  kept: RawGame[];
  dropped: { game: RawGame; keptSource: SourceKey; keptId: string }[];
}

// The best source wins; the same source twice keeps the first entry. Input order is kept.
export function dedupeByTitle(games: RawGame[], priority: SourceKey[]): DedupeResult {
  const rank = (game: RawGame): number => priority.indexOf(game.source);
  const winners = new Map<string, RawGame>();
  for (const game of games) {
    const key = normaliseTitle(game.title);
    const current = winners.get(key);
    if (!current || rank(game) < rank(current)) winners.set(key, game);
  }
  const kept: RawGame[] = [];
  const dropped: DedupeResult['dropped'] = [];
  for (const game of games) {
    const winner = winners.get(normaliseTitle(game.title));
    if (winner === game) kept.push(game);
    else if (winner) dropped.push({ game, keptSource: winner.source, keptId: winner.sourceId });
  }
  return { kept, dropped };
}
