// Where the real imports read and write (docs/PRD.md §3). The sample adapter has its own paths.

import { join } from 'node:path';
import type { ImportPaths } from './types';

export const REPO_ROOT = join(import.meta.dirname, '..', '..');

export const IMPORT_PATHS: ImportPaths = {
  stagingDir: join(REPO_ROOT, 'data', 'staging'),
  // Pictures wait in staging; `npm run publish` copies a chosen game's pictures into public/thumbs (Q13).
  thumbsDir: join(REPO_ROOT, 'data', 'staging', 'thumbs'),
  categoriesJson: join(REPO_ROOT, 'data', 'categories.json'),
  categoryMapJson: join(REPO_ROOT, 'data', 'category-map.json'),
  contentGamesDir: join(REPO_ROOT, 'src', 'content', 'games'),
  brandJson: join(REPO_ROOT, 'data', 'brand.json'),
  tokensCss: join(REPO_ROOT, 'src', 'styles', 'tokens.css'),
};
