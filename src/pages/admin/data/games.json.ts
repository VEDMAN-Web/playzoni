// Build data for the admin (docs/ADMIN.md §5.3, §5.4): every game (drafts too) with all its fields and its QA verdict.
// Served at /admin/data/games.json, behind Cloudflare Access like the rest of /admin.
import { getCollection } from 'astro:content';

const qaFiles = import.meta.glob<{ verdict?: string; date?: string }>('../../../../data/qa/*.json', { eager: true, import: 'default' });
const qa = new Map(
  Object.entries(qaFiles)
    .filter(([path]) => !path.endsWith('_template.json'))
    .map(([path, data]) => [path.split('/').pop()?.replace(/\.json$/, '') ?? '', data]),
);

export async function GET(): Promise<Response> {
  const games = await getCollection('games');
  const list = games
    .map((g) => ({
      ...g.data,
      releaseDate: g.data.releaseDate?.toISOString().slice(0, 10),
      addedDate: g.data.addedDate.toISOString().slice(0, 10),
      updatedDate: g.data.updatedDate.toISOString().slice(0, 10),
      qa: qa.get(g.data.slug)?.verdict ?? 'none',
    }))
    .sort((a, b) => b.popularity - a.popularity);
  return new Response(JSON.stringify(list), { headers: { 'content-type': 'application/json' } });
}
