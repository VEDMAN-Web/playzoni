// Screen 8: Acquisition (docs/ADMIN.md §5.8): channels, referrers, search engines (incl. Yandex and Bing), AI
// assistants (chatgpt.com, perplexity.ai, gemini, copilot), UTM campaigns, countries and languages.
import { AI_DOMAINS, CHANNEL_LABEL, channelOf, engineOf, type Channel } from '../channels';
import type { ScreenBuilder } from '../handler';
import { dayList, ratio } from '../query';
import type { Chart, Kpi, Table } from '../screen';
import { dailySite, NO_VISITS, num, prevSeries, rows, sessionsBy } from '../stats';

export const buildAcquisition: ScreenBuilder = async (db, r) => {
  const refs = await rows(
    db,
    `SELECT ref_domain AS ref, utm_source AS src, utm_medium AS med, utm_campaign AS camp, SUM(sessions) AS sessions, SUM(plays) AS plays
     FROM daily_referrer WHERE day BETWEEN ? AND ? GROUP BY 1, 2, 3, 4`,
    r.from,
    r.to,
  );
  const total = refs.reduce((s, x) => s + (num(x.sessions) ?? 0), 0);
  const byChannel = new Map<Channel, { sessions: number; plays: number }>();
  const byRef = new Map<string, { sessions: number; plays: number }>();
  const byEngine = new Map<string, { sessions: number; plays: number }>();
  const byAi = new Map<string, { sessions: number; plays: number }>();
  const byCamp = new Map<string, { src: string; med: string; camp: string; sessions: number; plays: number }>();
  const add = <K>(m: Map<K, { sessions: number; plays: number }>, k: K, s: number, p: number): void => {
    const cur = m.get(k) ?? { sessions: 0, plays: 0 };
    cur.sessions += s;
    cur.plays += p;
    m.set(k, cur);
  };
  for (const x of refs) {
    const ref = String(x.ref ?? '');
    const med = String(x.med ?? '');
    const s = num(x.sessions) ?? 0;
    const p = num(x.plays) ?? 0;
    const ch = channelOf(ref, med);
    add(byChannel, ch, s, p);
    if (ref) add(byRef, ref, s, p);
    if (ch === 'search' || (ch === 'campaign' && channelOf(ref) === 'search')) add(byEngine, engineOf(ref), s, p);
    if (ch === 'ai') add(byAi, ref, s, p);
    if (x.src || x.med || x.camp) {
      const key = `${String(x.src)}|${med}|${String(x.camp)}`;
      const cur = byCamp.get(key) ?? { src: String(x.src ?? ''), med, camp: String(x.camp ?? ''), sessions: 0, plays: 0 };
      cur.sessions += s;
      cur.plays += p;
      byCamp.set(key, cur);
    }
  }
  const share = (c: Channel): number | null => (total ? (byChannel.get(c)?.sessions ?? 0) / total : null);
  const kpis: Kpi[] = [
    { id: 'sessions', label: 'Sessions', value: total || null, fmt: 'int' },
    { id: 'search', label: 'From search engines', value: share('search'), fmt: 'pct' },
    { id: 'ai', label: 'From AI assistants', value: share('ai'), fmt: 'pct' },
    { id: 'direct', label: 'Direct or unknown', value: share('direct'), fmt: 'pct' },
  ];
  const list = <T extends { sessions: number; plays: number }>(m: Map<string, T>, key: string): Record<string, string | number | null>[] =>
    [...m.entries()]
      .map(([k, v]) => ({ [key]: k, sessions: v.sessions, plays: v.plays, pps: ratio(v.plays, v.sessions) }))
      .sort((a, b) => Number(b.sessions) - Number(a.sessions))
      .slice(0, 25);
  const cols = (key: string, label: string): Table['columns'] => [
    { key, label },
    { key: 'sessions', label: 'Sessions', fmt: 'int' },
    { key: 'plays', label: 'Plays', fmt: 'int' },
    { key: 'pps', label: 'Plays per session', fmt: 'dec' },
  ];
  const series = [{ name: 'Sessions', values: await dailySite(db, r, r.from, r.to, 'sessions') }];
  if (r.compare) series.push(await prevSeries(db, r, 'sessions', 'Sessions, previous period'));
  const charts: Chart[] = [{ id: 'sessions', title: 'Sessions per day', x: dayList(r.from, r.to), series, empty: NO_VISITS }];
  const [countries, langs] = await Promise.all([sessionsBy(db, r, 'country', 25), sessionsBy(db, r, 'lang', 25)]);
  const channels = [...byChannel.entries()].map(([c, v]) => ({ channel: CHANNEL_LABEL[c], sessions: v.sessions, plays: v.plays, pps: ratio(v.plays, v.sessions) })).sort((a, b) => b.sessions - a.sessions);
  const tables: Table[] = [
    { id: 'channels', title: 'Channels', columns: cols('channel', 'Channel'), rows: channels, empty: NO_VISITS },
    { id: 'engines', title: 'Search engines', columns: cols('engine', 'Engine'), rows: list(byEngine, 'engine'), empty: 'No visits from search engines in these dates.' },
    {
      id: 'ai',
      title: 'AI assistants',
      columns: cols('ref', 'Assistant'),
      rows: list(byAi, 'ref'),
      empty: `No visits from AI assistants in these dates. Counted: ${AI_DOMAINS.slice(0, 5).join(', ')}.`,
    },
    { id: 'referrers', title: 'Referring websites', columns: cols('ref', 'Website'), rows: list(byRef, 'ref'), empty: 'No visits from other websites in these dates.' },
    {
      id: 'campaigns',
      title: 'UTM campaigns',
      columns: [
        { key: 'src', label: 'Source' },
        { key: 'med', label: 'Medium' },
        { key: 'camp', label: 'Campaign' },
        { key: 'sessions', label: 'Sessions', fmt: 'int' },
        { key: 'plays', label: 'Plays', fmt: 'int' },
      ],
      rows: [...byCamp.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 25),
      empty: 'No campaign links (utm_source, utm_medium, utm_campaign) were used in these dates.',
    },
    { id: 'countries', title: 'Countries', columns: [{ key: 'k', label: 'Country' }, { key: 'visitors', label: 'Visitors', fmt: 'int' }, { key: 'sessions', label: 'Sessions', fmt: 'int' }, { key: 'plays', label: 'Plays', fmt: 'int' }], rows: countries, empty: NO_VISITS },
    { id: 'languages', title: 'Languages', columns: [{ key: 'k', label: 'Language' }, { key: 'visitors', label: 'Visitors', fmt: 'int' }, { key: 'sessions', label: 'Sessions', fmt: 'int' }, { key: 'plays', label: 'Plays', fmt: 'int' }], rows: langs, empty: NO_VISITS },
  ];
  return { kpis, charts, tables };
};
