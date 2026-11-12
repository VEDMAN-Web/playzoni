// Entry of public/mosaic-fit.js (R47). A classic, blocking script placed right after a mosaic grid in GameGrid.astro: it
// fits the grid it follows before the browser parses (and paints) the content below it, so nothing moves afterwards.
// Built by `npm run fit:bundle` (scripts/bundle-fit.ts). Do not load this file as a module.
import { fitMosaic } from './mosaic-fit-dom';

const grid = document.currentScript?.previousElementSibling;
if (grid instanceof HTMLElement && grid.classList.contains('grid-mosaic')) fitMosaic(grid);
