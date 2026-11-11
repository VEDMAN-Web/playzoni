// T10.9: instant controls. /api/config shows only what the public may see; settings are checked; the hero list is
// mirrored into game_flags; banners respect their dates.
import { buildConfig } from '../../functions/api/_lib/config';
import { heroList, heroStatements } from '../../functions/api/_lib/flags';
import { SETTINGS } from '../../functions/api/_lib/settings';
import { expect, finish, same } from '../test-kit';
import { openDb } from './d1-shim';

const db = openDb();
const NOW = Date.parse('2026-11-11T12:00:00Z');
await db.batch(heroStatements(db, '*', ['a', 'b', 'c']));
same(await heroList(db, '*'), ['a', 'b', 'c'], 'hero order saved');
same((await db.prepare('SELECT slug, hero_rank FROM game_flags ORDER BY hero_rank').all()).results.map((r) => [r.slug, r.hero_rank]), [['a', 1], ['b', 2], ['c', 3]], 'hero mirrored into game_flags');
await db.batch(heroStatements(db, '*', ['c', 'a']));
same((await db.prepare('SELECT slug FROM game_flags WHERE hero_rank IS NOT NULL ORDER BY hero_rank').all()).results.map((r) => r.slug), ['c', 'a'], 'removed game loses its hero rank');
await db.batch(heroStatements(db, 'pl', ['b']));
await db.exec(`INSERT INTO game_flags (slug, hidden) VALUES ('x', 1);
  INSERT INTO banners (text, starts_at, ends_at, pages) VALUES ('now', '2026-11-01', '2026-11-30', 'home,game'), ('old', '2026-10-01', '2026-10-31', '*'), ('later', '2026-12-01', NULL, '*');
  INSERT INTO banners (text, active) VALUES ('off', 0);
  INSERT INTO settings (key, value) VALUES ('notice', '{"active":true,"text":"Hello","link":"/new-games"}'), ('maintenance', '{"active":false,"text":"x"}');
  INSERT INTO team (email, role) VALUES ('secret@example.com', 'owner');
  INSERT INTO home_layout (lang, item_type, ref, position, active) VALUES ('*', 'row', 'new-games', 1, 1), ('*', 'row', 'popular-games', 2, 0);`);
const cfg = await buildConfig(db, NOW);
same(cfg.hidden, ['x'], 'hidden games');
same(cfg.hero, { '*': ['c', 'a'], pl: ['b'] }, 'hero per language');
same(cfg.rows['*'], [{ id: 'new-games', active: true }, { id: 'popular-games', active: false }], 'rows order and on/off');
same(cfg.banners.map((b) => [b.text, b.pages]), [['now', ['home', 'game']]], 'only banners active today');
same(cfg.notice, { text: 'Hello', link: '/new-games' }, 'notice on');
same(cfg.maintenance, null, 'maintenance off');
expect(!JSON.stringify(cfg).includes('example.com'), 'no team emails in the public config');

// Settings checks.
same(SETTINGS.retention.check({ rawDays: 45 }), 'raw data can be kept 30, 60 or 90 days', 'retention only 30/60/90');
same(SETTINGS.notice.check({ active: true, text: '' }), 'the notice needs text', 'active notice needs text');
same(SETTINGS.notice.check({ active: true, text: 'Big news — new games', link: 'javascript:alert(1)' }), { active: true, text: 'Big news , new games', link: null }, 'long dash removed and unsafe link dropped');
same(SETTINGS.flags.check({ hoverPreview: false, junk: 1 }), { hoverPreview: false, playedBadge: true, abTests: false }, 'unknown flag keys dropped');
same(SETTINGS.notice.role, 'editor', 'editors may change the notice');
same(SETTINGS.flags.role, 'owner', 'only owners change feature flags');
finish('test-controls');
