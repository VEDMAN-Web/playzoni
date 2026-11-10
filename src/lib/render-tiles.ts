// Builds game tiles in the browser from /games-index.json (favourites page, "Recently played" row).
// Uses DOM calls (no HTML strings) so titles can never inject markup. Styles: src/styles/client-tiles.css.

export interface IndexGame {
  slug: string;
  title: string;
  thumb: string;
}

let cached: Promise<IndexGame[]> | null = null;

export function loadIndex(): Promise<IndexGame[]> {
  cached ??= fetch('/games-index.json')
    .then((response) => (response.ok ? (response.json() as Promise<IndexGame[]>) : []))
    .catch(() => []);
  return cached;
}

// Slugs in the given order, skipping any game that no longer exists.
export function pickGames(index: IndexGame[], slugs: string[]): IndexGame[] {
  const bySlug = new Map(index.map((g) => [g.slug, g]));
  return slugs.map((s) => bySlug.get(s)).filter((g): g is IndexGame => g !== undefined);
}

export function gameTile(game: IndexGame, withTitle: boolean): HTMLElement {
  const link = document.createElement('a');
  link.className = 'pz-tile';
  link.href = `/game/${game.slug}`;
  link.setAttribute('aria-label', game.title);

  const img = document.createElement('img');
  img.src = game.thumb;
  img.srcset = `${game.thumb} 1x, ${game.thumb.replace('/s.webp', '/m.webp')} 2x`;
  img.width = 150;
  img.height = 150;
  img.alt = game.title;
  img.loading = 'lazy';
  img.decoding = 'async';
  link.appendChild(img);

  if (withTitle) {
    const title = document.createElement('span');
    title.className = 'pz-title';
    title.textContent = game.title;
    link.appendChild(title);
  }
  return link;
}
