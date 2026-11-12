import type { APIRoute } from 'astro';
import { getPublishedGames } from '../lib/games';

// Small index of every published game (slug, title, thumbnail, date added, categories, up to 5 tags), most popular first. The
// favourites page, the "Recently played" row, the search panel and the endless rows (GameRow `more`) read it in the
// browser, so they can show tiles without a server.
export const GET: APIRoute = async () => {
  const games = [...(await getPublishedGames())].sort((a, b) => b.data.popularity - a.data.popularity);
  const index = games.map((g) => ({
    slug: g.data.slug,
    title: g.data.title,
    thumb: `/thumbs/${g.data.slug}/s.webp`,
    added: g.data.addedDate.toISOString().slice(0, 10),
    cats: g.data.categories,
    t: g.data.tags.slice(0, 5), // T9.6: tags for "Because you played X"
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
