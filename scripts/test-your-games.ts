// Self-test for the "Your games" move plan (T5.10, src/lib/your-games-plan.ts). Pure function only.
import { planSwaps } from '../src/lib/your-games-plan';
import { finish, same } from './test-kit';

// A small home grid: big tiles at 1 and 4 (L), small tiles at the other positions.
const slots = ['a', 'big1', 'b', 'c', 'big2', 'd', 'e', 'f', 'g', 'h'];
const small = [0, 2, 3, 5, 6, 7, 8, 9];

function apply(list: string[], moves: [number, number][]): string[] {
  const out = [...list];
  for (const [t, s] of moves) [out[t], out[s]] = [out[s], out[t]];
  return out;
}

function testMoves(): void {
  const after = apply(slots, planSwaps(slots, small, ['g', 'h', 'big1']));
  same([after[0], after[2], after[3]], ['g', 'h', 'big1'], 'played games fill the first small tiles, newest first');
  same([...after].sort(), [...slots].sort(), 'nothing is added, removed or repeated');
}

function testNoop(): void {
  same(planSwaps(slots, small, []), [], 'first visit: nothing moves');
  same(planSwaps(slots, small, ['zzz']), [], 'a game not on the page is ignored');
  same(planSwaps(slots, small, ['a']), [], 'a game already in its first place is left alone');
}

function testOnlySmallTargets(): void {
  const moves = planSwaps(slots, small, ['g', 'h', 'big1', 'd', 'e', 'f']);
  same(moves.every(([t]) => small.includes(t)), true, 'only small tiles receive a game');
  same([...apply(slots, moves)].sort(), [...slots].sort(), 'a game moved out of a big tile is replaced by the one it swapped with, so nothing is lost');
}

function testLimit(): void {
  const moves = planSwaps(slots, small, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  same(moves.length <= 6, true, 'at most six games are moved');
}

testMoves();
testNoop();
testOnlySmallTargets();
testLimit();
finish('test-your-games');
