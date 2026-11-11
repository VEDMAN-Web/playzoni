// Home feed pins (T10.17, docs/ADMIN.md §5.6): the admin pins a game to a slot of the home mosaic. Pure functions, shared by
// the public site (src/lib/admin-config.ts) and the admin screen (src/admin/home-feed.ts), tested with plain tsx
// (scripts/test-home-pins.ts).
//
// A slot is a game tile of the home mosaic, counted from 0 in page order (the order of /home-slots.json). The rules:
// - a pinned game that is already somewhere else on the page swaps places with the game in its slot, so no game
//   disappears and none shows twice;
// - a pinned game that is not on the page takes its slot (the game that was there leaves the page);
// - unpinned slots keep the built order.
import type { Move } from './your-games-plan';

export interface Pin {
  /** Slot index, 0-based, in page order. */
  i: number;
  /** The pinned game. */
  slug: string;
}

export interface Slot {
  i: number;
  size: 'XL' | 'L' | 'S';
  /** The game the build puts in this slot. */
  slug: string;
}

// The moves that turn the built page into the pinned page. `slots` is the slug shown in every slot as built.
export function planPins(slots: readonly string[], pins: readonly Pin[]): Move[] {
  const now = [...slots];
  const moves: Move[] = [];
  const seen = new Set<string>();
  for (const pin of [...pins].sort((a, b) => a.i - b.i)) {
    if (pin.i < 0 || pin.i >= now.length || seen.has(pin.slug)) continue;
    seen.add(pin.slug);
    if (now[pin.i] === pin.slug) continue;
    const found = now.indexOf(pin.slug);
    if (found < 0) {
      now[pin.i] = pin.slug;
      moves.push({ target: pin.i, source: null, slug: pin.slug });
      continue;
    }
    [now[pin.i], now[found]] = [now[found], now[pin.i]];
    moves.push({ target: pin.i, source: found, slug: pin.slug });
  }
  return moves;
}

// What the page shows after the moves.
export function applyMoves(slots: readonly string[], moves: readonly Move[]): string[] {
  const out = [...slots];
  for (const m of moves) {
    if (m.source === null) out[m.target] = m.slug;
    else [out[m.target], out[m.source]] = [out[m.source], out[m.target]];
  }
  return out;
}

// The slugs shown in every slot for the given pins (what a visitor sees).
export function shownSlots(slots: readonly string[], pins: readonly Pin[]): string[] {
  return applyMoves(slots, planPins(slots, pins));
}

// Old hero entries become pins on the big slots (XL and L), in order (T10.17 migration).
export function heroToPins(hero: readonly string[], slots: readonly Slot[]): Pin[] {
  const big = slots.filter((s) => s.size === 'XL' || s.size === 'L').sort((a, b) => a.i - b.i);
  return hero.slice(0, big.length).map((slug, k) => ({ i: big[k].i, slug }));
}

// Pins as sent to the server: valid, one game per slot and one slot per game, at most `max`.
export function cleanPins(raw: readonly { i?: unknown; slug?: unknown }[], max = 300): Pin[] {
  const bySlot = new Map<number, string>();
  const slugs = new Set<string>();
  for (const p of raw) {
    if (typeof p.i !== 'number' || !Number.isInteger(p.i) || p.i < 0 || p.i >= max) continue;
    if (typeof p.slug !== 'string' || !/^[a-z0-9-]{1,100}$/.test(p.slug) || slugs.has(p.slug) || bySlot.has(p.i)) continue;
    bySlot.set(p.i, p.slug);
    slugs.add(p.slug);
  }
  return [...bySlot.entries()].map(([i, slug]) => ({ i, slug })).sort((a, b) => a.i - b.i);
}
