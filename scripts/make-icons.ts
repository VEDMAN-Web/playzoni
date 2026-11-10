// Builds the logo, icons and static social images (T1.4).
// Run: npm run icons
// Writes public/logo.svg, public/icon.svg, favicon, apple-touch-icon, 192/512 PNG, public/og/*.png.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp, { type Sharp } from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const PUBLIC = join(ROOT, 'public');
const brand = JSON.parse(readFileSync(join(ROOT, 'data', 'brand.json'), 'utf8')) as {
  themeColor: string;
  primaryColor: string;
  backgroundColor: string;
};

const INK = '#0E2440';
const WHITE = '#FFFFFF';
const FONT_FILE = join(ROOT, 'node_modules', '@fontsource-variable', 'nunito', 'files', 'nunito-latin-wght-normal.woff2');

// Circle + play triangle only (used for favicons and app icons).
const iconSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
  `<circle cx="256" cy="256" r="256" fill="${brand.primaryColor}"/>`,
  `<path d="M196 150 L196 362 L370 256 Z" fill="${WHITE}"/>`,
  '</svg>',
].join('');

// Wordmark "playzoni" in Nunito 900; the "o" is a filled circle with a play triangle.
// The font is embedded as a data URI so the SVG shows Nunito when used as <img>.
function logoSvg(): string {
  const fontB64 = readFileSync(FONT_FILE).toString('base64');
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 416 130" role="img" aria-label="playzoni">',
    '<defs><style>',
    `@font-face{font-family:"Nunito Logo";font-weight:200 1000;src:url(data:font/woff2;base64,${fontB64}) format("woff2");}`,
    `text{font-family:"Nunito Logo",Nunito,Arial,sans-serif;font-weight:900;font-size:100px;fill:${INK};}`,
    '</style></defs>',
    '<text x="0" y="96">playz</text>',
    `<circle cx="289" cy="72" r="32" fill="${brand.primaryColor}"/>`,
    `<path d="M281 58 L281 86 L302 72 Z" fill="${WHITE}"/>`,
    '<text x="323" y="96">ni</text>',
    '</svg>',
  ].join('');
}

function socialSvg(tagline: string, logo: string): string {
  // Logo is placed centred at 700px wide; tagline below it.
  const logoB64 = Buffer.from(logo).toString('base64');
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">',
    `<rect width="1200" height="630" fill="${brand.backgroundColor}"/>`,
    `<image x="250" y="170" width="700" height="219" href="data:image/svg+xml;base64,${logoB64}"/>`,
    `<text x="600" y="462" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="44" fill="${INK}">${tagline}</text>`,
    '</svg>',
  ].join('');
}

async function main(): Promise<void> {
  mkdirSync(join(PUBLIC, 'og'), { recursive: true });
  writeFileSync(join(PUBLIC, 'icon.svg'), iconSvg, 'utf8');
  const logo = logoSvg();
  writeFileSync(join(PUBLIC, 'logo.svg'), logo, 'utf8');

  const icon = Buffer.from(iconSvg);
  const sizes: Array<[string, number]> = [
    ['favicon-32.png', 32],
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ];
  for (const [name, size] of sizes) {
    await sharp(icon, { density: 300 }).resize(size, size).png().toFile(join(PUBLIC, name));
  }

  const og = (tagline: string): Buffer => Buffer.from(socialSvg(tagline, logo));
  const ogPng = (tagline: string): Sharp => sharp(og(tagline)).resize(1200, 630).png();
  await ogPng('Play free games instantly.').toFile(join(PUBLIC, 'og', 'default.png'));
  await ogPng('Play free online games instantly.').toFile(join(PUBLIC, 'og', 'home.png'));

  console.log('icons: wrote logo.svg, icon.svg, 4 PNG icons, og/default.png, og/home.png');
}

await main();
