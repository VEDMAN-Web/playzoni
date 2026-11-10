// Game providers and the domains their game frames load from (docs/PRD.md §10).
// public/_headers builds the CSP `frame-src` from this list, so a new provider only needs an entry here.
// The domains are empty until the owner has signed up as a publisher (docs/QUESTIONS.md Q2): the
// domains come from each provider's own embed documentation, not from guesses.

export interface Provider {
  key: 'gd' | 'gm' | 'pg' | 'gp';
  name: string;
  frameDomains: string[];
}

export const PROVIDERS: Provider[] = [
  { key: 'gd', name: 'GameDistribution', frameDomains: [] },
  { key: 'gm', name: 'GameMonetize', frameDomains: [] },
  { key: 'pg', name: 'Playgama', frameDomains: [] },
  { key: 'gp', name: 'GamePix', frameDomains: [] },
];

// Every provider frame domain, as https:// origins, for the CSP frame-src rule.
export function providerFrameSources(): string[] {
  return PROVIDERS.flatMap((p) => p.frameDomains).map((d) => `https://${d}`);
}
