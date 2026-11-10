# Playzoni — international SEO and AEO plan (v1, 11 Nov 2026)

Goal from the owner: rank everywhere — USA, South America, Europe, Australia, India, Russia — in search engines **and** in AI answers (ChatGPT, Google AI Overviews/AI Mode, Perplexity, Copilot, Claude). This file is the strategy; docs/I18N.md (v2) is the language/URL spec; Phases 8 and 12 in TASKS.md build it. SEO-PLAN.md stays the base for English.

Built with the frameworks in the installed skills: claude-seo (`seo-hreflang`, `seo-geo`, `seo-programmatic`, `seo-plan`), marketingskills (`ai-seo`, `programmatic-seo`, `site-architecture`, `link-building`), open-seo-mcp-skills (`keyword-research`, `competitor-gap`, `ai-visibility`, `rank-tracking`).

## 1. Honest expectations
- A new domain usually needs **3–6 months** to get steady Google traffic in one language and **6–12 months** to compete for big words like "free online games". Each new language starts again from zero, helped by the domain's overall strength.
- We cannot outrank Poki/CrazyGames on head terms early. We win first on **long-tail and local-language terms** (specific game names, "<category> games" in each language, "games for 2 players on one phone") where the big sites are thin.
- Quality beats volume: Google's scaled-content-abuse policy punishes thousands of near-identical pages. Every page must pass the uniqueness gate in §6.

## 2. Markets and order
| Wave | Market | Language (URL) | Main search engine | Why / notes |
|---|---|---|---|---|
| 0 (launch) | USA, UK, Canada, Australia, India, rest of world | English (root, `x-default`) | Google (+ Bing for Copilot/ChatGPT) | Highest ad value (US/UK/CA/AU); India = volume; Indians search games mostly in English/Hinglish |
| 1 | Brazil (+ Portugal) | Portuguese `/pt/` | Google | Biggest casual-games audience in South America |
| 1 | Spain + Latin America (MX, AR, CO, CL, PE) | Spanish `/es/` (neutral Latin-American) | Google | One language, ~20 countries |
| 1 | Germany, Austria, Switzerland | German `/de/` | Google | High ad value in Europe |
| 1 | France, Belgium, Canada (QC) | French `/fr/` | Google | Large audience, good ad value |
| 2 | Italy | Italian `/it/` | Google | |
| 2 | Poland | Polish `/pl/` | Google | Strong browser-games culture |
| 2 | Russia + Russian speakers (KZ, BY, etc.) | Russian `/ru/` | **Yandex ~70%**, Google ~28% (StatCounter, Sep 2026) | Big audience, but Google ads do not pay here (ADS-DATA §6); main competitor is Yandex Games. Go only if Q19 gives a way to earn, or for brand reach |
| 3 | India (Hindi speakers), Indonesia | Hindi `/hi/`, Indonesian `/id/` | Google | Kept from I18N v1; lower priority (low ad value, English already serves most Indian searches) |

A wave starts only when the previous one passes its gate (§9).

## 3. Keyword strategy per language (seeds — verify with `keyword-research` before writing)
Never translate keywords word-for-word: research native search terms in each market (native-language prompts, Google autocomplete in that country, Search Console once live).

| Language | Seed head terms | Category pattern | Long-tail patterns |
|---|---|---|---|
| English | free online games, play games online, browser games, no download games | "<x> games" (car games, 2 player games) | "<game> unblocked" — banned until Q1; "games like <game>", "<game> online free" |
| Portuguese (BR) | jogos online grátis, jogos grátis, jogar online | "jogos de <x>" (jogos de carro, jogos de 2 jogadores, jogos de futebol) | "jogar <game> online", "jogos para celular sem baixar" |
| Spanish | juegos gratis, juegos online gratis, juegos sin descargar | "juegos de <x>" (juegos de carros/coches, juegos de 2 jugadores) | "jugar <game> gratis", "juegos para dos en el mismo teclado" |
| German | kostenlose spiele, online spiele kostenlos, spiele ohne download | "<x>spiele" (autospiele, 2-spieler-spiele) | "<game> online spielen" |
| French | jeux gratuits, jeux en ligne gratuits, jeux sans téléchargement | "jeux de <x>" (jeux de voiture, jeux à 2) | "jouer à <game> en ligne" |
| Italian | giochi gratis, giochi online gratis | "giochi di <x>" (giochi di macchine, giochi a 2) | "giocare a <game> online" |
| Polish | gry online za darmo, darmowe gry | "gry <x>" (gry samochodowe, gry dla 2 graczy) | "<game> graj online" |
| Russian | игры онлайн бесплатно, играть онлайн без регистрации | "игры <x>" (игры гонки, игры на двоих) | "играть в <game> онлайн" |

Rules:
- Category **slugs are translated** in each language (`/es/juegos-de-carros`, `/de/autospiele`) because the category word is the main keyword; game slugs stay the same as English (game names are brands). This changes I18N v1 (see I18N v2).
- Category order and the home rows are **tuned per market** from data (e.g. football first in Brazil), via the admin panel home layout per language (Phase 10).
- Banned words in every language stay banned (unblocked, hack, brand names of games we don't have).

## 4. Technical international SEO
- **One domain, language folders** (`/pt/`, `/es/`…). Strongest option for a new site: all languages share one domain's authority. No ccTLDs, no subdomains.
- **hreflang via XML sitemaps** (one sitemap per language with `xhtml:link` alternates; recommended for large sites). Also keep the HTML `<link rel="alternate">` on home and category pages only. Every set has a self-reference, return tags on every version, and `x-default` → English. Codes: `en`, `pt`, `es`, `de`, `fr`, `it`, `pl`, `ru`, `hi`, `id` (language only; we do not split by country in v1).
- A page links to an alternate **only if that translation exists and is published**; untranslated games are not linked or listed in that language.
- Canonical = itself in each language (never canonical to English). `<html lang>` set per page.
- **No automatic IP redirects** (Googlebot crawls mostly from the USA). Country → *suggestion bar* and footer language picker (I18N v2). Google removed the Search Console country-targeting setting in 2022, so hreflang + local content are our levers.
- **Search engines to register** (owner creates the accounts; the agent adds verification files): Google Search Console (domain property + URL-prefix properties per language folder for per-language reports), Bing Webmaster Tools (also feeds Copilot and ChatGPT search), **Yandex Webmaster** (needed for Russia), Naver/Seznam via IndexNow only.
- **IndexNow**: key file at the root and a ping on every publish/update/unpublish → Bing, Yandex, Naver, Seznam, Yep. Google does not use IndexNow; the sitemap `lastmod` covers Google.
- Speed budget (SEO-PLAN §Performance) applies to every language; translated pages must not add web fonts (Nunito covers Latin and Cyrillic; check Devanagari for Hindi → system font fallback).
- **AI crawlers in robots.txt** (Q20): allow the search/answer crawlers — `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Bingbot`, `Googlebot`, `Applebot`, `YandexBot`. Training-only crawlers (`GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`, `Bytespider`) are an owner choice; blocking them does not affect search ranking. Recommendation: allow all except `Bytespider` and `CCBot` (brand presence in AI answers is worth more than the risk for a free site).

## 5. AEO / GEO — being the answer in AI search
What gets cited (per `seo-geo` / `ai-seo`): pages that answer clearly in the first lines, are well structured, fresh, and from a brand that is **mentioned elsewhere** (YouTube and Reddit mentions correlate with AI citations much more than backlinks do).
1. **Answer-first blocks** on every game page: first 2 sentences say what the game is, how you win and that it is free in the browser; controls in a small table; 3–5 FAQ in natural questions ("Can I play X on my phone?"). Same on category pages ("What are the best car games to play free online?" → a short ranked list with one-line reasons). Already in SEO-PLAN templates — keep enforced by `npm run validate`.
2. **Structured data** stays: VideoGame, CollectionPage/ItemList, FAQPage, BreadcrumbList, WebSite, Organization (name Playzoni, parent SparkBeta Tech).
3. **Real numbers only**: once Phase 10 has real play data, show "Played N times this week" type facts only where true; AI engines like concrete stats. Never invent.
4. **Freshness**: "Updated <date>" on pages whose content changed; rotate "Popular this week".
5. **Brand mentions**: a YouTube channel with short gameplay clips per top game (titles/descriptions in each language, link to the game page) — owner/marketing work; genuine participation in Reddit/Discord communities per language (no spam, no fake accounts).
6. **llms.txt** at the root listing main sections (cheap, low impact; do it once).
7. **Prompt tracking** monthly per language: 20 questions a player would ask an AI ("best free car games online", "jogos de carro grátis"), check ChatGPT, Perplexity, Google AI Overview/AI Mode, Copilot; record whether Playzoni is cited (`ai-visibility` skill; optional Ryze MCP — Q23).
8. Bing matters: ChatGPT search and Copilot draw on Bing — submit sitemaps there from day one.

## 6. Content and localization quality (anti-thin rules)
- Translate only pages that are **published in English** with QA-based content.
- Translation by Claude from the English page, then a **native speaker reviews ≥10% of pages per language** before the language goes live and spot-checks monthly (budget Q21). Never machine-translate provider feed text.
- **Localize, don't just translate**: market-specific intro sentence on each category page, local search terms in titles/H1, local FAQ questions from `keyword-research`, examples that make sense locally.
- **Uniqueness gate** (`seo-programmatic`): any two pages in the same language must differ by ≥ 40% of their text (warn), < 30% blocks the build; ≥ 5% of each new batch is human-reviewed. Add to `npm run validate` per language.
- A language goes live when: UI strings 100%, ≥ 100 game pages + all published categories translated and checked, validate passes.

## 7. Links and authority (white-hat only)
- Game directories and "best browser games" lists per language; developer outreach (developers page: studios link to their game page on Playzoni); local gaming blogs/YouTubers (offer embed-free features, never paid links); PR when we hit real milestones.
- No link buying, PBNs, link exchanges at scale, fake reviews or fake social accounts.

## 8. Measurement
- Per language folder: indexed pages, impressions, clicks, CTR, average position (GSC URL-prefix properties), Yandex Webmaster for `/ru/`, Bing per language.
- Business view per market (Phase 10 admin): sessions, plays per session, revenue per session (ADS-DATA §7).
- Monthly report saved to `docs/seo-reports/<date>-intl.md` (agent runs the skills: `rank-tracking`, `seo-hreflang` audit, `ai-visibility`).

## 9. Gates (when to start the next wave)
| Gate | Condition |
|---|---|
| Start wave 1 | English live ≥ 6 weeks, ≥ 70% of English pages indexed, impressions rising 4 weeks in a row, Core Web Vitals green |
| Start wave 2 | Wave 1 languages each ≥ 60% indexed and getting clicks; no hreflang errors in the `seo-hreflang` audit |
| Start wave 3 / Russia | Q19 answered; previous gates met |

## 10. Owner decisions
- **Q19** Russia: build `/ru/` and how to earn there.
- **Q20** AI training crawlers: allow or block (recommended: allow except Bytespider and CCBot).
- **Q21** Native reviewers per language (freelance, ~10% of pages + monthly spot check) — price range to be quoted by the planner when the owner wants to start wave 1.
- **Q23** Connect the third-party Ryze MCP to Search Console/GA4 (it asks for access to Google accounts) — optional; the skills also work with manual data.
