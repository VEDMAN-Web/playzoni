// "Played" badge (docs/DESIGN.md §V2.8): a game the visitor has played before gets the circular-arrow badge in the
// top-left corner of its tile, everywhere. It replaces new and hot. The badge is absolutely positioned, so adding it
// after load moves nothing. Works on server tiles (a.tile) and on tiles built in the browser (a.pz-tile): any link
// with a data-slug inside the given root.
import { getRecentlyPlayed } from './storage';

const SVG_NS = 'http://www.w3.org/2000/svg';

function playedIcon(): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const d of ['M20 12a8 8 0 1 1-2.4-5.7', 'M20 4v5h-5']) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

export function applyPlayedBadges(root: ParentNode = document): void {
  const played = new Set(getRecentlyPlayed());
  if (played.size === 0) return;
  for (const link of root.querySelectorAll<HTMLElement>('a[data-slug]')) {
    const slug = link.dataset.slug;
    if (!slug || !played.has(slug)) continue;
    if (link.querySelector('.badge-played')) continue;
    link.querySelector('.badge')?.remove();
    const badge = document.createElement('span');
    badge.className = 'badge badge-played';
    badge.setAttribute('aria-hidden', 'true');
    badge.appendChild(playedIcon());
    link.appendChild(badge);
  }
}
