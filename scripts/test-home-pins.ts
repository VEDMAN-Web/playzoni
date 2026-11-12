// Self-test for the home feed pin rules (T10.17, src/lib/home-pins.ts). Pure functions only.
import { cleanPins, heroToPins, planPins, shownSlots, type Slot } from '../src/lib/home-pins';
import { slotsFromHtml } from './home-slots';
import { finish, same } from './test-kit';

const built = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const slots: Slot[] = built.map((slug, i) => ({ i, slug, size: i === 1 || i === 4 ? 'L' : 'S' }));

function testPins(): void {
  same(shownSlots(built, [{ i: 5, slug: 'x' }]), ['a', 'b', 'c', 'd', 'e', 'x', 'g', 'h'], 'a game that is not on the page takes its slot');
  same(shownSlots(built, [{ i: 0, slug: 'g' }]), ['g', 'b', 'c', 'd', 'e', 'f', 'a', 'h'], 'a game that is elsewhere swaps places with the one in its slot');
  same(shownSlots(built, [{ i: 1, slug: 'b' }]), built, 'a pin on the built game changes nothing');
  same(shownSlots(built, []), built, 'no pins: the built order');
}

function testTwoPins(): void {
  const shown = shownSlots(built, [{ i: 5, slug: 'x' }, { i: 1, slug: 'y' }]);
  same([shown[1], shown[5]], ['y', 'x'], 'pin X to slot 5 and Y to slot 1: both are there');
  same(new Set(shown).size, shown.length, 'no game shows twice');
  const swapped = shownSlots(built, [{ i: 2, slug: 'd' }, { i: 3, slug: 'c' }]);
  same(new Set(swapped).size, swapped.length, 'two pins that swap each other leave no duplicate');
  same(swapped.length, built.length, 'the page keeps the same number of slots');
}

function testBounds(): void {
  same(planPins(built, [{ i: 99, slug: 'x' }, { i: -1, slug: 'y' }]), [], 'pins outside the page are ignored');
  same(planPins(built, [{ i: 0, slug: 'x' }, { i: 1, slug: 'x' }]).length, 1, 'a game pinned twice is used once');
}

function testHero(): void {
  same(heroToPins(['p', 'q', 'r'], slots), [{ i: 1, slug: 'p' }, { i: 4, slug: 'q' }], 'old hero entries become pins on the big slots, in order');
  same(heroToPins([], slots), [], 'no hero: no pins');
}

function testClean(): void {
  same(
    cleanPins([{ i: 3, slug: 'ok-game' }, { i: 3, slug: 'other' }, { i: 4, slug: 'ok-game' }, { i: 'x', slug: 'a' }, { i: 5, slug: 'Bad Slug' }, { i: 6, slug: 'fine' }]),
    [{ i: 3, slug: 'ok-game' }, { i: 6, slug: 'fine' }],
    'only valid pins, one game per slot and one slot per game',
  );
}

function testHtml(): void {
  const html =
    '<div class="grid grid-mosaic"><div class="cell"><a class="tile tile-xl" href="/game/x" data-slug="x"></a></div>' +
    '<div class="cell"><a class="tile tile-s" data-astro-cid-1 href="/game/y" data-slug="y"></a></div></div><script src="/mosaic-fit.js"></script>' +
    '<section class="row"><a class="tile tile-s" href="/game/z" data-slug="z"></a></section>';
  same(slotsFromHtml(html), [{ i: 0, size: 'XL', slug: 'x' }, { i: 1, size: 'S', slug: 'y' }], 'only the mosaic tiles are read, in page order, not the rows below');
  same(slotsFromHtml('<p>no grid</p>'), [], 'a page without a mosaic has no slots');
}

testPins();
testHtml();
testTwoPins();
testBounds();
testHero();
testClean();
finish('test-home-pins');
