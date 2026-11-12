// Builds game tiles in the browser from /games-index.json (favourites page, "Recently played" row).
// Uses DOM calls (no HTML strings) so titles can never inject markup. Styles: src/styles/client-tiles.css.

export interface IndexGame {
  slug: string;
  title: string;
  thumb: string;
  /** Date added, YYYY-MM-DD. */
  added?: string;
  /** Category slugs, primary first. */
  cats?: string[];
  /** Up to 5 tag slugs (T9.6). */
  t?: string[];
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
  link.dataset.slug = game.slug;
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

// A row tile added by an endless row (GameRow `more`): the same S tile, plus the name that slides up on hover and
// keyboard focus (2 lines, "…"), like the tiles drawn by GameTile. Styles: client-tiles.css (.pz-row-item, .pz-name).
export function rowTile(game: IndexGame): HTMLElement {
  const item = document.createElement('div');
  item.className = 'pz-row-item';
  const link = gameTile(game, false);
  link.removeAttribute('aria-label');
  const img = link.querySelector('img');
  if (img) img.alt = '';
  const name = document.createElement('span');
  name.className = 'pz-name';
  const text = document.createElement('span');
  text.textContent = game.title;
  name.appendChild(text);
  link.appendChild(name);
  item.appendChild(link);
  return item;
}

// A small clock (our own line drawing) for the "Played today" pill.
function clockIcon(): SVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.4');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '12');
  circle.setAttribute('r', '9');
  const hands = document.createElementNS(ns, 'path');
  hands.setAttribute('d', 'M12 7v5l3 2');
  svg.append(circle, hands);
  return svg;
}

// A large tile (2x2 size) with a small white pill under the picture's top edge, used by the profile panel's
// "Ready for another round?" row. The played badge is added afterwards by applyPlayedBadges.
export function largeTile(game: IndexGame, pillText: string): HTMLElement {
  const link = document.createElement('a');
  link.className = 'pz-tile pz-tile-l';
  link.href = `/game/${game.slug}`;
  link.dataset.slug = game.slug;
  link.setAttribute('aria-label', game.title);

  const img = document.createElement('img');
  img.src = game.thumb.replace('/s.webp', '/m.webp');
  img.width = 300;
  img.height = 300;
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  link.appendChild(img);

  if (pillText) {
    const pill = document.createElement('span');
    pill.className = 'pz-pill';
    pill.appendChild(clockIcon());
    pill.appendChild(document.createTextNode(pillText));
    link.appendChild(pill);
  }
  return link;
}
