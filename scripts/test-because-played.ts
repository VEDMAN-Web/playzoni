// T9.6: "Because you played X" picks same-category games first, then shared tags, then popularity; never played games.
import { becauseYouPlayed } from '../src/lib/because-played';
import { expect, finish, same } from './test-kit';

const g = (slug: string, cats: string[], t: string[] = []) => ({ slug, title: slug, thumb: `/thumbs/${slug}/s.webp`, cats, t });
// Most popular first, like /games-index.json.
const index = [
  g('pop1', ['puzzle-games']),
  g('car1', ['car-games'], ['drift']),
  g('race1', ['racing-games'], ['drift']),
  g('car2', ['car-games']),
  g('pop2', ['puzzle-games']),
  g('car3', ['car-games']),
  g('pop3', ['sports-games']),
  g('car4', ['car-games']),
  g('pop4', ['sports-games']),
];

const r = becauseYouPlayed(index, ['car1']);
expect(r !== null, 'a row is made when there are enough games');
same(r?.games.map((x) => x.slug).slice(0, 4), ['car2', 'car3', 'car4', 'race1'], 'same category first, then shared tag');
expect(!r?.games.some((x) => x.slug === 'car1'), 'never the game itself');
same(becauseYouPlayed(index, ['car1', 'car2'])?.games.some((x) => x.slug === 'car2'), false, 'never a game already played');
same(becauseYouPlayed(index, []), null, 'no history, no row');
same(becauseYouPlayed(index, ['not-in-index']), null, 'unknown game, no row');
same(becauseYouPlayed(index.slice(0, 5), ['car1']), null, 'fewer than 6 candidates, no row');
expect((becauseYouPlayed([...index, ...index.map((x) => ({ ...x, slug: x.slug + 'b' }))], ['car1'])?.games.length ?? 0) <= 12, 'at most 12 games');

finish('test-because-played');
