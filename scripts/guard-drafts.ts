// Runs before every build (npm "prebuild"). Draft games are only for the owner's preview (docs/TASKS.md T4.6):
// a build with PUBLIC_INCLUDE_DRAFTS=true must never reach the main branch. The flag is read from the environment
// and from .env, the same way Astro reads it.

import { pathToFileURL } from 'node:url';

export type EnvMap = Record<string, string | undefined>;

// null when the build may go on; otherwise the reason to stop.
export function draftBuildProblem(env: EnvMap): string | null {
  if (env.PUBLIC_INCLUDE_DRAFTS !== 'true') return null;
  if (env.CF_PAGES_BRANCH === 'main') {
    return 'PUBLIC_INCLUDE_DRAFTS=true on the main branch: draft games must never go live. Remove the flag or build another branch.';
  }
  return null;
}

function main(): void {
  const problem = draftBuildProblem(process.env);
  if (problem) {
    console.error(`guard-drafts: ${problem}`);
    process.exit(1);
  }
  if (process.env.PUBLIC_INCLUDE_DRAFTS === 'true') console.log('guard-drafts: preview build with draft games (noindex on every page)');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
