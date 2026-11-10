# Growth and retention playbook — v1, 11 Nov 2026

## What Poki does behind the scenes (observed on poki.com, 11 Nov 2026, public network traffic only)
| Mechanic | Evidence | Playzoni plan |
|---|---|---|
| Every visitor gets an anonymous ID and is put into A/B tests | `poki_uid*` and `poki_experiments` cookies; `x-ab` meta tag changes per visit | Phase 2: simple A/B switch (Cloudflare cookie + 2 variants) for tile order, badges, row order |
| Home grid is personalised | recently played game shown big and first; tiles tagged by list (`popularWeekGames`…) | V2.8/V2.9 played badges + profile; Phase 2: "Because you played X" row from local history |
| Hover video previews | each tile carries a preview video URL; a small VP9 MP4 loads only on hover | TP.6 (provider videos/screenshots or zoom fallback) |
| Paid re-marketing to past visitors | Google Ads remarketing + conversion tags, Microsoft (Bing) UET tag, and an OpenAI advertising pixel | Phase 3, only with cookie consent: Google Ads + Microsoft Ads remarketing lists of people who played ≥ 1 game |
| Own analytics events for every game action | event calls to their tracking endpoint; an SDK inside each game (start, stop, ad breaks) | Phase 2: Cloudflare Worker endpoint for `play_start`, `play_30s`, `play_end` (no personal data) to rank "Popular this week" by real plays |
| Games hosted on their own domains | game files served from their own subdomains | Later: self-host top games where the provider allows it (faster, fewer outages) |
| 34 language versions with hreflang | alternate links on every page | docs/I18N.md |
| Speed tricks | preconnect to image/API CDNs, preload the background image | Add preconnect for provider domains on game pages (TP.3 follow-up) |
| Account prompts in empty ad slots | "Save progress / Create account" shown where an ad did not fill | When ads don't fill, show our own promo (Favourites, profile, "Add to home screen") instead of an empty box |

## Proven retention tactics (legal, user-friendly)
1. Instant play, no sign-up wall, fast on cheap phones.
2. "Continue playing": played badges, recently played first, profile panel with time played.
3. Fresh content signals: "New this week", "Popular this week" rotating weekly; 20–50 new games a week.
4. Hover/preview videos and good thumbnails (biggest driver of clicks).
5. Related games right where a session ends (rails + rows on the game page).
6. Install as an app (PWA) — offer once, after a visitor has played 2+ games, from inside the profile panel or a small bar; never a full-screen popup.
7. Web push only with clear opt-in after the 3rd visit, max 2 per week, easy unsubscribe.
8. Short gameplay videos on YouTube Shorts, Instagram Reels, TikTok linking to game pages (Poki does this).
9. Game-of-the-day and weekly challenge row (same game for everyone; no fake counters).
10. Accounts to sync progress across devices (docs/ACCOUNTS.md).
Benchmarks to beat (hyper-casual mobile, Segwise 2026): Day-1 ≈ 29%, Day-7 ≈ 6%, Day-30 ≈ 1.4%.

## Not allowed on Playzoni (dark patterns — illegal in India under the 2023 CCPA guidelines, risky under EU rules, and harmful with young players)
False urgency or fake countdowns · fake player/online counts · confirm-shaming ("No, I hate fun") · forced sign-up to play · disguised ads (ads that look like games or Play buttons) · nagging (repeat popups for notifications/installs) · trick questions in consent · fake virus or "your device is slow" alerts · pop-unders and redirect chains · auto-playing sound ads.
