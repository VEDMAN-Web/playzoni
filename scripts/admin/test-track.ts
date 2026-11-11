// T10.2: session and batching rules of the tracking script (src/lib/track-rules.ts).
import { IDLE_MS, MAX_BATCH, pageType, sessionFor, splitBatches } from '../../src/lib/track-rules';
import { finish, same } from '../test-kit';

const t0 = 1_800_000_000_000;
same(sessionFor(t0, 0, null, 'n1'), { sid: 'n1', fresh: true }, 'no session yet -> new');
same(sessionFor(t0, t0 - 1000, 'old', 'n2'), { sid: 'old', fresh: false }, 'active session kept');
same(sessionFor(t0, t0 - IDLE_MS, 'old', 'n3'), { sid: 'old', fresh: false }, 'exactly 30 min idle keeps the session');
same(sessionFor(t0, t0 - IDLE_MS - 1, 'old', 'n4'), { sid: 'n4', fresh: true }, 'more than 30 min idle -> new session');
same(sessionFor(t0, 0, 'old', 'n5'), { sid: 'n5', fresh: true }, 'unknown last activity -> new session');

same(splitBatches([]).length, 0, 'empty queue sends nothing');
same(splitBatches(Array.from({ length: 50 }, (_, i) => i)).length, 1, '50 events = 1 request');
const big = splitBatches(Array.from({ length: 121 }, (_, i) => i));
same(big.map((b) => b.length), [MAX_BATCH, MAX_BATCH, 21], '121 events = 50 + 50 + 21');
same(big.flat().length, 121, 'no event lost when splitting');

same(pageType('/'), 'home', 'home');
same(pageType('/game/abc'), 'game', 'game');
same(pageType('/car-games'), 'category', 'category');
same(pageType('/car-games/2'), 'category', 'category page 2');
same(pageType('/new-games'), 'list', 'list');
same(pageType('/popular-games/3'), 'list', 'list page 3');
same(pageType('/favourites'), 'favourites', 'other page by first segment');
finish('test-track');
