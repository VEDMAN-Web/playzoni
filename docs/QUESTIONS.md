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

### Q8 — Keyword and search-results tool   (T0.3 blocked, T0.4 partly done, asked 10 Nov 2026, by build agent)
Question: T0.3 needs real monthly search volume and difficulty for US and India, and T0.4 needs real Google top-10 results. No keyword tool is set up. The START-HERE guide suggests the "Open SEO keyword-research" skill, but I could not find it on npm, and I will not invent numbers. The web search tool I have only gives a list of links in its own order, so the T0.4 tables are research-only (see docs/seo-research/serp-snapshot.md).
Options: A) Set up a keyword tool with an account you already have (tell me which one, and how to give me the key via .env) B) Pay for a DataForSEO account (pay-as-you-go, you approve the cost first) C) Skip volumes for now and build without them (T0.3 stays blocked; Phase 1 can continue)
Blocking: T0.3, and any later task that uses search volume (T4.5 shortlist)
Answer: —

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
(none yet)
