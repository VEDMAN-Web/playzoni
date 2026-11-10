// Thumbnails and og images for imported games (docs/PRD.md §10, docs/SEO-PLAN.md §Technical).
// Needs `sharp` (approved for import scripts only).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import type { ImageFetcher, ImportPaths } from './types';

export const THUMB_SIZES = { s: 150, m: 300, l: 600 } as const;
export const WEBP_QUALITY = 78;
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const MIN_SOURCE_SIDE = 150; // smaller pictures would be blown up too far for the l thumbnail
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// ---- download ----

export interface FetchOptions {
  timeoutMs: number;
  /** Extra tries after the first one. */
  retries: number;
  retryDelayMs: number;
}

export const DEFAULT_FETCH_OPTIONS: FetchOptions = { timeoutMs: 10_000, retries: 2, retryDelayMs: 500 };

// A problem that another try cannot fix.
class PermanentError extends Error {}

async function fetchOnce(url: string, timeoutMs: number): Promise<Buffer> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new PermanentError(`not a valid URL: ${url}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new PermanentError(`only http and https image URLs are allowed, got ${parsed.protocol}`);
  }
  const response = await fetch(parsed, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_IMAGE_BYTES) throw new PermanentError(`image is ${declared} bytes, over the ${MAX_IMAGE_BYTES} limit`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length > MAX_IMAGE_BYTES) throw new PermanentError(`image is ${data.length} bytes, over the ${MAX_IMAGE_BYTES} limit`);
  return data;
}

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Download with a timeout and `retries` more tries. The last error is thrown.
export function createImageFetcher(options: Partial<FetchOptions> = {}): ImageFetcher {
  const { timeoutMs, retries, retryDelayMs } = { ...DEFAULT_FETCH_OPTIONS, ...options };
  return async (url: string): Promise<Buffer> => {
    let lastError: unknown = new Error('no attempt made');
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fetchOnce(url, timeoutMs);
      } catch (error) {
        lastError = error;
        if (error instanceof PermanentError) break;
        if (attempt < retries) await sleep(retryDelayMs);
      }
    }
    throw new Error(`${url}: ${message(lastError)}`);
  };
}

// ---- brand colours for the og image ----

export interface BrandColours {
  background: string;
  primary: string;
  ink: string;
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function readBrandColours(paths: Pick<ImportPaths, 'brandJson' | 'tokensCss'>): BrandColours {
  const brand = JSON.parse(readFileSync(paths.brandJson, 'utf8')) as Record<string, string>;
  const ink = /--c-ink:\s*(#[0-9A-Fa-f]{6})/.exec(readFileSync(paths.tokensCss, 'utf8'))?.[1] ?? '';
  const colours = { background: brand.backgroundColor ?? '', primary: brand.primaryColor ?? '', ink };
  for (const [name, value] of Object.entries(colours)) {
    if (!HEX.test(value)) throw new Error(`brand colour "${name}" is not a #RRGGBB value: "${value}"`);
  }
  return colours;
}

// ---- render ----

export interface RenderedImages {
  s: Buffer;
  m: Buffer;
  l: Buffer;
  og: Buffer;
}

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// At most two lines; the last one ends with an ellipsis when the title is longer.
export function wrapTitle(title: string, maxChars = 26, maxLines = 2): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of title.trim().split(/\s+/).filter((w) => w !== '')) {
    const next = line === '' ? word : `${line} ${word}`;
    if (line === '' || next.length <= maxChars) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== '') lines.push(line);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) shown[maxLines - 1] = `${shown[maxLines - 1]} …`;
  return shown.map((l) => (l.length > maxChars ? `${l.slice(0, maxChars - 1).trimEnd()}…` : l));
}

function ogTextSvg(title: string, colours: BrandColours): string {
  const lines = wrapTitle(title);
  const firstBaseline = lines.length === 1 ? 500 : 470;
  const text = lines.map((line, i) => `<text x="600" y="${firstBaseline + i * 66}" class="title">${escapeXml(line)}</text>`).join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">`,
    '<style>',
    // The renderer cannot load the web font, so og images use a plain bold sans, like public/og/*.png.
    'text{font-family:Arial,Helvetica,sans-serif;text-anchor:middle;}',
    `.title{font-weight:800;font-size:56px;fill:${colours.ink};}`,
    `.site{font-weight:800;font-size:28px;fill:${colours.primary};}`,
    '</style>',
    text,
    '<text x="600" y="604" class="site">playzoni.com</text>',
    '</svg>',
  ].join('');
}

async function renderOg(source: Buffer, title: string, colours: BrandColours): Promise<Buffer> {
  const size = 360;
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="44"/></svg>`);
  const thumb = await sharp(source)
    .rotate()
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  return sharp({ create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 4, background: colours.background } })
    .composite([
      { input: thumb, left: (OG_WIDTH - size) / 2, top: 36 },
      { input: Buffer.from(ogTextSvg(title, colours)), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

// Square s/m/l WebP (quality 78) and the 1200x630 og PNG, all in memory: nothing is written
// until every size has worked, so a bad picture never leaves half a folder behind.
export async function renderImages(source: Buffer, title: string, colours: BrandColours): Promise<RenderedImages> {
  const meta = await sharp(source).metadata();
  const shortSide = Math.min(meta.width ?? 0, meta.height ?? 0);
  if (shortSide < MIN_SOURCE_SIDE) {
    throw new Error(`picture is ${meta.width ?? '?'}x${meta.height ?? '?'}, the short side must be at least ${MIN_SOURCE_SIDE}px`);
  }
  const thumb = (size: number): Promise<Buffer> =>
    sharp(source).rotate().resize(size, size, { fit: 'cover' }).webp({ quality: WEBP_QUALITY }).toBuffer();
  const [s, m, l, og] = await Promise.all([thumb(THUMB_SIZES.s), thumb(THUMB_SIZES.m), thumb(THUMB_SIZES.l), renderOg(source, title, colours)]);
  return { s, m, l, og };
}

export function writeImages(dir: string, images: RenderedImages): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 's.webp'), images.s);
  writeFileSync(join(dir, 'm.webp'), images.m);
  writeFileSync(join(dir, 'l.webp'), images.l);
  writeFileSync(join(dir, 'og.png'), images.og);
}
