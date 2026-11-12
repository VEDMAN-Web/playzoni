// Self-test for the game page colour rules (T5.8, R46, scripts/theme-colors.ts). Pure functions only.
import { contrast, ensureContrast, soften, toHex, usablePair, fromHex } from './theme-colors';
import { expect, finish, same } from './test-kit';

function testPairs(): void {
  same(usablePair('#fdfcfd', '#f4f4f6'), false, 'two very light colours give no entry (the site gradient is used)');
  same(usablePair('#8a8a8a', '#9a9a9a'), false, 'two greys give no entry');
  same(usablePair('#fdfcfd', '#a599a1'), false, 'one very light colour and one grey (street-race-master) give no entry');
  same(usablePair('#e9cf80', '#d3c59a'), true, 'a yellow page is kept');
  same(usablePair('#729bb2', '#85a9bd'), true, 'a blue-grey page with some colour is kept');
  same(usablePair('#fdfcfd', '#e9cf80'), true, 'one light colour is fine when the other has colour');
}

function testSoften(): void {
  const hex = toHex(soften([255, 0, 0]));
  const [r, g, b] = fromHex(hex);
  expect(r > g && r > b, 'a red picture stays reddish after softening');
  expect(g > 60, 'softening lifts the dark channels towards white');
}

function testContrast(): void {
  const ink = [14, 36, 64] as [number, number, number];
  for (const colour of [[0, 0, 0], [20, 30, 60], [200, 40, 40]] as [number, number, number][]) {
    expect(contrast(ensureContrast(colour), ink) >= 4.5, `ink reads on ${toHex(colour)} after lifting`);
  }
}

testPairs();
testSoften();
testContrast();
finish('test-theme-colors');
