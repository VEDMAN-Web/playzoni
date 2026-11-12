// Build data for the admin (docs/ADMIN.md §5.5): categories from data/categories.json with their SEO page text and FAQ
// (src/content/categories), and how many games each has. Served at /admin/data/categories.json behind Access.
import { getCollection } from 'astro:content';
import { categories } from '../../../lib/categories';

export async function GET(): Promise<Response> {
  const [texts, games] = await Promise.all([getCollection('categories'), getCollection('games')]);
  const bySlug = new Map(texts.map((t) => [t.id, t]));
  const list = categories.map((c) => ({
    ...c,
    body: bySlug.get(c.slug)?.body ?? '',
    faq: bySlug.get(c.slug)?.data.faq ?? [],
    published: games.filter((g) => g.data.status === 'published' && !g.data.sample && g.data.categories.includes(c.slug)).length,
    drafts: games.filter((g) => g.data.status === 'draft' && g.data.categories.includes(c.slug)).length,
  }));
  return new Response(JSON.stringify(list), { headers: { 'content-type': 'application/json' } });
}
