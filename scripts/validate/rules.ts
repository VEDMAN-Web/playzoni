// Rules and text helpers shared by the content validator (docs/SEO-PLAN.md §Content "Validate checks").

export const DESCRIPTION_RANGE = { min: 120, max: 155 };
export const TITLE_MAX = 60;
export const GAME_BODY_WORDS = { min: 350, max: 700 };
export const CATEGORY_TEXT_WORDS = { min: 400, max: 900 };
export const GAME_FAQ = { min: 2, max: 5 };
export const CATEGORY_FAQ = { min: 3, max: 5 };
export const INTRO_SENTENCES = { min: 2, max: 3 };
export const OVERLAP_WORDS = 8;

// "unblocked" stays banned until Q1 in docs/QUESTIONS.md is answered.
export const BANNED: { label: string; pattern: RegExp }[] = [
  { label: 'poki', pattern: /\bpoki\b/i },
  { label: 'crazygames', pattern: /crazy\s?games/i },
  { label: '#1', pattern: /(^|\s)#1(?![0-9A-Za-z])/ },
  { label: 'best game ever', pattern: /best game ever/i },
  { label: 'unblocked', pattern: /\bunblocked\b/i },
];

export function bannedWordsIn(text: string): string[] {
  return BANNED.filter((b) => b.pattern.test(text)).map((b) => b.label);
}

// Headings every game page body needs (docs/SEO-PLAN.md §Content, "Game page template").
export const GAME_SECTIONS: { label: string; pattern: RegExp }[] = [
  { label: '## How to play', pattern: /^## How to play\b/m },
  { label: '### Controls', pattern: /^### Controls\b/m },
  { label: '## Tips for', pattern: /^## Tips for\b/m },
  { label: '## Features', pattern: /^## Features\b/m },
  { label: '## Games like', pattern: /^## Games like\b/m },
];

// Headings every category text needs ("Category page template").
export const CATEGORY_SECTIONS: { label: string; pattern: RegExp }[] = [
  { label: '## {Name} on Playzoni', pattern: /^## .+ on Playzoni\s*$/m },
  { label: '## Top … to start with', pattern: /^## Top .+ to start with\s*$/m },
  { label: '## Types of …', pattern: /^## Types of .+$/m },
  { label: '## Playing … on mobile', pattern: /^## Playing .+ on mobile\s*$/m },
];

// Words of readable text: markdown marks, comments and link addresses do not count.
export function countWords(markdown: string): number {
  const text = markdown
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`>-]/g, ' ');
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export function countSentences(text: string): number {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim() !== '').length;
}

export const normalise = (text: string): string => text.trim().replace(/\s+/g, ' ').toLowerCase();

const wordsOf = (text: string): string[] => text.toLowerCase().match(/[a-z0-9']+/g) ?? [];

// Every sequence of `n` words in the text, as strings.
function shingles(words: string[], n: number): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) set.add(words.slice(i, i + n).join(' '));
  return set;
}

// The first run of 8 words that appears in both texts, or null.
export function sharedRun(content: string, feed: string, n: number = OVERLAP_WORDS): string | null {
  const feedSet = shingles(wordsOf(feed), n);
  for (const run of shingles(wordsOf(content), n)) {
    if (feedSet.has(run)) return run;
  }
  return null;
}
