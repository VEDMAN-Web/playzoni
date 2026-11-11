// RELAY R1 (12 Nov 2026): until the owner launches (PUBLIC_LAUNCH=true), the whole site is hidden from search engines.
// Pages carry an extra robots tag from Seo.astro; this postbuild step replaces dist/robots.txt with "Disallow: /".
// With PUBLIC_LAUNCH=true nothing changes and public/robots.txt is used as written.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PRELAUNCH_ROBOTS = 'User-agent: *\nDisallow: /\n';

export function applyPrelaunch(dist: string, launched: boolean): boolean {
  if (launched) return false;
  writeFileSync(join(dist, 'robots.txt'), PRELAUNCH_ROBOTS);
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const changed = applyPrelaunch(join(import.meta.dirname, '..', 'dist'), process.env.PUBLIC_LAUNCH === 'true');
  console.log(changed ? 'prelaunch: robots.txt blocks everything (set PUBLIC_LAUNCH=true at launch)' : 'prelaunch: launched, robots.txt unchanged');
}
