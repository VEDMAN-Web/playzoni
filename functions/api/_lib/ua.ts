// Device, OS and browser from the User-Agent (coarse buckets only, never stored as the full string), and the bot filter.

const BOT_RE = /bot|crawl|spider|slurp|lighthouse|headless|pagespeed|preview|facebookexternalhit|embedly|python|curl|wget|httpclient|java\/|go-http|axios|node-fetch|phantom|puppeteer|playwright|selenium/i;

export function isBot(ua: string, verifiedBot?: boolean, botScore?: number): boolean {
  if (!ua || ua.length < 20) return true;
  if (verifiedBot) return true;
  // Cloudflare bot score (1 = surely a bot, 99 = surely human), only on plans that have it.
  if (typeof botScore === 'number' && botScore > 0 && botScore < 30) return true;
  return BOT_RE.test(ua);
}

export interface UaInfo {
  device: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
}

export function parseUa(ua: string): UaInfo {
  const tablet = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua);
  const mobile = !tablet && /Mobi|iPhone|iPod|Android|Windows Phone|Opera Mini/i.test(ua);
  const os = /Windows/i.test(ua)
    ? 'windows'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'ios'
      : /Android/i.test(ua)
        ? 'android'
        : /CrOS/i.test(ua)
          ? 'chromeos'
          : /Mac OS X|Macintosh/i.test(ua)
            ? 'macos'
            : /Linux/i.test(ua)
              ? 'linux'
              : 'other';
  const browser = /Edg\//i.test(ua)
    ? 'edge'
    : /OPR\/|Opera/i.test(ua)
      ? 'opera'
      : /SamsungBrowser/i.test(ua)
        ? 'samsung'
        : /Firefox|FxiOS/i.test(ua)
          ? 'firefox'
          : /Chrome|CriOS|Chromium/i.test(ua)
            ? 'chrome'
            : /Safari/i.test(ua)
              ? 'safari'
              : 'other';
  return { device: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop', os, browser };
}
