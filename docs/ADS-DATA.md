# Playzoni — audience data and ads plan (v1, 11 Nov 2026)

Owner asked for "sneaky" data use: learn as much as possible from each visitor's IP and device, use it to target ads, and find the best ad placements. This file is the plan that gets the most revenue **without breaking the law in our target markets**. It extends PRD §11 (ads) and docs/ADMIN.md (tracking). Phase 11 in TASKS.md builds it.

## 1. The hard line (read first)
A free games site is "likely to be used by children". Several of our target markets now ban **profiling children for ads**, whatever the site says about its audience:

| Market | Rule | What it means for us |
|---|---|---|
| India | DPDP Act §9: no tracking, behavioural monitoring or targeted ads directed at children (under 18). Children's-data rules apply from **13 May 2027** | No behavioural ad targeting of Indian visitors we cannot prove are adults |
| Brazil | ECA Digital (Law 15.211/2025): bans profiling to target ads at minors on services likely accessed by minors, incl. online games; no loot boxes; self-declared age is not enough | Contextual (non-personalised) ads only for Brazil |
| USA | COPPA amended rule, full compliance since **22 Apr 2026**: persistent identifiers count as personal data; separate parental consent before sharing children's data with advertisers; "mixed audience" duties | No targeted ads for anyone we know or should know is under 13; respect Google's child/teen ad treatment |
| EU, UK, Switzerland | GDPR + ePrivacy: consent before non-essential storage and personalised ads; UK ICO says fingerprinting needs freely given consent | Personalised ads only with consent through a Google-certified CMP |
| Russia | Google stopped monetisation for Russia-based publishers and paused AdMob serving to users in Russia | Google ads earn little or nothing from Russian visitors (see §6) |

So we **do not**: fingerprint devices, store raw IP addresses, build cross-site profiles, sell or share visitor data, infer age/gender/income, or use precise location. Google's Feb 2025 change allows fingerprinting **for advertisers** on some surfaces — it does not make it legal for us under GDPR/DPDP/COPPA, and it would put the AdSense account at risk.

**Decision for launch (planner recommendation, Q18):** serve **non-personalised (contextual) ads everywhere**, plus Google's age treatment where needed. Contextual ads on a games page still match the page (games, apps, toys, snacks). Honest cost: personalised ads usually earn more — Google's own 2019 test found publishers lost about half their programmatic revenue when cookies were removed. We measure our own numbers per country (Phase 10 admin) and only turn personalised ads on, per market, after the owner's lawyer signs off (Q18).

## 2. What we may learn from a visit, and what we use it for
All of it comes from the request itself or from the browser, is kept as **aggregates** (counts per day), and never identifies a person.

| Signal | Source (no extra tracking) | Used for |
|---|---|---|
| Country, region, city, time zone | Cloudflare request data (`CF-IPCountry`, `request.cf.region/city/timezone`) | Language suggestion (I18N), ad network per country (§6), local time for "Game of the day", reports by country. **IP is not stored** |
| Network type (ASN / ISP, mobile vs broadband) | `request.cf.asn`, `asOrganization` | Bot filtering, choosing lighter pages on slow mobile networks |
| Device type, OS, browser | User-Agent + client hints | Ad sizes per device, layout tests, bug reports |
| Screen size bucket, touch, language list | Browser (sent with events) | Ad sizes, language suggestion |
| Connection quality | `navigator.connection.effectiveType` where available | Skip hover videos and heavy ads on 2G/3G |
| New vs returning, session count | First-party random ID in localStorage (no fingerprinting; reset in profile panel) | Frequency caps, retention reports |
| What they play and for how long | Our own play events (ADMIN.md tracking) | Ranking games, "Popular this week", contextual ad keywords per page |
| Search words | Search panel (no personal data) | Better search synonyms, new categories, which games to add |

The "smart" part is **who sees which ad layout and network**, decided by country + device + page + session depth — not by a profile of the person.

## 3. Revenue sources, in order
1. **In-game ads from the game providers** (GameMonetize, Playgama): the games themselves show pre-roll / mid-roll ads and pay us a share. Zero work beyond keeping the games playable. This is where most game-portal revenue comes from.
2. **Display ads around the game** (AdSense at launch, §4).
3. **Later, with traffic:** Google Ad Manager through a Google-certified MCM partner with header bidding (more buyers bid per slot). Only when monthly traffic meets a partner's minimum (owner applies; Q-later).
4. **Later:** H5 Games Ads (Google's in-game interstitial/rewarded format) only for games we host ourselves — it needs approval and our own game code.
5. **Direct deals** with game studios that want promotion (clearly labelled "Sponsored").

## 4. Ad placements (best-performing slots that keep the site usable)
Slots are reserved boxes with fixed sizes (no layout shift), always labelled "Advertisement", never inside or over the game, never looking like a game tile or a Play button. Sizes are the standard ones that earn most.

### Game page — desktop (≥1024)
| Slot | Size | Where | Why |
|---|---|---|---|
| G1 right rail | 300×250 (3×3 cells) | Right of the player, top | Highest-viewability slot while playing (already reserved in DESIGN §V2.4) |
| G2 right rail tall | 300×600 (3×6 cells) | Below G1 on screens ≥ 900px tall | Large format, high bids |
| G3 under player | 728×90 (7×1 strip) | Directly under the player bar | Seen at every game start |
| G4 in related grid | 300×250 | After the first 24 related tiles | Second scroll depth |

### Game page — phone and tablet
| Slot | Size | Where |
|---|---|---|
| M1 | 320×100 | Under the game cover, above the text |
| M2 | 300×250 | In the related grid after 12 tiles |
| M3 (test, Q22) | Anchor ad (Google Auto ads) | Bottom of screen, dismissible — PRD §11 forbids sticky ads on mobile today; only as an A/B test if the owner approves |

### Home, category and list pages
| Slot | Size | Where |
|---|---|---|
| H1 | 728×90 desktop / 320×100 phone | Between the mosaic and the first row |
| H2 | 300×250 tile (3×3) | Inside the mosaic once, after the first 40 tiles (desktop only) |
| H3 | 728×90 / 320×100 | After the 4th row |

### Between pages (test, Q22)
- **Vignette** (Google Auto ads full-screen ad shown only when the visitor moves to a new page, with a close button). Often the single best-earning format. Test on 50% of visitors from the 3rd page view, never before the first game.

### Never
In or over the player; ads in the search panel or profile panel; pop-ups or pop-unders; redirects; auto-playing sound; ads styled like tiles or Play buttons; more than 3 display ads in view at once on desktop or 1 on phones; any slot that moves content after load.

## 5. Rules that decide which ads a visitor gets
Evaluated in the browser from country (from `/__geo`), consent state, device and session depth. Exact logic for T11.4:
1. **Country = RU or BY** → no Google ad code at all (§6); show our own house promo in the slots.
2. **No consent given (EEA/UK/CH)** or **country in {IN, BR}** or **any page tagged for age treatment** → non-personalised ads (`requestNonPersonalizedAds = 1`).
3. Elsewhere → non-personalised too until Q18 is answered; then follow the answer.
4. **Session depth**: page 1 → G1 + G3 (or M1) only; page 2+ → all slots; vignette only from page 3 (if Q22 = yes).
5. **Frequency cap**: at most 1 vignette per 3 minutes; no refresh of a slot more than once every 60 s and only while visible (AdSense rules).
6. **Slow connection (2g/3g)** → only G1/M1.
7. **Kids' content**: games in categories aimed at young children get `data-tag-for-age-treatment="1"` on their ad slots (child treatment: no interest-based ads, no remarketing). List of such categories in Q18.

## 6. Ad networks by market
| Market | Network |
|---|---|
| Worldwide (except below) | AdSense → later Ad Manager via MCM partner |
| Russia, Belarus | Google not available. Options: (a) house promos only (default), (b) Yandex Advertising Network — needs a legal check (sanctions, payments to an Indian company) — Q19 |
| China | Out of scope (no plan to target) |

## 7. Measuring (needs Phase 10 tracking)
- Per day, per country, per device, per page type: page views, ad requests, impressions, viewable impressions, clicks, estimated earnings (from the AdSense API — real numbers only).
- RPM per 1,000 page views and per 1,000 sessions; play time per session (ads must not reduce it).
- Every new placement starts as an A/B test (T9.7 switch): keep it only if revenue per session goes up **and** play time per session drops by no more than 5%.

## 8. Consent and privacy pages
- Google-certified CMP (AdSense "Privacy & messaging") for EEA/UK/CH, IAB TCF v2.2; US state privacy message (California "Do not sell or share") and honour the Global Privacy Control signal.
- Privacy policy update: what we measure, ad partners, country handling, how to opt out (profile panel switch "Do not measure me").
- Cookie list page generated from the actual tags in use.

## 9. Owner decisions
- **Q18** Personalised ads policy (recommended: contextual everywhere at launch; lawyer review for US/EU adults later).
- **Q19** Russia: house promos only, or apply to Yandex Advertising Network after a legal check.
- **Q22** Mobile anchor ad and vignette ads as A/B tests (they conflict with PRD §11 today).
