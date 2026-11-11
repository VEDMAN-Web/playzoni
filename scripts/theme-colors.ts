// npm run theme:colors (T5.8): two colours per game from its picture, for the game page background.
// For every game with public/thumbs/<slug>/m.webp it takes
//   from = the dominant colour of the picture,
//   to   = the average colour of the bottom half,
// softens both (35% white, saturation at most 70%), and checks that the page text (ink) still has 4.5:1 contrast.
// Result: data/game-colors.json as { slug: [from, to] } (hex). A game without an entry keeps the site gradient.
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const INK: Rgb = [14, 36, 64]; // --c-ink
const WHITE_MIX = 0.35;
const MAX_SATURATION = 0.7;
const MIN_CONTRAST = 4.5;

export type Rgb = [number, number, number];

export function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
}

// Mixes a colour towards white, caps its saturation, and returns it.
export function soften(rgb: Rgb, whiteMix = WHITE_MIX): Rgb {
  const mixed = rgb.map((v) => v * (1 - whiteMix) + 255 * whiteMix) as Rgb;
  const [h, s, l] = rgbToHsl(mixed);
  return hslToRgb([h, Math.min(s, MAX_SATURATION), l]);
}

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Lightens a colour until the page ink reads with at least MIN_CONTRAST.
export function ensureContrast(rgb: Rgb): Rgb {
  let out = rgb;
  for (let i = 0; i < 20 && contrast(out, INK) < MIN_CONTRAST; i++) out = out.map((v) => v + (255 - v) * 0.1) as Rgb;
  return out;
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): Rgb {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number): number => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}

// The most common colour in the picture: pixels are grouped by their top 4 bits per channel.
export async function dominantColor(file: string): Promise<Rgb> {
  const { data, info } = await sharp(file).resize(48, 48, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    cur.n++;
    cur.r += r;
    cur.g += g;
    cur.b += b;
    buckets.set(key, cur);
  }
  let best = { n: 0, r: 128, g: 128, b: 128 };
  for (const bucket of buckets.values()) if (bucket.n > best.n) best = bucket;
  return [best.r / best.n, best.g / best.n, best.b / best.n];
}

// The average colour of the bottom half of the picture.
export async function bottomAverage(file: string): Promise<Rgb> {
  const meta = await sharp(file).metadata();
  const h = meta.height ?? 300;
  const w = meta.width ?? 300;
  const stats = await sharp(file)
    .removeAlpha()
    .extract({ left: 0, top: Math.floor(h / 2), width: w, height: h - Math.floor(h / 2) })
    .stats();
  return [stats.channels[0].mean, stats.channels[1].mean, stats.channels[2].mean];
}

export async function colorsFor(file: string): Promise<[string, string]> {
  const from = ensureContrast(soften(await dominantColor(file)));
  const to = ensureContrast(soften(await bottomAverage(file)));
  return [toHex(from), toHex(to)];
}

async function main(): Promise<void> {
  const thumbs = join(ROOT, 'public', 'thumbs');
  const out: Record<string, [string, string]> = {};
  let skipped = 0;
  for (const slug of readdirSync(thumbs).sort()) {
    const file = join(thumbs, slug, 'm.webp');
    if (!existsSync(file)) {
      skipped++;
      continue;
    }
    out[slug] = await colorsFor(file);
  }
  writeFileSync(join(ROOT, 'data', 'game-colors.json'), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`theme:colors: ${Object.keys(out).length} games, ${skipped} without a picture`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
