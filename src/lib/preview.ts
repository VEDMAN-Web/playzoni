// Hover preview plan for a game tile (docs/DESIGN.md §V2.8). Pure, so it can be tested without a browser.
//   previewVideo  -> play it muted and looped while the tile is hovered
//   screenshots   -> cross-fade through them (up to 4) every 900 ms
//   neither       -> slow zoom of the thumbnail (CSS only)
export const MAX_SCREENSHOTS = 4;
export const SCREENSHOT_STEP_MS = 900;

export type PreviewPlan =
  | { kind: 'video'; src: string; screenshots: string[] }
  | { kind: 'screenshots'; screenshots: string[] }
  | { kind: 'zoom' };

export function previewPlan(previewVideo: string | undefined, screenshots: readonly string[] | undefined): PreviewPlan {
  const shots = (screenshots ?? []).filter((s) => s.length > 0).slice(0, MAX_SCREENSHOTS);
  if (previewVideo) return { kind: 'video', src: previewVideo, screenshots: shots };
  if (shots.length > 0) return { kind: 'screenshots', screenshots: shots };
  return { kind: 'zoom' };
}

// The optional preview fields of a game, as tile props (undefined when the game has none).
export function previewFields(data: { previewVideo?: string; screenshots?: string[] }): {
  previewVideo?: string;
  screenshots?: string[];
} {
  return {
    ...(data.previewVideo ? { previewVideo: data.previewVideo } : {}),
    ...(data.screenshots && data.screenshots.length > 0 ? { screenshots: data.screenshots.slice(0, MAX_SCREENSHOTS) } : {}),
  };
}

// Screenshot paths travel in one HTML attribute, separated by spaces (paths never contain spaces).
export function parseScreenshots(attribute: string | null | undefined): string[] {
  return (attribute ?? '').split(' ').filter((s) => s.length > 0).slice(0, MAX_SCREENSHOTS);
}
