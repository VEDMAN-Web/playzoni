// Screen 11: Ads (docs/ADMIN.md §5.11, ADS-DATA §7). Structure only until AdSense is approved and connected (Phase 11):
// counts come from our own ad events (daily_ads), earnings only from the AdSense API import. No numbers are made up.
import type { ScreenBuilder } from '../handler';
import { ratio } from '../query';
import type { Kpi, Table } from '../screen';
import { num, one, rows, siteTotals } from '../stats';

export const buildAds: ScreenBuilder = async (db, r) => {
  const [t, site] = await Promise.all([
    one(db, 'SELECT SUM(requests) AS req, SUM(impressions) AS imp, SUM(viewable) AS vw, SUM(clicks) AS cl, SUM(earnings) AS earn, COUNT(earnings) AS n_earn, COUNT(*) AS n FROM daily_ads WHERE day BETWEEN ? AND ?', r.from, r.to),
    siteTotals(db, r, r.from, r.to),
  ]);
  const has = (num(t.n) ?? 0) > 0;
  const earn = (num(t.n_earn) ?? 0) > 0 ? num(t.earn) : null;
  const kpis: Kpi[] = [
    { id: 'requests', label: 'Ad requests', value: has ? num(t.req) : null, fmt: 'int' },
    { id: 'impressions', label: 'Impressions', value: has ? num(t.imp) : null, fmt: 'int' },
    { id: 'viewable', label: 'Viewable', value: has ? ratio(num(t.vw), num(t.imp)) : null, fmt: 'pct' },
    { id: 'clicks', label: 'Ad clicks', value: has ? num(t.cl) : null, fmt: 'int' },
    { id: 'earnings', label: 'Earnings', value: earn, fmt: 'money', note: earn === null ? 'Connect AdSense to see real earnings' : 'From AdSense' },
    { id: 'rpm', label: 'RPM (per 1,000 page views)', value: earn !== null && site.pageViews ? (earn / site.pageViews) * 1000 : null, fmt: 'money' },
  ];
  const by = async (col: string, label: string): Promise<Table> => ({
    id: `by-${col}`,
    title: `By ${label.toLowerCase()}`,
    columns: [
      { key: 'k', label },
      { key: 'imp', label: 'Impressions', fmt: 'int' },
      { key: 'viewable', label: 'Viewable', fmt: 'pct' },
      { key: 'clicks', label: 'Clicks', fmt: 'int' },
      { key: 'earn', label: 'Earnings', fmt: 'money' },
    ],
    rows: (
      await rows(
        db,
        `SELECT ${col} AS k, SUM(impressions) AS imp, SUM(viewable) AS vw, SUM(clicks) AS clicks,
                CASE WHEN COUNT(earnings) > 0 THEN SUM(earnings) END AS earn
         FROM daily_ads WHERE day BETWEEN ? AND ? GROUP BY 1 ORDER BY imp DESC LIMIT 30`,
        r.from,
        r.to,
      )
    ).map((x) => ({ ...x, viewable: ratio(num(x.vw), num(x.imp)) })),
    empty: 'No ads have run yet. Ads start after AdSense approval (Phase 11).',
  });
  return { kpis, tables: [await by('slot', 'Slot'), await by('country', 'Country'), await by('device', 'Device')] };
};
