import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// Game frontmatter — fields from docs/PRD.md §4, plus `sample` (T1.2).
const games = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/games' }),
  schema: z.object({
    title: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    source: z.enum(['gd', 'gm', 'pg', 'gp', 'own']),
    sourceId: z.string(),
    embedUrl: z.string().regex(/^(https:\/\/|\/)/),
    aspect: z.enum(['landscape', 'portrait', 'square']),
    width: z.number().positive(),
    height: z.number().positive(),
    mobile: z.boolean(),
    categories: z.array(z.string()).min(1).max(4),
    tags: z.array(z.string()).default([]),
    developer: z.string().min(1).optional(),
    releaseDate: z.coerce.date().optional(),
    addedDate: z.coerce.date(),
    updatedDate: z.coerce.date(),
    description: z.string().max(155),
    // Empty for drafts (T4.5); the validator requires text before a game is published.
    intro: z.string(),
    controls: z.object({ desktop: z.string(), mobile: z.string() }),
    featured: z.boolean().default(false),
    popularity: z.number(),
    // Hover preview (DESIGN §V2.8). Optional: only games whose source gives a preview video or screenshots have them.
    previewVideo: z.string().regex(/^\/thumbs\/[a-z0-9-]+\/[a-z0-9-]+\.(mp4|webm)$/).optional(),
    screenshots: z.array(z.string().regex(/^\/thumbs\/[a-z0-9-]+\/[a-z0-9-]+\.(webp|jpg)$/)).max(4).optional(),
    // T5.1b: copied from data/qa/<slug>.json when the game page is written. Optional for drafts.
    playModes: z
      .object({ localTwoPlayer: z.boolean(), onlineMultiplayer: z.boolean(), inviteLink: z.boolean(), coOp: z.boolean().optional() })
      .optional(),
    status: z.enum(['draft', 'published']),
    faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).max(5).default([]),
    sample: z.boolean().default(false),
  }),
});

// Category SEO text: markdown body only; slug = filename.
const categories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/categories' }),
  schema: z.object({
    // FAQ shown on the category page and used for FAQPage markup (2-5 items).
    faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).max(5).default([]),
  }),
});

export const collections = { games, categories };
