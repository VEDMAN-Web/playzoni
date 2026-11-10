// Creates 24 sample games for layout and player testing (T1.2).
// Run: npm run placeholders
// Writes src/content/games/sample-game-NN.md and public/thumbs/sample-game-NN/{s,m,l}.webp.
// Samples are hidden unless PUBLIC_INCLUDE_SAMPLES=true (see src/lib/games.ts).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const GAMES_DIR = join(ROOT, 'src', 'content', 'games');
const THUMBS_DIR = join(ROOT, 'public', 'thumbs');
const TOTAL = 24;
const DATE = '2026-11-10';

// Brand-like background colours for the placeholder thumbnails (not used in CSS).
const PALETTE = ['#1F7AFF', '#FFC531', '#FF5A8A', '#0E2440', '#0F5FD6', '#50607A'];
const THUMB_SIZES = { s: 150, m: 300, l: 600 } as const;

// Every sample gets action-games or car-games + puzzle-games, plus one of these.
// Result: action-games 12, car-games 12, puzzle-games 24, each other nav category 2+.
const EXTRA_CATEGORIES = [
  'shooting-games', 'sports-games', 'io-games', 'racing-games', 'adventure-games',
  'skill-games', 'multiplayer-games', 'dress-up-games', 'two-player-games',
];
const ASPECTS = [
  { aspect: 'landscape', width: 1280, height: 720 },
  { aspect: 'portrait', width: 720, height: 1280 },
  { aspect: 'square', width: 800, height: 800 },
] as const;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function categoriesFor(index: number): string[] {
  const first = index <= 12 ? 'action-games' : 'car-games';
  const extra = EXTRA_CATEGORIES[(index - 1) % EXTRA_CATEGORIES.length];
  return [first, 'puzzle-games', extra];
}

function gameMarkdown(index: number): string {
  const n = pad(index);
  const slug = `sample-game-${n}`;
  const title = `Sample Game ${n}`;
  const aspect = ASPECTS[(index - 1) % ASPECTS.length];
  const cats = categoriesFor(index);
  const mobile = index % 4 !== 0;
  const description = `Sample game ${n} for layout testing. Not a real game, used to check tiles, pages, search and the player on phone and desktop.`;
  const intro = `Sample game ${n} is a placeholder used to test layouts. It is not a real game.`;
  return [
    '---',
    `title: "${title}"`,
    `slug: "${slug}"`,
    'source: "own"',
    `sourceId: "${slug}"`,
    'embedUrl: "/sample-game.html"',
    `aspect: "${aspect.aspect}"`,
    `width: ${aspect.width}`,
    `height: ${aspect.height}`,
    `mobile: ${mobile}`,
    'categories:',
    ...cats.map((c) => `  - "${c}"`),
    'tags: []',
    'developer: "Playzoni Test"',
    `addedDate: ${DATE}`,
    `updatedDate: ${DATE}`,
    `description: "${description}"`,
    `intro: "${intro}"`,
    'controls:',
    '  desktop: "Click or tap the ball to bounce it"',
    '  mobile: "Tap the screen to bounce the ball"',
    `featured: ${index <= 4}`,
    `popularity: ${100 - index}`,
    'status: "published"',
    'faq:',
    `  - q: "Is ${title} a real game?"`,
    '    a: "No. It is a sample used to test the site layout and player."',
    `  - q: "Is ${title} free?"`,
    '    a: "Yes. Sample games are free test pages."',
    'sample: true',
    '---',
    '',
    `${title} is a placeholder page for testing the site.`,
    '',
  ].join('\n');
}

function thumbSvg(index: number, size: number): string {
  const n = pad(index);
  const colour = PALETTE[(index - 1) % PALETTE.length];
  const fontSize = Math.round(size * 0.4);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">`,
    `<rect width="${size}" height="${size}" fill="${colour}"/>`,
    `<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"`,
    ` font-family="Arial, sans-serif" font-weight="700" font-size="${fontSize}" fill="#FFFFFF">${n}</text>`,
    '</svg>',
  ].join('');
}

async function writeThumbs(index: number): Promise<void> {
  const slug = `sample-game-${pad(index)}`;
  const dir = join(THUMBS_DIR, slug);
  mkdirSync(dir, { recursive: true });
  for (const [name, size] of Object.entries(THUMB_SIZES)) {
    await sharp(Buffer.from(thumbSvg(index, size)))
      .webp({ quality: 82 })
      .toFile(join(dir, `${name}.webp`));
  }
}

async function main(): Promise<void> {
  mkdirSync(GAMES_DIR, { recursive: true });
  for (let i = 1; i <= TOTAL; i++) {
    const file = join(GAMES_DIR, `sample-game-${pad(i)}.md`);
    writeFileSync(file, gameMarkdown(i), 'utf8');
    await writeThumbs(i);
  }
  console.log(`placeholders: wrote ${TOTAL} sample games and thumbnails`);
}

await main();
