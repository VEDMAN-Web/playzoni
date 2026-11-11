// What the public site may know about the admin's instant settings (docs/ADMIN.md §2 "instant"): hidden and featured
// games, hero order and row order per language, banners for today, notice bar, maintenance message, feature flags.
// Nothing about visitors or the team.
import { readSettings, type Json } from './settings';
import type { D1Database } from './types';
import { dayOf } from './validate';

export interface PublicConfig {
  v: 1;
  hidden: string[];
  featured: string[];
  hero: Record<string, string[]>;
  /** Home feed pins (T10.17): slot index and game, per language. */
  slots: Record<string, { i: number; slug: string }[]>;
  rows: Record<string, { id: string; active: boolean }[]>;
  banners: { id: number; lang: string; text: string; link: string | null; pages: string[] }[];
  notice: { text: string; link: string | null } | null;
  maintenance: { text: string } | null;
  flags: Json;
}

export async function buildConfig(db: D1Database, now = Date.now()): Promise<PublicConfig> {
  const today = dayOf(now);
  const [flags, layout, banners, settings] = await Promise.all([
    db.prepare('SELECT slug, hidden, featured FROM game_flags WHERE hidden = 1 OR featured = 1').all<{ slug: string; hidden: number; featured: number }>(),
    db.prepare("SELECT lang, item_type, ref, position, active FROM home_layout WHERE item_type IN ('hero', 'row', 'slot') ORDER BY lang, item_type, position").all<{ lang: string; item_type: string; ref: string; position: number; active: number }>(),
    db
      .prepare(
        `SELECT id, lang, text, link, pages FROM banners
         WHERE active = 1 AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at >= ?) ORDER BY id LIMIT 5`,
      )
      .bind(today, today)
      .all<{ id: number; lang: string; text: string; link: string | null; pages: string }>(),
    readSettings(db),
  ]);
  const hero: Record<string, string[]> = {};
  const rows: Record<string, { id: string; active: boolean }[]> = {};
  const slots: Record<string, { i: number; slug: string }[]> = {};
  for (const r of layout.results) {
    if (r.item_type === 'slot' && r.active) (slots[r.lang] ??= []).push({ i: r.position, slug: r.ref });
    if (r.item_type === 'hero' && r.active) (hero[r.lang] ??= []).push(r.ref);
    if (r.item_type === 'row') (rows[r.lang] ??= []).push({ id: r.ref, active: r.active === 1 });
  }
  const notice = settings.notice as { active?: boolean; text?: string; link?: string | null };
  const maintenance = settings.maintenance as { active?: boolean; text?: string };
  return {
    v: 1,
    hidden: flags.results.filter((f) => f.hidden === 1).map((f) => f.slug),
    featured: flags.results.filter((f) => f.featured === 1).map((f) => f.slug),
    hero,
    slots,
    rows,
    banners: banners.results.map((b) => ({ id: b.id, lang: b.lang, text: b.text, link: b.link, pages: b.pages.split(',').map((p) => p.trim()).filter(Boolean) })),
    notice: notice?.active && notice.text ? { text: notice.text, link: notice.link ?? null } : null,
    maintenance: maintenance?.active && maintenance.text ? { text: maintenance.text } : null,
    flags: settings.flags,
  };
}
