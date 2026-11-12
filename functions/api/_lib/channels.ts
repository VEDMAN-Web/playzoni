// Where a visit came from (docs/ADMIN.md §5.8): search engines (incl. Yandex and Bing), AI assistants, social sites,
// other websites, email/ads campaigns, or direct. Pure function, unit-tested.
export type Channel = 'search' | 'ai' | 'social' | 'campaign' | 'referral' | 'direct';

export const AI_DOMAINS = ['chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'gemini.google.com', 'copilot.microsoft.com', 'claude.ai', 'you.com', 'phind.com'];
const SEARCH = /(^|\.)(google\.[a-z.]+|bing\.com|yandex\.[a-z.]+|ya\.ru|duckduckgo\.com|yahoo\.[a-z.]+|baidu\.com|ecosia\.org|naver\.com|seznam\.cz|startpage\.com|brave\.com|qwant\.com)$/;
const SOCIAL = /(^|\.)(facebook\.com|fb\.com|instagram\.com|t\.co|x\.com|twitter\.com|reddit\.com|youtube\.com|tiktok\.com|pinterest\.[a-z.]+|discord\.com|whatsapp\.com|telegram\.org|vk\.com|linkedin\.com|threads\.net)$/;

export function channelOf(ref: string, utmMedium = ''): Channel {
  const d = ref.toLowerCase();
  if (AI_DOMAINS.some((a) => d === a || d.endsWith(`.${a}`))) return 'ai';
  if (utmMedium) return 'campaign';
  if (!d) return 'direct';
  if (SEARCH.test(d) && d !== 'gemini.google.com') return 'search';
  if (SOCIAL.test(d)) return 'social';
  return 'referral';
}

/** The search engine name for a search referrer ("google", "bing", "yandex", ...). */
export function engineOf(ref: string): string {
  const m = ref.toLowerCase().match(/(^|\.)(google|bing|yandex|ya|duckduckgo|yahoo|baidu|ecosia|naver|seznam|startpage|brave|qwant)\./);
  if (!m) return ref;
  return m[2] === 'ya' ? 'yandex' : m[2];
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  search: 'Search engines',
  ai: 'AI assistants',
  social: 'Social sites',
  campaign: 'Campaigns (UTM)',
  referral: 'Other websites',
  direct: 'Direct or unknown',
};
