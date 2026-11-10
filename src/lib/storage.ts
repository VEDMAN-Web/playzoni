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

// ---- Favourites (max 100, newest first) ----
const FAV_KEY = 'pz-fav';
const MAX_FAV = 100;

export function getFavourites(): string[] {
  return readList(FAV_KEY);
}

export function isFavourite(slug: string): boolean {
  return getFavourites().includes(slug);
}

// Adds or removes the slug. Returns the new state (true = now a favourite).
export function toggleFavourite(slug: string): boolean {
  const current = getFavourites();
  if (current.includes(slug)) {
    writeList(FAV_KEY, current.filter((s) => s !== slug));
    return false;
  }
  writeList(FAV_KEY, [slug, ...current].slice(0, MAX_FAV));
  return true;
}

// ---- Like and dislike (state only, no counts are shown anywhere) ----
const REACTION_KEY = 'pz-reaction';
const MAX_REACTIONS = 200;

export type Reaction = 'like' | 'dislike';

function readReactions(): Record<string, Reaction> {
  try {
    const raw = window.localStorage.getItem(REACTION_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== 'object' || parsed === null) return {};
    const result: Record<string, Reaction> = {};
    for (const [slug, value] of Object.entries(parsed)) {
      if (value === 'like' || value === 'dislike') result[slug] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export function getReaction(slug: string): Reaction | null {
  return readReactions()[slug] ?? null;
}

// Pressing the active button again clears it. Returns the new state.
export function toggleReaction(slug: string, reaction: Reaction): Reaction | null {
  const all = readReactions();
  const next: Reaction | null = all[slug] === reaction ? null : reaction;
  delete all[slug];
  if (next) all[slug] = next;
  const entries = Object.entries(all).slice(-MAX_REACTIONS);
  try {
    window.localStorage.setItem(REACTION_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Storage is not available. Nothing to do.
  }
  return next;
}
