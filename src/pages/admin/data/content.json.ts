// Build data for the Content and SEO screen (docs/ADMIN.md §5.10): every game and category page with its language,
// whether it is indexable, title and description lengths, word counts, the checks the validator applies, and when it
// was last updated. Served at /admin/data/content.json behind Cloudflare Access.
import { getCollection } from 'astro:content';
import { categories } from '../../../lib/categories';
import { buildCategoryTitle, buildGameTitle } from '../../../lib/seo';
import { CATEGORY_FAQ, CATEGORY_TEXT_WORDS, DESCRIPTION_RANGE, GAME_BODY_WORDS, GAME_FAQ, TITLE_MAX, bannedWordsIn } from '../../../../scripts/validate/rules';

const words = (text: string): number => (text.replace(/<!--[\s\S]*?-->/g, ' ').match(/[A-Za-z0-9À-ɏ']+/g) ?? []).length;

export async function GET(): Promise<Response> {
  const [games, texts] = await Promise.all([getCollection('games'), getCollection('categories')]);
  const includeSamples = import.meta.env.PUBLIC_INCLUDE_SAMPLES === 'true';
  const pages: Record<string, string | number | boolean | null>[] = [];
  for (const g of games) {
    const d = g.data;
    const title = buildGameTitle(d.title);
    const count = words(`${d.intro} ${g.body ?? ''}`);
    const problems: string[] = [];
    if (title.length > TITLE_MAX) problems.push(`title over ${TITLE_MAX}`);
    if (d.description.length < DESCRIPTION_RANGE.min || d.description.length > DESCRIPTION_RANGE.max) problems.push('description length');
    if (count < GAME_BODY_WORDS.min || count > GAME_BODY_WORDS.max) problems.push(`words ${GAME_BODY_WORDS.min} to ${GAME_BODY_WORDS.max}`);
    if (d.faq.length < GAME_FAQ.min) problems.push('FAQ');
    if (bannedWordsIn(`${d.title} ${d.description} ${d.intro} ${g.body ?? ''}`).length) problems.push('banned word');
    const indexable = d.status === 'published' && (!d.sample || includeSamples);
    pages.push({
      path: `/game/${d.slug}`,
      type: 'game',
      lang: 'en',
      status: d.sample ? 'sample' : d.status,
      indexable,
      titleLength: title.length,
      descriptionLength: d.description.length,
      words: count,
      faq: d.faq.length,
      checks: d.status === 'published' ? (problems.length ? problems.join(', ') : 'ok') : `draft: ${problems.length} to fix`,
      updated: d.updatedDate.toISOString().slice(0, 10),
    });
  }
  const textBy = new Map(texts.map((t) => [t.id, t]));
  for (const c of categories) {
    const t = textBy.get(c.slug);
    const count = words(t?.body ?? '');
    const faq = t?.data.faq.length ?? 0;
    const problems: string[] = [];
    const title = buildCategoryTitle(c.name);
    if (title.length > TITLE_MAX) problems.push(`title over ${TITLE_MAX}`);
    if (count < CATEGORY_TEXT_WORDS.min || count > CATEGORY_TEXT_WORDS.max) problems.push(`words ${CATEGORY_TEXT_WORDS.min} to ${CATEGORY_TEXT_WORDS.max}`);
    if (faq < CATEGORY_FAQ.min) problems.push('FAQ');
    const published = games.filter((g) => g.data.status === 'published' && (!g.data.sample || includeSamples) && g.data.categories.includes(c.slug)).length;
    pages.push({
      path: `/${c.slug}`,
      type: 'category',
      lang: 'en',
      status: published ? 'published' : 'no games yet',
      indexable: published > 0,
      titleLength: title.length,
      descriptionLength: c.description.length,
      words: count,
      faq,
      checks: problems.length ? problems.join(', ') : 'ok',
      updated: null,
    });
  }
  return new Response(JSON.stringify(pages), { headers: { 'content-type': 'application/json' } });
}
