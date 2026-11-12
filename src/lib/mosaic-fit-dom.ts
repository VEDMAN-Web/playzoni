// R32 / R39 / R47: on mosaic grids the last row must be full. This measures the tiles in the browser and either shows
// filler games or hides trailing tiles (the rules are in src/lib/mosaic-fit.ts). It is used twice:
//   - by public/mosaic-fit.js (built from src/lib/fit-boot.ts), a blocking script placed right after the grid, so the
//     grid is final before the content below it is parsed and painted (no layout shift on the first visit, R47);
//   - by the module script in GameGrid.astro, on resize.
import { fillersNeeded, tilesToHide, type Box } from './mosaic-fit';

// The grid stays invisible (CSS in GameGrid.astro) until it has been fitted once, so the visitor never sees tiles appear and
// disappear: hiding tiles after the first paint would move the tiles that follow them (R47).
export function fitMosaic(grid: HTMLElement): void {
  try {
    fit(grid);
  } finally {
    grid.setAttribute('data-fitted', '');
  }
}

function fit(grid: HTMLElement): void {
  for (const el of grid.querySelectorAll<HTMLElement>('[data-fit-hidden]')) {
    el.hidden = false;
    el.removeAttribute('data-fit-hidden');
  }
  const fillers = Array.from(grid.querySelectorAll<HTMLElement>('[data-fill]'));
  for (const el of fillers) el.hidden = true;
  const styles = getComputedStyle(grid);
  const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell'));
  const gap = parseFloat(styles.columnGap);
  const cols = styles.gridTemplateColumns.split(' ').filter((t) => t.length > 0).length;
  if (!(cell > 0) || !(gap >= 0) || cols < 1) return;

  const origin = grid.getBoundingClientRect();
  const tiles: HTMLElement[] = [];
  const boxes: Box[] = [];
  for (const el of Array.from(grid.children) as HTMLElement[]) {
    if (el.hidden) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    tiles.push(el);
    boxes.push({
      x: Math.round((r.left - origin.left) / (cell + gap)),
      y: Math.round((r.top - origin.top) / (cell + gap)),
      // At least one cell each way: shorter blocks (the related-category chip strip, 36px) still take a whole row.
      w: Math.max(1, Math.round((r.width + gap) / (cell + gap))),
      h: Math.max(1, Math.round((r.height + gap) / (cell + gap))),
      hideable: el.classList.contains('cell') && !el.classList.contains('cell-nav') && !el.hasAttribute('data-fill'),
    });
  }
  // R39: first try to complete the bottom row with filler games (category pages); otherwise hide trailing tiles.
  const need = fillersNeeded(boxes, cols, fillers.length);
  if (need >= 0) {
    for (const el of fillers.slice(0, need)) el.hidden = false;
    return;
  }
  for (const i of tilesToHide(boxes, cols)) {
    tiles[i].hidden = true;
    tiles[i].setAttribute('data-fit-hidden', '');
  }
}

export function fitAllMosaics(): void {
  for (const grid of document.querySelectorAll<HTMLElement>('.grid-mosaic')) fitMosaic(grid);
}
