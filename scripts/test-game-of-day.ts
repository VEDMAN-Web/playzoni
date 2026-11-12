// T9.5: the Game of the day pick is the same for the same UTC day, changes the next day, and ignores time zones.
import { dayNumber, pickIndex, upcomingPicks } from '../src/lib/game-of-day';
import { expect, finish, same } from './test-kit';

const games = ['delta', 'alpha', 'echo', 'charlie', 'bravo'].map((slug) => ({ slug, title: slug.toUpperCase() }));

// Same UTC day, different hours (and the same instant written in two time zones) give the same day number.
const morning = Date.parse('2026-11-12T00:05:00Z');
const night = Date.parse('2026-11-12T23:55:00Z');
const india = Date.parse('2026-11-12T23:55:00+05:30'); // 18:25 UTC, still 12 Nov
same(dayNumber(morning), dayNumber(night), 'same UTC day gives the same day number');
same(dayNumber(india), dayNumber(morning), 'a time written in India time maps to its UTC day');
same(dayNumber(Date.parse('2026-01-01T00:00:00Z')), 0, 'day 0 is 2026-01-01');

const today = upcomingPicks(games, dayNumber(morning), 2);
same(upcomingPicks(games, dayNumber(night), 1)[0], today[0], 'same day, same pick');
expect(today[0].slug !== today[1].slug, `next day gives a different pick (${today[0].slug} then ${today[1].slug})`);
same(upcomingPicks([...games].reverse(), dayNumber(morning), 1)[0], today[0], 'input order does not matter (sorted by slug)');
expect(pickIndex(-3, 5) >= 0 && pickIndex(-3, 5) < 5, 'index stays in range for days before 2026');
same(upcomingPicks([], 10), [], 'no eligible games, no picks');
same(upcomingPicks(games, 100, 14).length, 14, '14 days of picks');

finish('test-game-of-day');
