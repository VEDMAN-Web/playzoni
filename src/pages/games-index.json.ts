import type { APIRoute } from 'astro';
import { getPublishedGames } from '../lib/games';

// Small index of every published game (slug, title, thumbnail). The favourites page and the
// "Recently played" row read it in the browser, so they can show tiles without a server.
export const GET: APIRoute = async () => {
  const games = await getPublishedGames();
  const index = games.map((g) => ({
    slug: g.data.slug,
    title: g.data.title,
    thumb: `/thumbs/${g.data.slug}/s.webp`,
  }));
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
