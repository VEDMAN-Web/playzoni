// "Your games" at the top of the home feed (T5.10, owner: Poki shows the games you played at the top).
// The visitor's last played games (newest first, the list in localStorage) are moved into the first small tiles of the
// home mosaic by swapping two tiles' contents (same method as admin-config.ts). A played game that is already on the page
// swaps places with the game in the target tile, so none disappears and none shows twice. A played game that is not on the
// page (R45) is shown in the target tile from /games-index.json. Without JavaScript, or on the first visit, the page
// stays as built.
import { getRecentlyPlayed } from './storage';
import { applyPlayedBadges } from './played-badge';
import { showIn } from './admin-config';
import { planSwaps } from './your-games-plan';
export { planSwaps, YOUR_GAMES_MAX } from './your-games-plan';

interface IndexGame {
  slug: string;
  title: string;
}

async function loadIndex(): Promise<IndexGame[]> {
  try {
    const response = await fetch('/games-index.json');
    return response.ok ? ((await response.json()) as IndexGame[]) : [];
  } catch {
    return [];
  }
}

function titleOf(a: HTMLAnchorElement): string {
  return a.getAttribute('aria-label') ?? a.querySelector('img')?.alt ?? '';
}

// Applies the moves to the tiles on the home page. Returns how many moves were made.
export async function applyYourGames(): Promise<number> {
  const tiles = [...document.querySelectorAll<HTMLAnchorElement>('.grid-mosaic a.tile[data-slug]')];
  if (tiles.length === 0) return 0;
  const slots = tiles.map((a) => a.dataset.slug ?? '');
  const smallIdx = tiles.flatMap((a, i) => (a.classList.contains('tile-s') ? [i] : []));
  const moves = planSwaps(slots, smallIdx, getRecentlyPlayed());
  if (moves.length === 0) return 0;

  // Only fetch the index when a played game is not on the page.
  const index = moves.some((m) => m.source === null) ? await loadIndex() : [];
  let made = 0;
  for (const move of moves) {
    const a = tiles[move.target];
    if (move.source === null) {
      const game = index.find((g) => g.slug === move.slug);
      if (!game) continue; // not a game we know any more: leave the tile alone
      showIn(a, game);
      made++;
      continue;
    }
    const b = tiles[move.source];
    const left = { slug: a.dataset.slug ?? '', title: titleOf(a) };
    const right = { slug: b.dataset.slug ?? '', title: titleOf(b) };
    showIn(a, right);
    showIn(b, left);
    made++;
  }
  if (made > 0) applyPlayedBadges(document.querySelector('main') ?? document);
  return made;
}
