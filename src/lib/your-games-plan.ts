// Move plan for "Your games" (T5.10, R45). Pure, so it is tested with plain tsx (scripts/test-your-games.ts).

export const YOUR_GAMES_MAX = 6;

export interface Move {
  /** Page index of the small tile that receives the played game. */
  target: number;
  /** Page index of the tile that currently shows the played game, or null when it is not on the page. */
  source: number | null;
  /** The played game. */
  slug: string;
}

// The moves for the first small tiles. `slots` is the slug of every tile in page order (big and small), `smallIdx` the
// page index of each small tile in order, `played` the visitor's games, newest first.
// - A played game on the page swaps places with the game in the target tile, so no game disappears and none is repeated.
// - A played game that is not on the page takes the target tile (the game that was there leaves the page); it is shown
//   from the games index, and it appears nowhere else.
export function planSwaps(slots: readonly string[], smallIdx: readonly number[], played: readonly string[]): Move[] {
  const now = [...slots];
  const moves: Move[] = [];
  const wanted = played.slice(0, Math.min(YOUR_GAMES_MAX, smallIdx.length));
  wanted.forEach((slug, k) => {
    const target = smallIdx[k];
    if (target === undefined || now[target] === slug) return;
    const found = now.indexOf(slug);
    if (found < 0) {
      now[target] = slug;
      moves.push({ target, source: null, slug });
      return;
    }
    [now[target], now[found]] = [now[found], now[target]];
    moves.push({ target, source: found, slug });
  });
  return moves;
}
