// Shared shapes for the import scripts (docs/PRD.md §4 and §10).

export type SourceKey = 'gd' | 'gm' | 'pg' | 'gp' | 'own';
export type Aspect = 'landscape' | 'portrait' | 'square';

export const SOURCE_KEYS: readonly SourceKey[] = ['gd', 'gm', 'pg', 'gp', 'own'];

// One game as a provider adapter hands it over: provider data already in our field names,
// but categories still spelled the way the provider spells them.
export interface RawGame {
  source: SourceKey;
  sourceId: string;
  title: string;
  /** Raw provider text. Only kept as `feedText` so the validator can catch copied sentences. */
  description: string;
  providerCategories: string[];
  tags: string[];
  thumbnailUrl: string;
  embedUrl: string;
  width: number;
  height: number;
  mobile: boolean;
  developer?: string;
  /** YYYY-MM-DD */
  releaseDate?: string;
  popularity?: number;
}

// data/staging/<source>/<slug>.json
export interface StagingGame {
  slug: string;
  title: string;
  source: SourceKey;
  sourceId: string;
  embedUrl: string;
  aspect: Aspect;
  width: number;
  height: number;
  mobile: boolean;
  /** Our category slugs, first = primary. Empty when no provider category could be mapped. */
  categories: string[];
  /** The provider's own category or genre names as the feed gave them (for the unmapped report, R14). */
  providerCategories?: string[];
  tags: string[];
  developer?: string;
  releaseDate?: string;
  popularity: number;
  feedText: string;
}

export interface ImportPaths {
  /** Holds `<source>/<slug>.json`, `unmapped.txt` and `failed.txt`. */
  stagingDir: string;
  /** Receives `<slug>/{s,m,l}.webp` and `<slug>/og.jpg`. Always `<stagingDir>/thumbs` (git-ignored, see Q13). */
  thumbsDir: string;
  categoriesJson: string;
  categoryMapJson: string;
  /** src/content/games: published slugs are never reused. */
  contentGamesDir: string;
  brandJson: string;
  tokensCss: string;
}

export type ImageFetcher = (url: string) => Promise<Buffer>;

// A feed entry the adapter did not turn into a RawGame, with the reason (written to data/staging/failed.txt).
export interface SkippedEntry {
  sourceId: string;
  title: string;
  reason: string;
}

// What a provider adapter returns: the games it could map and the entries it left out.
export interface AdapterResult {
  games: RawGame[];
  skipped: SkippedEntry[];
}

export interface ImportOptions {
  /** Highest priority first. Used when the same title comes from two sources. */
  priority: SourceKey[];
  fetchImage: ImageFetcher;
  log?: (message: string) => void;
  /** Images downloaded at the same time. */
  concurrency?: number;
}

export interface ImportReport {
  imported: string[];
  duplicates: string[];
  failed: string[];
  invalid: string[];
  unmapped: string[];
  withoutCategory: string[];
}
