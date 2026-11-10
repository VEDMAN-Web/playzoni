// Self-test for the last-row fill rule (R32, src/lib/mosaic-fit.ts). Pure function only.

import { tilesToHide, type Box } from '../src/lib/mosaic-fit';
import { finish, same } from './test-kit';

// Builds tiles of the given sizes in page order, placed the way the browser places them (dense: first free spot).
function dense(sizes: [number, number][], cols: number, fixed: Box[] = []): Box[] {
  const rows: boolean[][] = [];
  const mark = (x: number, y: number, w: number, h: number): void => {
    for (let r = y; r < y + h; r++) {
      rows[r] ??= Array.from({ length: cols }, () => false);
      for (let c = x; c < x + w; c++) rows[r][c] = true;
    }
  };
  for (const b of fixed) mark(b.x, b.y, b.w, b.h);
  const out: Box[] = [...fixed];
  for (const [w, h] of sizes) {
    let spot: { x: number; y: number } | null = null;
    for (let y = 0; !spot; y++) {
      for (let x = 0; x + w <= cols && !spot; x++) {
        let free = true;
        for (let r = y; r < y + h && free; r++) for (let c = x; c < x + w && free; c++) if (rows[r]?.[c]) free = false;
        if (free) spot = { x, y };
      }
    }
    mark(spot.x, spot.y, w, h);
    out.push({ x: spot.x, y: spot.y, w, h, hideable: true });
  }
  return out;
}

// The bottom row after hiding: how many of its cells are filled (cols when it is full).
function bottomFill(boxes: Box[], hidden: number[]): number {
  const kept = boxes.filter((_, i) => !hidden.includes(i));
  const row = Math.max(...kept.map((b) => b.y + b.h)) - 1;
  const cover = new Set<number>();
  for (const b of kept) {
    if (b.y <= row && b.y + b.h - 1 >= row) for (let c = b.x; c < b.x + b.w; c++) cover.add(c);
  }
  return cover.size;
}

function testFull(): void {
  const boxes = dense([[1, 1], [1, 1], [1, 1], [1, 1]], 4);
  same(tilesToHide(boxes, 4), [], 'a full last row hides nothing');
}

function testSmallTail(): void {
  // 4 columns, 5 single tiles: the fifth opens a row with three holes.
  const boxes = dense([[1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], 4);
  const hide = tilesToHide(boxes, 4);
  same(hide, [4], 'the trailing single tile is hidden');
  same(bottomFill(boxes, hide), 4, 'after hiding, the last row is full');
}

function testLargeTile(): void {
  // 4 columns: the 2x2 at the end leaves its row short; hiding it fills the row above.
  const boxes = dense([[1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 2]], 4);
  const hide = tilesToHide(boxes, 4);
  same(bottomFill(boxes, hide), 4, 'after hiding, the last row is full');
  same(hide.length > 0 && hide.length <= 8, true, 'a small number of tiles is hidden');
}

function testFixedBlock(): void {
  // A block that must stay (the nav box) is never hidden, and the tiles fill around it.
  const fixed: Box[] = [{ x: 0, y: 0, w: 2, h: 1, hideable: false }];
  const boxes = dense([[1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], 4, fixed);
  const hide = tilesToHide(boxes, 4);
  same(hide.includes(0), false, 'the fixed block stays');
  same(bottomFill(boxes, hide), 4, 'the last row is full around the fixed block');
}

function testCapped(): void {
  // Filling the bottom row would take more than the cap, so nothing is hidden.
  const boxes = dense([[1, 1], [1, 1], [1, 1], [1, 1], [1, 1]], 4);
  same(tilesToHide(boxes, 4, 0), [], 'when the cap is zero, nothing is hidden');
}

testFull();
testSmallTail();
testLargeTile();
testFixedBlock();
testCapped();
finish('test-mosaic-fit');
