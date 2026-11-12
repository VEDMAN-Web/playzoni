// Instant game flags and the hero list (docs/ADMIN.md §2 "instant", §4 game_flags + home_layout).
// The hero order lives in home_layout (item_type 'hero') per language; game_flags.hero_rank mirrors the list for
// all languages ('*'), so the Games table can show it.
import type { D1Database, D1PreparedStatement } from './types';

export async function heroList(db: D1Database, lang: string): Promise<string[]> {
  const res = await db
    .prepare("SELECT ref FROM home_layout WHERE lang = ? AND item_type = 'hero' AND active = 1 ORDER BY position")
    .bind(lang)
    .all<{ ref: string }>();
  return res.results.map((r) => r.ref);
}

/** Statements that replace the hero list of one language (and mirror '*' into game_flags.hero_rank). */
export function heroStatements(db: D1Database, lang: string, slugs: string[], sizes: Record<string, string> = {}): D1PreparedStatement[] {
  const out: D1PreparedStatement[] = [db.prepare("DELETE FROM home_layout WHERE lang = ? AND item_type = 'hero'").bind(lang)];
  slugs.forEach((slug, i) => {
    out.push(
      db
        .prepare("INSERT INTO home_layout (lang, item_type, ref, position, size, active) VALUES (?, 'hero', ?, ?, ?, 1)")
        .bind(lang, slug, i + 1, sizes[slug] ?? null),
    );
  });
  if (lang === '*') {
    out.push(db.prepare('UPDATE game_flags SET hero_rank = NULL WHERE hero_rank IS NOT NULL'));
    slugs.forEach((slug, i) => {
      out.push(
        db
          .prepare('INSERT INTO game_flags (slug, hero_rank) VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET hero_rank = excluded.hero_rank')
          .bind(slug, i + 1),
      );
    });
  }
  return out;
}
