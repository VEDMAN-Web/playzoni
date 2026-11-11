// The play-test notes file, data/qa/<slug>.json (docs/SEO-PLAN.md §Content, docs/TASKS.md T5.1).
// Used by the content validator for published games, and by `npm run qa:new` for the blank template.

import { z } from 'astro/zod';

export const QA_VERDICTS = ['publish', 'reject', 'pending'] as const;
export const QA_ORIENTATIONS = ['landscape', 'portrait', 'either'] as const;

const text = (label: string): z.ZodString => z.string().trim().min(1, `${label} is empty`);

// T5.1b: how the game can be played. Each answer is true or false; coOp (players on the same team) is optional.
export const PlayModesSchema = z.object({
  localTwoPlayer: z.boolean(),
  onlineMultiplayer: z.boolean(),
  inviteLink: z.boolean(),
  coOp: z.boolean().optional(),
});
export type PlayModes = z.infer<typeof PlayModesSchema>;

export const QaNotesSchema = z.object({
  tester: text('tester'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  worksMobile: z.boolean(),
  worksDesktop: z.boolean(),
  orientation: z.enum(QA_ORIENTATIONS),
  playModes: PlayModesSchema,
  loadSeconds: z.number().min(0).max(120),
  controlsDesktop: text('controlsDesktop'),
  controlsMobile: text('controlsMobile'),
  goal: text('goal'),
  threeFacts: z.array(text('a fact')).min(2).max(4),
  tips: z.array(text('a tip')).min(3).max(5),
  issues: z.string(),
  verdict: z.enum(QA_VERDICTS),
});

export type QaNotes = z.infer<typeof QaNotesSchema>;

// The first problem in plain words: "tips: must have at least 3 items".
export function qaProblems(value: unknown): string[] {
  const result = QaNotesSchema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((issue) => {
    const where = issue.path.join('.') || 'file';
    return `${where}: ${issue.message}`;
  });
}
