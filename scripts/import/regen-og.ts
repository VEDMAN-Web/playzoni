// npm run images:og [-- --staging data/staging --public-thumbs public/thumbs]
// Rebuilds the social image (og.jpg) of every staged game from its 600 px picture (l.webp), removes the old
// og.png, and does the same for games already published into public/thumbs (R17, Q15). No download needed.

import { copyFileSync, existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from './args';
import { readBrandColours, renderOgImage } from './images';
import { IMPORT_PATHS, REPO_ROOT } from './paths';
import { readStagingGames, thumbsDirFor } from './staging';

export interface RegenResult {
  rebuilt: number;
  copiedToPublic: number;
  missingPicture: string[];
  bytes: number;
}

export async function regenerateOgImages(stagingRoot: string, publicThumbs: string): Promise<RegenResult> {
  const colours = readBrandColours(IMPORT_PATHS);
  const result: RegenResult = { rebuilt: 0, copiedToPublic: 0, missingPicture: [], bytes: 0 };
  const thumbs = thumbsDirFor(stagingRoot);
  for (const { game } of readStagingGames(stagingRoot)) {
    const dir = join(thumbs, game.slug);
    const picture = join(dir, 'l.webp');
    if (!existsSync(picture)) {
      result.missingPicture.push(game.slug);
      continue;
    }
    const og = await renderOgImage(readFileSync(picture), game.title, colours);
    writeFileSync(join(dir, 'og.jpg'), og);
    rmSync(join(dir, 'og.png'), { force: true });
    result.rebuilt++;
    result.bytes += og.length;
    const published = join(publicThumbs, game.slug);
    if (existsSync(published)) {
      copyFileSync(join(dir, 'og.jpg'), join(published, 'og.jpg'));
      rmSync(join(published, 'og.png'), { force: true });
      result.copiedToPublic++;
    }
  }
  return result;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await regenerateOgImages(
    resolve(REPO_ROOT, args.staging ?? join('data', 'staging')),
    resolve(REPO_ROOT, args['public-thumbs'] ?? join('public', 'thumbs')),
  );
  const average = result.rebuilt > 0 ? Math.round(result.bytes / result.rebuilt / 1024) : 0;
  console.log(`images:og: ${result.rebuilt} rebuilt (average ${average} KB), ${result.copiedToPublic} copied into public/thumbs, ${result.missingPicture.length} without a picture`);
  if (statSync(resolve(REPO_ROOT, args['public-thumbs'] ?? join('public', 'thumbs'))).isDirectory() && result.missingPicture.length > 0) {
    console.log(`  no l.webp for: ${result.missingPicture.slice(0, 5).join(', ')}${result.missingPicture.length > 5 ? ' ...' : ''}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
