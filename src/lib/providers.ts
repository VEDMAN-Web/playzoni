// Game providers and the domains their game frames load from (docs/PRD.md §10).
// public/_headers builds the CSP `frame-src` from this list, so a new provider only needs an entry here.
// Domains come from the embed addresses in each provider's own feed (GameMonetize: the `url` field,
// Playgama: `gameURL` and the embed snippet), never from guesses. A provider with no accepted
// publisher account yet has an empty list (GameDistribution, GamePix).

export interface Provider {
  key: 'gd' | 'gm' | 'pg' | 'gp';
  name: string;
  frameDomains: string[];
}

export const PROVIDERS: Provider[] = [
  { key: 'gd', name: 'GameDistribution', frameDomains: [] },
  { key: 'gm', name: 'GameMonetize', frameDomains: ['html5.gamemonetize.co'] },
  { key: 'pg', name: 'Playgama', frameDomains: ['playgama.com'] },
  { key: 'gp', name: 'GamePix', frameDomains: [] },
];

// Every provider frame domain, as https:// origins, for the CSP frame-src rule.
export function providerFrameSources(): string[] {
  return PROVIDERS.flatMap((p) => p.frameDomains).map((d) => `https://${d}`);
}
