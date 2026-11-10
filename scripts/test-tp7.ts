// Self-test for the profile panel's play history rules (TP.7, docs/DESIGN.md §V2.9). Pure functions only.

import {
  MAX_STATS,
  SESSION_CAP_SECONDS,
  STEP_SECONDS,
  applyPlayStart,
  applyPlayTime,
  cleanStats,
  formatPlayTime,
  playedLabel,
  secondsToAdd,
} from '../src/lib/play-time';
import { finish, same } from './test-kit';

const DAY = 24 * 60 * 60 * 1000;

function testStats(): void {
  const t0 = new Date(2026, 10, 10, 15, 0, 0).getTime();
  const first = applyPlayStart({}, 'a', t0);
  same(first.a, { slug: 'a', firstPlayed: t0, lastPlayed: t0, plays: 1, seconds: 0 }, 'a first play creates the entry');
  const second = applyPlayStart(first, 'a', t0 + 1000);
  same([second.a.plays, second.a.firstPlayed, second.a.lastPlayed], [2, t0, t0 + 1000], 'a second play adds one play and moves last played');
  same(first.a.plays, 1, 'the old map is not changed (new objects only)');
  const timed = applyPlayTime(second, 'a', 5, t0 + 6000);
  same([timed.a.seconds, timed.a.lastPlayed], [5, t0 + 6000], 'time is added to the game');
  same(applyPlayTime(timed, 'a', 0, t0), timed, 'zero seconds change nothing');
  same(applyPlayTime({}, 'b', 5, t0).b.seconds, 5, 'time for a game without an entry creates one');

  let many = {};
  for (let i = 0; i < MAX_STATS + 10; i++) many = applyPlayStart(many, `g${i}`, t0 + i);
  same(Object.keys(many).length, MAX_STATS, 'only the newest 200 games are kept');
  same('g0' in many, false, 'the oldest game is dropped first');
}

function testTimeCap(): void {
  same(secondsToAdd(0), STEP_SECONDS, 'a step is 5 seconds');
  same(secondsToAdd(SESSION_CAP_SECONDS - 2), 2, 'the last step is cut to the cap');
  same(secondsToAdd(SESSION_CAP_SECONDS), 0, 'nothing more after 4 hours');
  same(SESSION_CAP_SECONDS, 14400, 'the cap is 4 hours');
}

function testFormats(): void {
  same([formatPlayTime(0), formatPlayTime(30), formatPlayTime(60), formatPlayTime(32 * 60 + 10)], ['0m', '<1m', '1m', '32m'], 'short times');
  same([formatPlayTime(2 * 3600 + 5 * 60), formatPlayTime(2 * 3600), formatPlayTime(-5)], ['2h 5m', '2h', '0m'], 'hours and bad input');
  const now = new Date(2026, 10, 10, 9, 0, 0).getTime();
  same(playedLabel(new Date(2026, 10, 10, 0, 5, 0).getTime(), now), 'Played today', 'earlier today');
  same(playedLabel(new Date(2026, 10, 9, 23, 55, 0).getTime(), now), 'Played yesterday', 'late last evening is yesterday');
  same(playedLabel(now - 3 * DAY, now), 'Played 3 days ago', 'three days ago');
  same(playedLabel(now + DAY, now), 'Played today', 'a clock in the future counts as today');
}

function testClean(): void {
  same(cleanStats(null), {}, 'null is empty');
  same(cleanStats('x'), {}, 'a string is empty');
  const good = { firstPlayed: 1, lastPlayed: 2, plays: 3, seconds: 4 };
  same(cleanStats({ a: good, b: { ...good, plays: 'x' }, c: { ...good, seconds: -1 }, d: 5 }), { a: { slug: 'a', ...good } }, 'only well-formed entries stay');
}

testStats();
testTimeCap();
testFormats();
testClean();
finish('test-tp7');
