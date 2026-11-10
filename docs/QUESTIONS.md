# Playzoni — open questions

Build agent: add new questions at the top of "Open", using the format. Never delete a question; move it to "Answered" with the answer.
Owner (Vedant): answer under the question in plain words, or tell the reviewer chat.

Format:
```
### Q<n> — <short title>   (task T<id>, asked <date>, by build agent)
Question: <one or two sentences>
Options: A) … B) …   (if any)
Blocking: T<ids>
Answer: —
```

## Open

### Q1 — Target "unblocked games"?   (SEO-PLAN §Strategy, asked 10 Nov 2026, by planner)
Question: "Unblocked games" has very high search volume (~5M/month in the US), but it means "games that get past school/office filters". Do we want pages aimed at it?
Options: A) No, not at launch (recommended — protects ad approval and brand) B) Yes, a small section later
Blocking: nothing now ("unblocked" stays on the banned words list until answered)
Answer: —

### Q2 — Game provider publisher accounts   (T4.2–T4.4, owner action)
Question: Please sign up as a **publisher** (website owner) at GameDistribution, GameMonetize and Playgama Partners using the company email, and share the feed URLs privately in the `.env` file (not in chat or git).
Blocking: T4.2, T4.3, T4.4
Answer: partly (11 Nov 2026). GameMonetize and Playgama: signed up, feeds working. GameDistribution: rejected for low traffic — re-apply after launch (T5.6). **Still needed from owner:** the GameMonetize ads.txt lines (GameMonetize → Publisher → My Websites → View) pasted into `data/ads-gamemonetize.txt` (T5.5).

### Q3 — Domain and Cloudflare   (T5.5, owner action)
Question: Is playzoni.com bought, and where? We need it on a Cloudflare account (free plan) for hosting and DNS.
Blocking: T5.5
Answer: —

### Q4 — Legal page text   (T2.9, owner action)
Question: Privacy, Terms and Cookie texts must come from you or a legal template service you trust. Until then the pages say "being finalised" and are hidden from Google.
Planner draft (for a lawyer to check): Privacy Policy draft https://claude.ai/artifact/Mr14GXmgeiw2jRfTcMbHjH — blanks to fill: Grievance Officer name, privacy email, game-provider policy links, effective date. It must also be updated for: tracking (ADMIN §3), ads and consent (ADS-DATA §8), OneSignal alerts (T9.9), accounts 18+ rule (ACCOUNTS.md — lawyer to confirm).
Blocking: going live with ads (T6.1)
Answer: —

### Q5 — Contact email   (T2.9)
Question: OK to use hello@playzoni.com? It must be created on the domain's email.
Blocking: nothing (placeholder used)
Answer: —

### Q6 — Game testers   (T5.1, owner action)
Question: Who in the team will play-test games and fill the QA notes? About 3 minutes per game, 300 games for launch (~15 hours of work in total).
Blocking: T5.3
Answer: —

### Q18 — Personalised ads or contextual ads?   (ADS-DATA §1, §5, asked 11 Nov 2026, by planner)
Question: Children use game sites, and India (from May 2027), Brazil (ECA Digital) and the USA (COPPA, since Apr 2026) restrict profiling minors for ads; the EU needs consent. Personalised ads usually pay more.
Options: A) Contextual (non-personalised) ads everywhere at launch; revisit per market after a lawyer's advice (recommended) B) Personalised ads where consent exists (EU) and in the US for general audiences, contextual in India/Brazil — only after a lawyer confirms in writing
Also: which categories count as "aimed at young children" (child ad treatment)? Planner suggestion: dress-up for kids, colouring, educational, baby/pet care.
Blocking: T11.4
Answer: —

### Q19 — Russia   (SEO-INTL §2, ADS-DATA §6, asked 11 Nov 2026, by planner)
Question: Google ads do not pay for Russian visitors, and Yandex (70% of Russian search) has its own games portal. Build `/ru/` at all, and how do we earn there?
Options: A) Not now — revisit after waves 1–2 (recommended) B) Build `/ru/` for reach, house promos only C) Build `/ru/` and apply to Yandex Advertising Network after a legal check (sanctions, payments to India)
Blocking: wave 2 Russian, T11.4 (RU rule)
Answer: —

### Q20 — AI training crawlers   (SEO-INTL §4, asked 11 Nov 2026, by planner)
Question: Search/answer bots (ChatGPT search, Claude search, Perplexity, Bing, Google, Yandex) will be allowed. Should training-only bots (GPTBot, ClaudeBot, Google-Extended) also be allowed? Blocking them does not change search rankings.
Options: A) Allow all except Bytespider and CCBot (recommended — more presence in AI answers) B) Block all training bots
Blocking: T8.8
Answer: —

### Q21 — Native-language reviewers   (SEO-INTL §6, owner action, asked 11 Nov 2026)
Question: Each language needs a native speaker to check ≥10% of pages before launch and spot-check monthly. Use freelancers (e.g. via Upwork/Fiverr) or your own contacts? The planner will quote a price range per language when wave 1 starts.
Blocking: wave 1 go-live
Answer: —

### Q22 — Mobile anchor ad and vignette ads   (ADS-DATA §4, asked 11 Nov 2026, by planner)
Question: These two Google Auto ads formats often earn the most, but PRD §11 says no sticky ads on mobile. Test them?
Options: A) A/B test both on 50% of visitors, keep only if revenue per session rises and play time per session falls ≤5% (recommended) B) Never use them
Blocking: T11.4
Answer: —

### Q23 — Connect the Ryze MCP to Google accounts?   (SEO-INTL §5, §10, asked 11 Nov 2026, by planner)
Question: The open-seo-mcp-skills pack works best through Ryze's hosted connector, which asks for access to Search Console, Analytics and Ads. It is a third-party company.
Options: A) No for now — use the skills with manual data and Google's own tools (recommended) B) Yes, read-only access after launch
Blocking: nothing
Answer: —

### Q24 — Admin panel approvals   (ADMIN §2, §6, asked 11 Nov 2026, by planner)
Question: The admin panel needs three new parts: (1) uPlot chart library (free, MIT), (2) Cloudflare Access for Google sign-in (free up to 50 users), (3) a GitHub App so admin edits become commits on `dev`. The planner will also show you a clickable design of the dashboard before building.
Options: A) Approve all three (recommended) B) Discuss first
Blocking: T10.5
Answer: —

## Answered

### Q17 — Player block sizes in V2.10 are not exactly 16:9   (R28, asked 11 Nov 2026, by build agent)
Question: V2.10 says the player is 7×4 cells (754×424) and 9×5 cells (974×534) "exactly 16:9", with the bar inside. 754×424 is 16:9, but 974×534 is not (16:9 at 974 wide is 548 high), and the control bar (64px) needs room too. What I built: the game frame is exactly 16:9 (754×424 up to 1599px; 974×548 from 1600px) and the bar sits directly below it, so the player block takes one more grid row than the frame (5 rows, 6 from 1600px). The ad strip moves one row down (row 6 / 7).
Options: A) Keep this (recommended; the frame is always 16:9, nothing is cropped) B) Put the bar on top of the bottom of the frame so the block is exactly 7×4 / 9×5 cells (the game loses about 64px of height)
Blocking: nothing
Answer: **A — keep it** (planner, 11 Nov 2026). The frame stays exactly 16:9 and the bar sits below it, like Poki. V2.10 is corrected: the 9×5 figure was wrong; the player block is 5 rows (6 from 1600px) including the bar.

### Q16 — Shape of the category title tile   (TP.2, asked 12 Nov 2026, by build agent)
Question: DESIGN §V2.3 says "1×4 white title tile". Everywhere else the design writes width × height (S = 1×1, "6×1 ad strip", "6×4 player"), so I built it 1 cell wide and 4 cells tall: it sits in the first column under the nav box, with the breadcrumbs and a smaller H1 inside. The text says it replaces the old "4×1" tile, which could also mean it should stay wide (4 across, 1 high). Which one do you want?
Options: A) 1 wide × 4 tall, under the nav box (built now). B) 4 wide × 1 tall, beside the nav box (the old shape).
Blocking: none. Changing it is a few lines in src/components/TitleTile.astro.
Answer (planner): B, wide like Poki — on category and list pages the title tile is **3 cells wide × 1 cell tall**, placed right after the nav box (on `/categories` it is 2×1 as DESIGN §V2.8 says). Read every `A×B` in DESIGN as width × height; "1×4" in §V2.3 was a mistake for 4×1 and is now 3×1. Fix as R23.


### Q15 — Picture size for the 300 launch games   (T4.6, owner decision)
Question: The 300 launch games have 111 MB of pictures in public/thumbs. Most of it is the 1200x630 social image (og.png, about 305 KB each). Converting it to WebP (about 50 to 80 KB each, the SEO plan allows WebP) would cut that to roughly 20 MB, which is much easier to keep in git and to deploy. Should we convert? Until you decide, these picture folders are not committed; the drafts are.
Options: A) Convert og images to WebP now (small change in the import, publish and game page; the build agent recommends this). B) Keep PNG and commit the 111 MB.
Blocking: T5.5 (deploy) needs the pictures in git.
Answer (planner): Convert, but to **JPEG quality 80** (`og.jpg`), not WebP — every social app (WhatsApp, Facebook, X, LinkedIn) shows JPEG previews reliably. Target ≤ 100 KB each. Update import, publish and the game page `og:image` (+ `og:image:type image/jpeg`). Then commit the 300 picture folders.


### Q14 — Decisions the feeds left open   (T4.3, T4.4, asked 11 Nov 2026, by build agent)
Question: The GameMonetize feed and the Playgama catalog do not give everything our data model needs, so the adapters decided as below. Please confirm or change any of them (none of this blocks work).
(1) Playgama has no width or height: horizontal (alone or together with vertical) = landscape 800x450, the size of Playgama's own embed code; vertical only = portrait 450x800.
(2) GameMonetize has no mobile flag: mobile is true only when the game's feed tags include Mobile (10 of 50). Playgama: mobile is true when the catalog lists Android or iOS (2552 of 2648). The play test decides later.
(3) Playgama games with no English version (3), with a game address outside playgama.com (16) or with no screen orientation (1) are left out, and listed in data/staging/failed.txt.
(4) Only provider category names that are exactly one of our category words are mapped (for example puzzle to puzzle-games). 152 Playgama genres and 2 GameMonetize categories (Hypercasual, Girls) are in data/staging/unmapped.txt for you to decide. Until then 171 Playgama and 8 GameMonetize staged games have no category, and npm run publish refuses them.
(5) The staging folder holds 2648 Playgama games (969 MB of pictures, git-ignored) from a first full run that was stopped; they are kept at the owner request. A normal run now takes the top 500 in the catalog order.
Options: say "ok", or give the change.
Blocking: none
Answer (planner): (1) ok. (2) ok — the play test decides mobile. (3) ok. (5) ok. (4) The planner will map the genres: see R14 (commit the unmapped list so the planner can read it).


### Q13 — Per-game og image and where thumbnails go   (T4.1, asked 11 Nov 2026, by build agent)
Question: (1) The import now makes public/thumbs/<slug>/og.png (1200x630) for every game, but the game page still uses the default og image. Should a task wire it in (the game page passes ogImage=/thumbs/<slug>/og.png)? (2) The task says thumbnails go straight into public/thumbs/<slug>/, so every imported game, published or not, would ship in dist/. With hundreds of candidates that is a lot of files. Should the import write to data/staging/thumbs/<slug>/ and npm run publish copy only the chosen games into public/thumbs/?
Options: (1) A) wire it in as part of T4.5. B) a separate small task later. (2) A) keep as written. B) staging first, copy on publish (build agent recommends B).
Blocking: none now. Please answer before T4.5 starts if possible.
Answer (planner): (1) A — wire it in as part of T4.5 (game page passes `ogImage=/thumbs/<slug>/og.png` when that file exists, else the default). (2) B — import writes to `data/staging/thumbs/<slug>/` (gitignored); `npm run publish` copies only chosen games into `public/thumbs/<slug>/`. T4.5 text updated.


### Q11 — Speed budget on the home and game pages   (T3.4 blocked, asked 11 Nov 2026, by build agent)
Question: After the speed fixes, the home page scores 93 for performance (budget 95) and its largest image shows at about 2.6 s (budget 2.0 s). Car games and a game page show their largest image at 2.2–2.4 s. These numbers come from a test server on this computer, with placeholder images of about 4 KB. Should the budget be checked on the live Cloudflare Pages preview (needs Q3), or should the numbers be accepted for now?
Options: A) Accept the local numbers, and check again on the Cloudflare preview in T5.5. (Build agent recommends this: placeholder images say little about real speed, and real thumbnails come in T4.1.) B) Keep working now on a lighter first image or font file, then measure again.
Blocking: T3.4 (blocked), T3.5 (depends on T3.4)
Answer (planner): A. Accept for now. T3.4 can be marked done once R11 items (2) and (3) are fixed. The speed budget is re-checked on the Cloudflare preview with real thumbnails (added to T5.5).

### Q12 — Game title in the player bar on phones   (T3.4, asked 11 Nov 2026, by build agent)
Question: On a 360 px phone the player bar holds five 44 px buttons (favourite, like, dislike, fullscreen, share). They fill the row, so the game title in the bar is squeezed to 0 px. Nothing overflows, but the title is hidden on the smallest phones. Which should we do?
Options: A) Hide the title in the bar under 400 px; the page heading above still shows the game name. (Build agent recommends this.) B) Move Share and Fullscreen into a small "more" menu. C) Let the bar grow so the title can wrap onto a second line.
Blocking: none
Answer (planner): A. Hide the bar title below 400px; keep all five buttons.


### Q10 — Category page H1 and the nav spacer   (T2.3, asked 10 Nov 2026, by build agent)
Question: PRD §5 says the H1 sits at the top of category pages, but DESIGN §Grid and §Header say the first grid item on a category page is the nav spacer (so tiles flow around the floating nav box). Both cannot be at the very top. I put the breadcrumbs and H1 above the grid, below the nav box, and left the spacer out on category pages. Is that right, or should the grid start with the spacer and the H1 move elsewhere?
Options: A) Keep the H1 above the grid, no spacer (what is built now) B) Grid first with the spacer, and the H1 in a row above it
Blocking: nothing (one template line to change)
Answer (planner): B, Poki-style, on ≥1024 only. Grid starts with the nav spacer (3×1), then a white **title tile** (4×1 cells, radius `--r-card`, padding 16) holding the breadcrumbs (`--t-small`) and the H1 (`--t-h2` size so it fits; it is still the page's only `<h1>`). Below 1024 keep what is built now (breadcrumbs + H1 above the grid). Same pattern on list pages (T2.7). Do this as review item R10.

### Q9 — Manifest and theme colour   (T1.6, asked 10 Nov 2026, by build agent)
Question: DESIGN §Brand says the manifest `theme_color` is `--c-primary` (blue), but the new DESIGN §Colours says the `theme-color` meta and manifest `theme_color` are `--c-bg` (light blue). I followed §Colours, so both are #E3F1FF. Is that right?
Options: A) Yes, use the light blue (what is built now) B) No, use the primary blue #1F7AFF
Blocking: nothing (a one-line change in data/brand.json and public/site.webmanifest)
Answer (planner): A — keep light blue #E3F1FF. DESIGN §Brand updated to match.


### Q8 — Keyword and search-results tool   (T0.3 blocked, T0.4 partly done, asked 10 Nov 2026, by build agent)
Question: T0.3 needs real monthly search volume and difficulty for US and India, and T0.4 needs real Google top-10 results. No keyword tool is set up. The START-HERE guide suggests the "Open SEO keyword-research" skill, but I could not find it on npm, and I will not invent numbers. The web search tool I have only gives a list of links in its own order, so the T0.4 tables are research-only (see docs/seo-research/serp-snapshot.md).
Options: A) Set up a keyword tool with an account you already have (tell me which one, and how to give me the key via .env) B) Pay for a DataForSEO account (pay-as-you-go, you approve the cost first) C) Skip volumes for now and build without them (T0.3 stays blocked; Phase 1 can continue)
Blocking: T0.3, and any later task that uses search volume (T4.5 shortlist)
Answer (planner, 10 Nov 2026): C. Paid keyword tools are not worth it before launch. T0.3 is skipped. T0.4 snapshot stays as research only. T4.5 now sorts by provider popularity; search volumes come later from Google Keyword Planner and Search Console (owner's SEO team).

### Q7 — Five doc conflicts found by the graph   (T0.2, asked 10 Nov 2026, by build agent)
Question: The graph extraction found places where our docs disagree. Which version should the build follow?
(1) Game tile size L: PRD §6 says 2x2, DESIGN §Game tile says 3x3 (and M is 2x2). Blocks T2.1.
(2) Favourites in header: PRD §8 says the icon opens a drawer; TASKS T1.5 says it links to /favourites. Blocks T1.5.
(3) Heart button: TASKS T2.6 puts a favourite heart in the player bar; DESIGN §Player does not list one. Blocks T2.6.
(4) Tailwind: PRD §2 says "official Astro integration". T0.1 used `@tailwindcss/vite` (Tailwind's own Vite plugin, which is what Astro now recommends; the older `@astrojs/tailwind` is deprecated). Please confirm this is fine. No blocker.
(5) Search: robots.txt disallows /search, so Google never sees the noindex on /search. Should we keep the Disallow or drop it? Blocks T3.1.
Also: PRD §6 cites "SEO-PLAN §Home", which does not exist (no blocker).
Options: for each item, the doc you want followed.
Blocking: T1.1 (none directly), T1.5, T2.1, T2.6, T3.1 — see items above
Answer (planner, 10 Nov 2026): (1) Follow DESIGN: S 1×1, M 2×2, L 3×3 — PRD fixed. (2) Heart links to /favourites, no drawer — PRD fixed. (3) Yes, heart in the player bar — DESIGN fixed. (4) @tailwindcss/vite approved — PRD fixed. (5) Good catch: `Disallow: /search` removed from SEO-PLAN; keep `Disallow: /*?` and noindex on /search. PRD §6 reference fixed.


