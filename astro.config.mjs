// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Game last-modified dates for the sitemap: read from the frontmatter of each game file
// (updatedDate). Read here, not imported, because this config runs in plain Node.
const gamesDir = join(process.cwd(), 'src', 'content', 'games');
/** @type {Record<string, string>} */
const gameUpdated = {};
for (const file of readdirSync(gamesDir)) {
  if (!file.endsWith('.md')) continue;
  const text = readFileSync(join(gamesDir, file), 'utf8');
  const slug = text.match(/^slug:\s*"?([a-z0-9-]+)"?\s*$/m)?.[1];
  const updated = text.match(/^updatedDate:\s*(\d{4}-\d{2}-\d{2})\s*$/m)?.[1];
  if (slug && updated) gameUpdated[slug] = updated;
}

// https://astro.build/config
export default defineConfig({
  site: 'https://playzoni.com',
  trailingSlash: 'never',
  output: 'static',
  build: {
    format: 'file',
  },
  integrations: [
    sitemap({
      // noindex pages are removed after the build by scripts/sitemap-check.ts, which reads the
      // robots meta of each built page (the source of truth for what is indexable).
      serialize(item) {
        const match = item.url.match(/\/game\/([a-z0-9-]+)$/);
        if (match && gameUpdated[match[1]]) {
          item.lastmod = new Date(`${gameUpdated[match[1]]}T00:00:00Z`);
        }
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
