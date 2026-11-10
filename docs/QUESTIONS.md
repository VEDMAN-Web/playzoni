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

### Q13 — Per-game og image and where thumbnails go   (T4.1, asked 11 Nov 2026, by build agent)
Question: (1) The import now makes public/thumbs/<slug>/og.png (1200x630) for every game, but the game page still uses the default og image. Should a task wire it in (the game page passes ogImage=/thumbs/<slug>/og.png)? (2) The task says thumbnails go straight into public/thumbs/<slug>/, so every imported game, published or not, would ship in dist/. With hundreds of candidates that is a lot of files. Should the import write to data/staging/thumbs/<slug>/ and npm run publish copy only the chosen games into public/thumbs/?
Options: (1) A) wire it in as part of T4.5. B) a separate small task later. (2) A) keep as written. B) staging first, copy on publish (build agent recommends B).
Blocking: none now. Please answer before T4.5 starts if possible.
Answer: —

### Q1 — Target "unblocked games"?   (SEO-PLAN §Strategy, asked 10 Nov 2026, by planner)
Question: "Unblocked games" has very high search volume (~5M/month in the US), but it means "games that get past school/office filters". Do we want pages aimed at it?
Options: A) No, not at launch (recommended — protects ad approval and brand) B) Yes, a small section later
Blocking: nothing now ("unblocked" stays on the banned words list until answered)
Answer: —

### Q2 — Game provider publisher accounts   (T4.2–T4.4, owner action)
Question: Please sign up as a **publisher** (website owner) at GameDistribution, GameMonetize and Playgama Partners using the company email, and share the feed URLs privately in the `.env` file (not in chat or git).
Blocking: T4.2, T4.3, T4.4
Answer: —

### Q3 — Domain and Cloudflare   (T5.5, owner action)
Question: Is playzoni.com bought, and where? We need it on a Cloudflare account (free plan) for hosting and DNS.
Blocking: T5.5
Answer: —

### Q4 — Legal page text   (T2.9, owner action)
Question: Privacy, Terms and Cookie texts must come from you or a legal template service you trust. Until then the pages say "being finalised" and are hidden from Google.
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

## Answered

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


