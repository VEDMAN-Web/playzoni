// Self-test for the TP.6 pure helpers: hover preview plan, preview fields and the category picture pick.
// (docs/DESIGN.md §V2.8). The browser parts (hover, played badge, search panel) are checked by hand and with screenshots.

import { popularSlugIn } from '../src/lib/category-image';
import { MAX_SCREENSHOTS, parseScreenshots, previewFields, previewPlan } from '../src/lib/preview';
import { finish, same } from './test-kit';

function testPlan(): void {
  same(previewPlan('/thumbs/a/p.mp4', ['/thumbs/a/1.webp']), { kind: 'video', src: '/thumbs/a/p.mp4', screenshots: ['/thumbs/a/1.webp'] }, 'a video wins; screenshots stay as its fallback');
  same(previewPlan(undefined, ['/thumbs/a/1.webp', '/thumbs/a/2.webp']), { kind: 'screenshots', screenshots: ['/thumbs/a/1.webp', '/thumbs/a/2.webp'] }, 'no video: screenshots');
  same(previewPlan(undefined, undefined), { kind: 'zoom' }, 'nothing: slow zoom');
  same(previewPlan(undefined, []), { kind: 'zoom' }, 'empty screenshots: slow zoom');
  same(previewPlan(undefined, ['', '']), { kind: 'zoom' }, 'blank screenshot paths are ignored');
  const many = ['1', '2', '3', '4', '5', '6'].map((n) => `/thumbs/a/${n}.webp`);
  same(previewPlan(undefined, many).kind === 'screenshots' && (previewPlan(undefined, many) as { screenshots: string[] }).screenshots.length, MAX_SCREENSHOTS, 'at most 4 screenshots');
}

function testFields(): void {
  same(previewFields({}), {}, 'a game without preview media has no fields');
  same(previewFields({ screenshots: [] }), {}, 'empty screenshots are dropped');
  same(previewFields({ previewVideo: '/thumbs/a/p.mp4', screenshots: ['/thumbs/a/1.webp'] }), { previewVideo: '/thumbs/a/p.mp4', screenshots: ['/thumbs/a/1.webp'] }, 'both fields pass through');
  same(parseScreenshots('/thumbs/a/1.webp  /thumbs/a/2.webp'), ['/thumbs/a/1.webp', '/thumbs/a/2.webp'], 'the attribute splits on spaces');
  same(parseScreenshots(undefined), [], 'a missing attribute is an empty list');
}

function testCategoryPicture(): void {
  const game = (slug: string, categories: string[], popularity: number) => ({ data: { slug, categories, popularity } });
  const games = [game('a', ['action', 'car'], 10), game('b', ['action'], 50), game('c', ['car'], 30), game('d', ['puzzle'], 99)];
  same(popularSlugIn(games, 'action'), 'b', 'the most popular action game');
  same(popularSlugIn(games, 'car'), 'c', 'the most popular car game');
  same(popularSlugIn(games, 'sports'), undefined, 'a category with no game has no picture (emoji fallback)');
}

testPlan();
testFields();
testCategoryPicture();
finish('test-tp6');
