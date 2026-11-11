// "Your games" at the top of the home feed (T5.10, owner: Poki shows the games you played at the top).
// The visitor's last played games (newest first, the list in localStorage) are moved into the first small tiles of the
// home mosaic by swapping two tiles' contents. Nothing is added or removed: a game that is moved up takes the place of the
// game it swapped with, so no game disappears and none shows twice. Games that are not on the home page are left alone.
// Without JavaScript, or on the first visit, the page stays as built.
import { getRecentlyPlayed } from './storage';
import { applyPlayedBadges } from './played-badge';
import { showIn } from './admin-config';
import { planSwaps } from './your-games-plan';
export { planSwaps, YOUR_GAMES_MAX } from './your-games-plan';

// Applies the swaps to the tiles on the home page. Returns how many moves were made.
export function applyYourGames(): number {
  const tiles = [...document.querySelectorAll<HTMLAnchorElement>('.grid-mosaic a.tile[data-slug]')];
  if (tiles.length === 0) return 0;
  const slots = tiles.map((a) => a.dataset.slug ?? '');
  const smallIdx = tiles.flatMap((a, i) => (a.classList.contains('tile-s') ? [i] : []));
  const played = getRecentlyPlayed();
  const moves = planSwaps(slots, smallIdx, played);
  for (const [target, source] of moves) {
    const a = tiles[target];
    const b = tiles[source];
    const left = { slug: a.dataset.slug ?? '', title: titleOf(a) };
    const right = { slug: b.dataset.slug ?? '', title: titleOf(b) };
    showIn(a, right);
    showIn(b, left);
  }
  if (moves.length > 0) applyPlayedBadges(document.querySelector('main') ?? document);
  return moves.length;
}

function titleOf(a: HTMLAnchorElement): string {
  return a.getAttribute('aria-label') ?? a.querySelector('img')?.alt ?? '';
}
