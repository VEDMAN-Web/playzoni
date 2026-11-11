// Self-test for the "Your games" move plan (T5.10 and R45, src/lib/your-games-plan.ts). Pure function only.
import { planSwaps, type Move } from '../src/lib/your-games-plan';
import { finish, same } from './test-kit';

// A small home grid: big tiles at 1 and 4 (L), small tiles at the other positions.
const slots = ['a', 'big1', 'b', 'c', 'big2', 'd', 'e', 'f', 'g', 'h'];
const small = [0, 2, 3, 5, 6, 7, 8, 9];

// Replays the moves on a copy of the page, the way the browser does.
function apply(list: string[], moves: Move[]): string[] {
  const out = [...list];
  for (const m of moves) {
    if (m.source === null) out[m.target] = m.slug;
    else [out[m.target], out[m.source]] = [out[m.source], out[m.target]];
  }
  return out;
}

function testMoves(): void {
  const after = apply(slots, planSwaps(slots, small, ['g', 'h', 'big1']));
  same([after[0], after[2], after[3]], ['g', 'h', 'big1'], 'played games fill the first small tiles, newest first');
  same([...after].sort(), [...slots].sort(), 'nothing is added, removed or repeated');
}

function testNoop(): void {
  same(planSwaps(slots, small, []), [], 'first visit: nothing moves');
  same(planSwaps(slots, small, ['a']), [], 'a game already in its first place is left alone');
}

function testOnlySmallTargets(): void {
  const moves = planSwaps(slots, small, ['g', 'h', 'big1', 'd', 'e', 'f']);
  same(moves.every((m) => small.includes(m.target)), true, 'only small tiles receive a game');
  same([...apply(slots, moves)].sort(), [...slots].sort(), 'a game moved out of a big tile is replaced by the one it swapped with, so nothing is lost');
}

function testLimit(): void {
  const moves = planSwaps(slots, small, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  same(moves.length <= 6, true, 'at most six games are moved');
}

// R45: a played game that is not on the page takes the target tile and appears nowhere else.
function testOffPage(): void {
  const moves = planSwaps(slots, small, ['street-race-master', 'taxi-rush', 'chill-tic-tac-toe']);
  same(moves[0], { target: 0, source: null, slug: 'street-race-master' }, 'the newest game, not on the page, takes the first small tile');
  const after = apply(slots, moves);
  same(after[0], 'street-race-master', 'the first small tile shows the newest played game');
  same(after.filter((s) => s === 'street-race-master').length, 1, 'it appears once');
  same(after.length, slots.length, 'the page keeps the same number of tiles');
  const twice = apply(slots, planSwaps(slots, small, ['x', 'y', 'x']));
  same(twice.filter((s) => s === 'x').length, 1, 'a game listed twice is not repeated');
}

// The game pushed out by an off-page game can still be a played game later in the list.
function testDisplacedPlayed(): void {
  const moves = planSwaps(slots, small, ['new1', 'a']);
  const after = apply(slots, moves);
  same(after[0], 'new1', 'the off-page game takes the first small tile');
  same(after[2], 'a', 'a played game that was just pushed out comes back in its own place, once');
  same(after.filter((s) => s === 'a').length, 1, 'no game is repeated');
}

testMoves();
testNoop();
testOnlySmallTargets();
testLimit();
testOffPage();
testDisplacedPlayed();
finish('test-your-games');
