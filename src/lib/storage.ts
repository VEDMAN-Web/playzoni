// Small localStorage helpers. Every access is wrapped in try/catch, because storage can be
// blocked (private windows, strict settings). Failures are silent: the feature just does nothing.

const RECENT_KEY = 'pz-recent';
const MAX_RECENT = 24;

export function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function writeList(key: string, list: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage is not available. Nothing to do.
  }
}

export function getRecentlyPlayed(): string[] {
  return readList(RECENT_KEY);
}

// Newest first, no duplicates, at most 24 slugs.
export function addRecentlyPlayed(slug: string): void {
  const next = [slug, ...readList(RECENT_KEY).filter((s) => s !== slug)].slice(0, MAX_RECENT);
  writeList(RECENT_KEY, next);
}
