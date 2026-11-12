// Screen 4: one game's stats over time (docs/ADMIN.md §5.4). ?slug=<game>
import type { ScreenBuilder } from '../handler';
import { dayList, ratio } from '../query';
import type { Chart, Kpi, Table } from '../screen';
import { num, one, rawCovers, rows } from '../stats';
import { slug as slugOf } from '../validate';

export const buildGame: ScreenBuilder = async (db, r, url) => {
  const slug = slugOf(url.searchParams.get('slug')) ?? '';
  const lang = r.lang ?? '*';
  const sum = (from: string, to: string): Promise<Record<string, number | string | null>> =>
    one(
      db,
      `SELECT SUM(impressions) AS imp, SUM(clicks) AS clicks, SUM(plays) AS plays, SUM(plays_30s) AS p30, SUM(play_s) AS ps,
              SUM(errors) AS errors, SUM(favourites) AS fav, COUNT(*) AS n
       FROM daily_game WHERE slug = ? AND lang = ? AND day BETWEEN ? AND ?`,
      slug,
      lang,
      from,
      to,
    );
  const [t, p, perDay, flags] = await Promise.all([
    sum(r.from, r.to),
    r.compare ? sum(r.prevFrom, r.prevTo) : null,
    rows(db, 'SELECT day, plays, clicks, plays_30s FROM daily_game WHERE slug = ? AND lang = ? AND day BETWEEN ? AND ?', slug, lang, r.from, r.to),
    one(db, 'SELECT hidden, featured, hero_rank FROM game_flags WHERE slug = ?', slug),
  ]);
  const has = (x: Record<string, number | string | null> | null): boolean => (num(x?.n ?? null) ?? 0) > 0;
  const v = (x: Record<string, number | string | null> | null, k: string): number | null => (x && has(x) ? num(x[k]) : null);
  const prev = (k: string): number | null | undefined => (r.compare ? v(p, k) : undefined);
  const rate = (x: Record<string, number | string | null> | null, a: string, b: string): number | null => (x && has(x) ? ratio(num(x[a]), num(x[b])) : null);
  const kpis: Kpi[] = [
    { id: 'imp', label: 'Impressions', value: v(t, 'imp'), prev: prev('imp'), fmt: 'int', note: 'Sampled 20%, shown x5' },
    { id: 'clicks', label: 'Clicks', value: v(t, 'clicks'), prev: prev('clicks'), fmt: 'int' },
    { id: 'ctr', label: 'CTR', value: rate(t, 'clicks', 'imp'), prev: r.compare ? rate(p, 'clicks', 'imp') : undefined, fmt: 'pct' },
    { id: 'plays', label: 'Plays', value: v(t, 'plays'), prev: prev('plays'), fmt: 'int' },
    { id: 'p30', label: '30 second rate', value: rate(t, 'p30', 'plays'), prev: r.compare ? rate(p, 'p30', 'plays') : undefined, fmt: 'pct' },
    { id: 'avg', label: 'Avg play time', value: rate(t, 'ps', 'plays'), prev: r.compare ? rate(p, 'ps', 'plays') : undefined, fmt: 'sec' },
    { id: 'errors', label: 'Errors reported', value: v(t, 'errors'), prev: prev('errors'), fmt: 'int' },
    { id: 'fav', label: 'Favourites added', value: v(t, 'fav'), prev: prev('fav'), fmt: 'int' },
  ];
  const days = dayList(r.from, r.to);
  const by = new Map(perDay.map((x) => [String(x.day), x]));
  const col = (k: string): (number | null)[] => days.map((d) => num(by.get(d)?.[k] ?? null));
  const charts: Chart[] = [
    {
      id: 'game-days',
      title: 'Plays and clicks per day',
      x: days,
      series: [
        { name: 'Plays', values: col('plays') },
        { name: 'Clicks', values: col('clicks') },
      ],
      empty: 'No activity for this game in these dates.',
    },
  ];
  const tables: Table[] = [];
  if (rawCovers(r.from)) {
    const lists = await rows(
      db,
      `SELECT list_id, SUM(name IN ('tile_click', 'search_click')) AS clicks, CAST(ROUND(SUM(CASE WHEN name = 'tile_impression' THEN COALESCE(value_num, 1) ELSE 0 END)) AS INTEGER) AS impressions
       FROM events WHERE slug = ? AND day BETWEEN ? AND ? AND list_id IS NOT NULL AND name IN ('tile_click', 'search_click', 'tile_impression')
       GROUP BY 1 ORDER BY clicks DESC`,
      slug,
      r.from,
      r.to,
    );
    tables.push({
      id: 'game-lists',
      title: 'Where players found it',
      columns: [
        { key: 'list_id', label: 'List' },
        { key: 'impressions', label: 'Impressions', fmt: 'int' },
        { key: 'clicks', label: 'Clicks', fmt: 'int' },
      ],
      rows: lists,
      empty: 'No tile clicks for this game in these dates.',
    });
  }
  tables.push({
    id: 'flags',
    title: 'Instant flags',
    columns: [
      { key: 'hidden', label: 'Hidden', fmt: 'bool' },
      { key: 'featured', label: 'Featured', fmt: 'bool' },
      { key: 'hero_rank', label: 'Hero rank', fmt: 'int' },
    ],
    rows: Object.keys(flags).length ? [flags] : [],
    empty: 'No instant flags set for this game.',
  });
  return { kpis, charts, tables };
};
