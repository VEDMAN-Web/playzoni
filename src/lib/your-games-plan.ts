// Move plan for "Your games" (T5.10). Pure, so it is tested with plain tsx (scripts/test-your-games.ts).

export const YOUR_GAMES_MAX = 6;

// The moves for the first `targets` small tiles. `slots` is the slug of every tile in page order (big and small).
// `smallIdx` is the page index of each small tile, in order. Returns [targetIndex, sourceIndex] pairs.
export function planSwaps(slots: readonly string[], smallIdx: readonly number[], played: readonly string[]): [number, number][] {
  const now = [...slots];
  const moves: [number, number][] = [];
  const wanted = played.slice(0, Math.min(YOUR_GAMES_MAX, smallIdx.length));
  wanted.forEach((slug, k) => {
    const target = smallIdx[k];
    if (target === undefined || now[target] === slug) return;
    const source = now.indexOf(slug);
    if (source < 0) return;
    [now[target], now[source]] = [now[source], now[target]];
    moves.push([target, source]);
  });
  return moves;
}
