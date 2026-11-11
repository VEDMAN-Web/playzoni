// Collection logic for POST /api/e: the endpoint for the tracking script (docs/ADMIN.md §3, §7).
// Checks every event against the dictionary, adds country/region from Cloudflare and device/OS/browser from the
// User-Agent, drops bots, limits size and rate, then writes `events` and updates `sessions`.
// The IP address is never read or stored. No cookies. Cache-Control: no-store.
import { checkBatch, MAX_BODY_BYTES, type EventRow } from './events';
import { json } from './http';
import { isBot, parseUa } from './ua';
import { cfOf, type D1Database } from './types';

const COLUMNS: (keyof EventRow)[] = [
  'ts', 'day', 'vid', 'sid', 'name', 'path', 'page_type', 'lang', 'slug', 'list_id', 'position', 'country', 'region',
  'device', 'os', 'browser', 'ref_domain', 'utm_source', 'utm_medium', 'utm_campaign', 'value_num', 'value_text',
];
const INSERT = `INSERT INTO events (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})`;

// Rate limit per country + network (ASN), per Cloudflare isolate: at most 600 requests a minute. Best effort only;
// a Cloudflare rate-limiting rule can be added in the dashboard for more.
const LIMIT = 600;
const buckets = new Map<string, { minute: number; n: number }>();
export function rateLimited(key: string, now: number): boolean {
  const minute = Math.floor(now / 60000);
  const b = buckets.get(key);
  if (!b || b.minute !== minute) {
    if (buckets.size > 5000) buckets.clear();
    buckets.set(key, { minute, n: 1 });
    return false;
  }
  b.n++;
  return b.n > LIMIT;
}

const empty = (status = 204): Response => new Response(null, { status, headers: { 'cache-control': 'no-store' } });

export async function collect(request: Request, db: D1Database, now = Date.now()): Promise<Response> {
  const cf = cfOf(request);
  const ua = request.headers.get('user-agent') ?? '';
  if (isBot(ua, cf.botManagement?.verifiedBot, cf.botManagement?.score)) return empty();
  const country = /^[A-Z]{2}$/.test(cf.country ?? '') ? (cf.country as string) : 'XX';
  if (rateLimited(`${country}:${cf.asn ?? 0}`, now)) return json({ error: 'too many requests' }, 429);

  if (Number(request.headers.get('content-length') ?? '0') > MAX_BODY_BYTES) return json({ error: 'too large' }, 413);
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'too large' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'not JSON' }, 400);
  }

  const { device, os, browser } = parseUa(ua);
  const region = typeof cf.region === 'string' && cf.region.length <= 60 ? cf.region : null;
  const checked = checkBatch(body, { country, region, device, os, browser }, now);
  if (!checked.ok) return json({ error: checked.error }, checked.status);

  const s = checked.session;
  const statements = checked.rows.map((row) => db.prepare(INSERT).bind(...COLUMNS.map((c) => row[c])));
  if (checked.rows.length > 0 || s.engaged_s > 0) {
    statements.push(
      db
        .prepare(
          `INSERT INTO sessions (sid, vid, day, start_ts, end_ts, engaged_s, pages, plays, country, device, lang, ref_domain, utm_campaign, is_new)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(sid) DO UPDATE SET
             end_ts = MAX(sessions.end_ts, excluded.end_ts),
             engaged_s = sessions.engaged_s + excluded.engaged_s,
             pages = sessions.pages + excluded.pages,
             plays = sessions.plays + excluded.plays,
             ref_domain = COALESCE(sessions.ref_domain, excluded.ref_domain),
             utm_campaign = COALESCE(sessions.utm_campaign, excluded.utm_campaign),
             is_new = MAX(sessions.is_new, excluded.is_new)
           WHERE sessions.vid = excluded.vid`,
        )
        .bind(s.sid, s.vid, s.day, s.start_ts, s.end_ts, s.engaged_s, s.pages, s.plays, s.country, s.device, s.lang, s.ref_domain, s.utm_campaign, s.is_new),
    );
  }
  if (statements.length) await db.batch(statements);
  return checked.dropped > 0 ? json({ stored: checked.rows.length, dropped: checked.dropped }, 202) : empty();
}

