// Category list from data/categories.json, checked by a zod schema.
// The build fails if a category is missing a field (for example "emoji").
import { z } from 'astro/zod';
import raw from '../../data/categories.json';

export const categorySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  h1: z.string().min(1),
  shortName: z.string().min(1),
  emoji: z.string().min(1),
  parent: z.string().nullable(),
  navOrder: z.number().int().min(1).max(12).nullable(),
  description: z.string().min(120).max(155),
  intro: z.string().min(1),
});

export type Category = z.infer<typeof categorySchema>;

export const categories: Category[] = z.array(categorySchema).parse(raw);
