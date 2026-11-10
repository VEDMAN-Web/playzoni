// Fills the last row of a mosaic grid (R32, docs/DESIGN.md §V2.2). The grid width depends on the window, so the page
// measures the tiles in the browser (src/components/GameGrid.astro) and asks this function which tiles to hide.
//
// The browser places the tiles with `grid-auto-flow: dense`: each tile takes the first free spot in reading order.
// This file repeats that placement, so it can tell what the grid would look like without a tile. Blocks that must stay
// (the nav box, the player) keep the place they were measured at. The rule: while the bottom row has empty cells,
// hide the tile (among the last three rows) whose removal fills the bottom row best. Hidden games stay on the site
// (each has its own page and appears in the other lists). At most `maxHide` tiles are hidden; if the bottom row cannot be
// filled within that, nothing is hidden. Pure functions, no DOM, tested with plain tsx (scripts/test-mosaic-fit.ts).

export interface Box {
  /** Measured position of the top-left cell (used only for blocks that must stay). */
  x: number;
  y: number;
  /** Size in cells. */
  w: number;
  h: number;
  /** True for game and category tiles that the grid may place itself and that may be hidden. */
  hideable: boolean;
}

type Cell = boolean[];

// Places every shown box. Blocks that must stay go first at their measured place; the tiles follow in page order.
function layout(boxes: readonly Box[], shown: readonly boolean[], cols: number): { rows: Cell[]; at: ({ x: number; y: number } | null)[] } {
  const rows: Cell[] = [];
  const at: ({ x: number; y: number } | null)[] = boxes.map(() => null);
  const fits = (x: number, y: number, w: number, h: number): boolean => {
    if (x + w > cols) return false;
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        if (rows[r]?.[c]) return false;
      }
    }
    return true;
  };
  const mark = (x: number, y: number, w: number, h: number): void => {
    for (let r = y; r < y + h; r++) {
      rows[r] ??= Array.from({ length: cols }, () => false);
      for (let c = x; c < x + w; c++) rows[r][c] = true;
    }
  };

  boxes.forEach((b, i) => {
    if (b.hideable || !shown[i]) return;
    at[i] = { x: b.x, y: b.y };
    mark(b.x, b.y, b.w, b.h);
  });
  boxes.forEach((b, i) => {
    if (!b.hideable || !shown[i]) return;
    for (let y = 0; ; y++) {
      let placed = false;
      for (let x = 0; x + b.w <= cols; x++) {
        if (fits(x, y, b.w, b.h)) {
          at[i] = { x, y };
          mark(x, y, b.w, b.h);
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
  });
  return { rows, at };
}

// How many cells of the bottom row are covered, and where that row is.
function bottom(boxes: readonly Box[], shown: readonly boolean[], at: ({ x: number; y: number } | null)[], cols: number): { row: number; covered: number } {
  let row = -1;
  boxes.forEach((b, i) => {
    if (!shown[i] || !at[i]) return;
    row = Math.max(row, at[i]!.y + b.h - 1);
  });
  if (row < 0) return { row: -1, covered: cols };
  const cover = new Set<number>();
  boxes.forEach((b, i) => {
    const p = at[i];
    if (!shown[i] || !p || p.y > row || p.y + b.h - 1 < row) return;
    for (let c = p.x; c < p.x + b.w; c++) cover.add(c);
  });
  return { row, covered: cover.size };
}

// Returns the indices (into `boxes`, which is in page order) of the tiles to hide, in the order they were chosen.
// Returns [] when the bottom row cannot be filled within `maxHide` hidden tiles.
export function tilesToHide(boxes: readonly Box[], cols: number, maxHide: number = cols): number[] {
  const shown = boxes.map(() => true);
  const hide: number[] = [];

  for (;;) {
    const { rows, at } = layout(boxes, shown, cols);
    void rows;
    const { row, covered } = bottom(boxes, shown, at, cols);
    if (row < 0 || covered >= cols) return hide;
    if (hide.length >= maxHide) return [];

    // Candidates: shown tiles in the last three rows. Pick the one whose removal fills the bottom row best.
    let best: { index: number; covered: number } | null = null;
    boxes.forEach((b, i) => {
      if (!b.hideable || !shown[i]) return;
      const p = at[i];
      if (!p || p.y + b.h - 1 < row - 2) return;
      shown[i] = false;
      const trial = layout(boxes, shown, cols);
      const result = bottom(boxes, shown, trial.at, cols);
      shown[i] = true;
      const fill = result.row === row ? result.covered : result.covered * 0.5;
      if (!best || fill >= best.covered) best = { index: i, covered: fill };
    });
    if (!best) return [];
    shown[(best as { index: number }).index] = false;
    hide.push((best as { index: number }).index);
  }
}
