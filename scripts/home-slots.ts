// Build step (T10.17, postbuild): writes dist/home-slots.json, the home mosaic in page order, one entry per game tile:
// [{ "i": 0, "size": "S", "slug": "crowd-runners-3d" }, ...]. The admin "Home feed" screen draws the grid from it, and the
// slot index `i` is what a pin refers to (src/lib/home-pins.ts). It reads the built dist/index.html, so it always matches
// what the visitor really gets.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Slot } from '../src/lib/home-pins';

// The mosaic grid is the element with class "grid-mosaic"; the blocking fit script follows it. Rows below use the same
// tile markup, so only the text between the two markers is read.
export function slotsFromHtml(html: string): Slot[] {
  const start = html.indexOf('grid-mosaic');
  if (start < 0) return [];
  const endMarker = html.indexOf('src="/mosaic-fit.js"', start);
  const grid = html.slice(start, endMarker > 0 ? endMarker : undefined);
  const slots: Slot[] = [];
  const tile = /<a\b[^>]*?class="tile tile-(xl|l|s)"[^>]*?data-slug="([a-z0-9-]+)"/g;
  for (const m of grid.matchAll(tile)) slots.push({ i: slots.length, size: m[1].toUpperCase() as Slot['size'], slug: m[2] });
  return slots;
}

function main(): void {
  const dist = join(import.meta.dirname, '..', 'dist');
  const home = join(dist, 'index.html');
  if (!existsSync(home)) throw new Error('home-slots: dist/index.html not found. Run the build first.');
  const slots = slotsFromHtml(readFileSync(home, 'utf8'));
  if (slots.length === 0) throw new Error('home-slots: no tiles found in the home mosaic.');
  writeFileSync(join(dist, 'home-slots.json'), JSON.stringify(slots));
  console.log(`home-slots: ${slots.length} slots (${slots.filter((s) => s.size !== 'S').length} big)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
