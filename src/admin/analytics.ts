// Loads an analytics screen from /api/admin/<endpoint> with the current range, shows a skeleton while loading,
// an error with "Try again" when it fails, and reloads when the range or filters change.
import type { Screen } from '../../functions/api/_lib/screen';
import { ApiError, apiGet } from './api';
import { apiParams, readState, type RangeState } from './range';
import { errorBox, renderScreen, skeleton } from './render';
import { RANGE_EVENT } from './shell';

export function analyticsScreen(endpoint: string, root: HTMLElement, after?: (screen: Screen) => void, refreshMs = 0, extra: Record<string, string> = {}): void {
  let range = readState();
  let busy = false;
  const load = async (quiet = false): Promise<void> => {
    if (busy) return;
    busy = true;
    if (!quiet) root.replaceChildren(skeleton());
    try {
      const params = apiParams(range);
      for (const [k, v] of Object.entries(extra)) params.set(k, v);
      const screen = await apiGet<Screen>(endpoint, params);
      renderScreen(root, screen);
      after?.(screen);
    } catch (error) {
      root.replaceChildren(errorBox(error instanceof ApiError ? error.message : 'Could not load the numbers. Check your connection.', () => void load()));
    } finally {
      busy = false;
    }
  };
  document.addEventListener(RANGE_EVENT, (e) => {
    range = (e as CustomEvent<RangeState>).detail;
    void load();
  });
  void load();
  if (refreshMs > 0) setInterval(() => document.visibilityState === 'visible' && void load(true), refreshMs);
}
