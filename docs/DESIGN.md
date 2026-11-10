# Playzoni — design system (v1.0)

Original brand. Bright, friendly, fast. Light theme only in MVP. All values below become CSS variables in `src/styles/tokens.css` and are mapped in the Tailwind config. Components use only these tokens.

## §Brand
- Name: **Playzoni** (always this casing in text; logo is lowercase `playzoni`).
- Tagline: "Play free games instantly."
- Logo: SVG wordmark `playzoni` in Nunito 900, colour `--c-ink`, with the `o` replaced by a filled circle in `--c-primary` containing a white play triangle. Provide `logo.svg` (wordmark) and `icon.svg` (circle + triangle only). Favicons: 32px PNG, 180px apple-touch-icon, 192/512 PNG + `site.webmanifest` (name, short_name, theme_color = `--c-bg`, background_color = `--c-bg`).

## §Colours
Light blue theme (changed 10 Nov 2026 at the owner's request).
| Token | Hex | Use |
|---|---|---|
| `--c-bg` | `#E3F1FF` | Page background (light blue) |
| `--c-surface` | `#FFFFFF` | Tiles, cards, nav box |
| `--c-ink` | `#0E2440` | Main text, logo |
| `--c-ink-2` | `#50607A` | Secondary text |
| `--c-line` | `#D2E3F5` | Borders, dividers |
| `--c-primary` | `#1F7AFF` | Play button, active states, logo dot |
| `--c-primary-ink` | `#FFFFFF` | Text on primary |
| `--c-primary-dark` | `#0F5FD6` | Primary hover/pressed |
| `--c-accent` | `#FFC531` | "New" badge |
| `--c-accent-2` | `#FF5A8A` | "Hot" badge |
| `--c-player-bg` | `#0B1A2E` | Behind the game iframe |
| `--c-focus` | `#0E2440` | 3px focus ring (always visible on keyboard focus) |

Contrast: body text on `--c-bg` ≥ 7:1; white on `--c-primary` only at ≥ 18px bold (large text) or on icons. `theme-color` meta and manifest `theme_color` = `--c-bg`.

## §Type
Font: Nunito Variable (`@fontsource-variable/nunito`), fallback `system-ui, sans-serif`.
| Token | Size / line-height / weight | Use |
|---|---|---|
| `--t-h1` | 28/34 mobile, 36/42 ≥768, 800 | H1 |
| `--t-h2` | 22/28, 800 | H2 |
| `--t-h3` | 18/24, 700 | H3, row titles |
| `--t-body` | 16/26, 400 | Body text |
| `--t-small` | 14/20, 600 | Meta, chips, table labels |
| `--t-tile` | 13/16, 700 | Tile title overlay |
Text blocks max width 72ch.

## §Space, radius, shadow
- Space scale (px): 4, 8, 12, 16, 24, 32, 48, 64 → `--s-1`…`--s-8`.
- Page gutter: 12px (<480), 16px (480–1023), 24px (≥1024). Content max width 1440px, centred.
- Radius: `--r-tile` 16px, `--r-card` 20px, `--r-pill` 999px, `--r-player` 12px.
- Shadow: `--sh-tile` `0 2px 6px rgba(29,26,47,.10)`; `--sh-tile-hover` `0 8px 20px rgba(29,26,47,.18)`.

## §Game tile (`GameTile`)
- Square, thumbnail fills it (`object-fit: cover`), radius `--r-tile`, background `--c-surface`, shadow `--sh-tile`.
- Sizes: S = 1×1 cell, M = 2×2, L = 3×3. Image source: S → `s.webp` (150px) with `srcset` m for 2× screens; M → `m.webp`; L → `l.webp`.
- Title: hidden by default; on hover (desktop) and focus, a bottom gradient (`transparent → rgba(29,26,47,.85)`) slides up with the title in white `--t-tile`, 2 lines max, ellipsis. On touch devices the title is not shown on tiles (image + `alt` + `aria-label` only). No title text under any tile, rows included (R27) — the hover/focus overlay is the only place the name appears.
- Hover: `transform: translateY(-3px) scale(1.03)`, shadow `--sh-tile-hover`, 150ms ease-out. Respect `prefers-reduced-motion` (no transform).
- Badges (top-left, pill, `--t-small`): "New" (`--c-accent`, ink text) if addedDate ≤ 14 days; "Hot" (`--c-accent-2`) if in top 20 popularity. Max one badge.
- Whole tile is one `<a href="/game/<slug>">` with **no** `aria-label`; its accessible name comes from the title text inside it (visually hidden or overlay, but never `display:none`). The thumbnail `<img>` inside a tile has `alt=""` (the link text already names the game).

## §Grid (`GameGrid`)
- Cell size `--cell`: 88px (<480), 100px (480–1279), 112px (≥1280). Gap 10px (<480), 12px (≥480).
- `display:grid; grid-template-columns: repeat(auto-fill, var(--cell)); grid-auto-rows: var(--cell); grid-auto-flow: dense; justify-content: center;`
- Mosaic mode (home, category page 1): first item is the nav spacer (§Header). Pattern repeats every 18 tiles — positions 1 and 10 are L, positions 4, 7, 14 are M, the rest S. Featured games fill L slots first. Below 480px use M instead of L (L would fill the full width).
- Uniform mode (rows, related, lists): all S, or all M where the task says so.
- No horizontal page scroll at any width.

## §Rows (`GameRow`)
Title (`--t-h3`) left, "See all ›" link right. Tiles in one horizontal line, scroll-snap, swipe on touch, hidden scrollbar, arrow buttons on desktop (≥1024) at both ends. Tile size S on all widths (smaller, Poki-style rows). Row tiles are the same plain square tiles as the grid: no title under them (R27); name only in the hover/focus overlay.

## §Header (nav box — no full-width bar)
The site has **no full-width header bar and no category chip row**. Navigation lives in a small white "nav box" that floats at the top-left, and categories appear as tiles inside the grid (§Category tile) and in the search panel.

- **Nav box:** `position: fixed; top: var(--gap); left: var(--gutter); z-index: 50`, `--c-surface`, radius `--r-card`, shadow `--sh-tile`. Contents left to right: logo (height 28px, links to `/`), then icon buttons 44×44: search (magnifier), favourites (heart, links to `/favourites`). 
  - ≥1024: size exactly 3 cells wide × 1 cell tall (`calc(3*var(--cell) + 2*var(--gap))` × `var(--cell)`); logo on the top line, the two icon buttons on the bottom line, centred.
  - <1024: one line, height 56px, width auto (padding 0 12px).
- **Space for the nav box:**
  - Pages with a grid (home, category, list pages): the grid's **first item** is an empty `<div class="nav-spacer" aria-hidden="true">` spanning 3×1 cells (≥1024) so tiles flow around the fixed box. Below 1024 the spacer is hidden and the page gets `padding-top: calc(56px + 2*var(--gap))`.
  - Pages without a grid (game, static, search): `padding-top: calc(var(--cell) + 2*var(--gap))` on ≥1024, `calc(56px + 2*var(--gap))` below.
- **Search panel:** the search button opens a panel that slides in from the left (`<dialog>` or a fixed `div`), width 400px on ≥768, full screen below. Contents: close button 44×44, search input (autofocus, pill, 48px), then "Categories" heading and **all published categories as chips** (§Chips), then search results (T2.8). Close on Escape, close button, or click outside. Without JS the search button is a plain link to `/search`. The panel's category links are in the page HTML (hidden until opened) so they still count as internal links.
- **Footer** stays as built (8 categories + list pages + static pages).

## §Category tile (`CategoryTile`)
Size 2 cells wide × 1 cell tall, white, radius `--r-tile`, shadow `--sh-tile`. Left: 48px circle in `--c-bg` with the category emoji (field `emoji` in `categories.json`, required for every category). Right: category `shortName` + " Games" (`--t-h3`, ink). Hover as game tiles. Whole tile is a link to the category page.
- Home mosaic: after tile 36, insert all 12 nav categories as category tiles in nav order; at the end of the home page "All categories" section uses category tiles for every published category.
- Category page: after the first 30 game tiles, insert category tiles for its parent and children.

## §Player
- Container background `--c-player-bg`, radius `--r-player`, aspect from game (`landscape` 16:9, `portrait` 9:16 with max-height `calc(100vh - 160px)`, `square` 1:1). Max width 1100px.
- Cover state: blurred, darkened `l` thumbnail as background; centred `m` thumbnail (radius 20), title (`--t-h2`, white), and the Play button: pill, `--c-primary`, white 20px 800 text "Play", 56px tall, min 180px wide, play icon left, gentle pulse animation (off with reduced motion).
- Bar under player: 56px, `--c-surface`, rounded bottom corners. Left: 40px icon + title (700) + developer (`--c-ink-2`). Right: icon buttons 44×44 — favourite (heart), like, dislike, fullscreen, share, report (flag). Tooltips via `title` + `aria-label`.
- Mobile overlay (<768): fixed, inset 0, z-index top, black background, iframe fills it (safe-area insets), close button top-right 44×44 with white × on 50% black circle.

## §Content blocks
- Text card: `--c-surface`, radius `--r-card`, padding 24 (mobile 16), H1/H2/H3 per type tokens, links `--c-primary` underlined on hover.
- FAQ: `<details>`/`<summary>` list, summary 700 weight, chevron rotates when open. No JS.
- Info table: 2 columns, label `--t-small` `--c-ink-2`, value `--t-body`, rows separated by `--c-line`.
- Chips (related categories): pill, `--c-surface`, border `--c-line`, small icon optional, count after name in `--c-ink-2`.
- Breadcrumbs: `--t-small`, separator `›`, last item not a link.

## §States and accessibility
- Visible focus ring on everything focusable (`outline: 3px solid var(--c-focus); outline-offset: 2px`).
- All icon buttons have `aria-label`. Tap targets ≥ 44×44.
- Images have `alt` = game title; decorative images `alt=""`.
- Skeletons are not used (static HTML is already there). Images reserve space via width/height.
- Empty states: favourites empty → "No favourites yet. Tap the heart on any game to save it here." Recently played hidden when empty. Search no results → "No games found for "{q}"." + popular row.

---

## §Poki parity v2 (11 Nov 2026 — **overrides every earlier section where they differ**)
Owner wants the site to look and behave like poki.com. Copy Poki's **layout, sizes, behaviour and motion**. Never copy Poki's logo, mascot, wording, images, icons files or code. Reference screenshots were taken from poki.com on 11 Nov 2026 (home, Master Chess game page, footer).

### V2.1 Page background
- Full-page background: `linear-gradient(160deg, #5BBFFF 0%, #8FDCFF 55%, #B6F0FF 100%)` (`--c-bg-from`, `--c-bg-mid`, `--c-bg-to`), `background-attachment: fixed`.
- On top: an **original** low-poly pattern — a single inline SVG (`src/assets/bg-pattern.svg`, ≤ 6 KB) of large soft triangles in white at 6–14% opacity, fixed, covering the viewport, `pointer-events:none`, `z-index:-1`. Draw our own triangles; do not trace Poki's.
- `--c-bg` (used for small surfaces like chip backgrounds) stays `#E3F1FF`.

### V2.2 Grid and tiles
- Cell size `--cell`: **94px** (<480), **110px** (480–1023), **130px** (≥1024). Gap `--gap`: **12px** (<480), **16px** (≥480).
- The whole page content sits in one centred grid column block: `max-width: calc(10 * var(--cell) + 9 * var(--gap))` on desktop, centred with `margin: 0 auto`.
- Tile sizes: **S = 1×1**, **L = 2×2**. Remove M from the home mosaic. One **XL = 3×3** tile is allowed only as the first featured game on the home page at ≥1024.
- Home mosaic pattern (repeats every 24 items, after the nav box): positions 3 and 16 are L; everything else S. Featured games fill L/XL first.
- Tile radius **16px** (S) and **20px** (L/XL). Shadow `0 4px 10px rgba(14,36,64,.18)`.
- **Badges:** no text pills. A badge is a 28×28 (22×22 below 480px, icon 14px) white rounded square (radius 8) in the tile's top-left corner (offset 6px), holding one 18px line icon in `--c-primary`: "new" = sparkle icon, "hot" = flame icon, "updated" = circular-arrow icon. Draw our own simple SVG icons.
  - "new" only if added ≤ 7 days ago **and** the game is in the newest 8 on the site. "hot" = top 10 by popularity. Max one badge per tile. Never more than **6 hot** badges and 12 badges in total on one page (played badges do not count toward the 12).
- **Hover (desktop):** tile lifts `translateY(-4px) scale(1.04)` over 180ms `cubic-bezier(.2,.8,.2,1)`, shadow deepens; the game title slides up from the bottom inside a dark gradient (2 lines max). If a game has a preview video in its data (`previewVideo`, optional, MP4 ≤ 1 MB, from the provider), play it muted/looped inside the tile on hover only; never load it before hover.
- **Tap (mobile):** no hover state; press feedback = `scale(.96)` for 120ms.
- **Load-in:** tiles fade and rise in (`opacity 0→1`, `translateY 8px→0`, 220ms) as they enter the viewport, staggered 15ms per tile, max 300ms total. Use one IntersectionObserver. Off with `prefers-reduced-motion`.

### V2.3 Nav box (replaces §Header sizes)
- **Desktop ≥1024, top of page:** the nav box is the **first grid item, 1×1 cell** (130×130), white, radius 20, shadow as tiles. Contents stacked: logo (width 96px) on top; under it a row of two 40×40 icon buttons: search and favourites. It scrolls with the page (not fixed).
- **Desktop, after scrolling past 160px:** a **floating nav bar** slides down (220ms) at the top centre: fixed, `top: 12px`, white, radius 16, height 56, shadow. Contents left→right: logo (height 28) | divider | icon buttons 44×44 with tooltips: Popular (flame → `/popular-games`), New (sparkle → `/new-games`), Categories (grid icon → `/categories`), Search (opens search panel), Favourites (heart → `/favourites`). It slides up again when scrolling back above 160px.
- **Below 1024:** a fixed top bar (height 56) with logo left and Search + Favourites right, **white, radius 0 0 16 16, width = grid width** (not full screen), so it looks like a tab hanging from the top. Page `padding-top: 68px`.
- Remove the 3×1 nav box and the 4×1 title tile from earlier versions. On category and list pages the H1 + breadcrumbs go in a **3×1 (3 wide, 1 tall) white title tile** (radius 20, padding 16) placed right after the nav box on ≥1024, and above the grid below 1024.

### V2.4 Game page (Poki layout)
- **Desktop ≥1024:** one grid, **no empty gaps anywhere** — every cell around the player is a tile or a reserved ad block. Column 1: nav box (1×1) then related tiles stacked 1×1. Centre: the **player block always spans 6×4 cells at 16:9, for every game** (also games the feed calls portrait/vertical — they centre themselves inside the wide frame on the dark player background, exactly like on Poki). Never shrink the frame to a phone shape on desktop. The player bar (64px) is attached below it. Right: an ad block 2×2 cells (empty, reserved, label "Advertisement" in 11px caps, only when ads are enabled; otherwise filled with tiles) then related tiles 1×1 and 2×2. Below the player: a 6×1 ad strip (same rule), then related tiles fill the rest of the grid rows. Text content (breadcrumbs, H1, intro, how to play, FAQ, info table) goes in a white card spanning the full grid width **below** the tile area.
- **Game loads automatically on desktop:** on ≥1024, create the iframe after the `load` event plus `requestIdleCallback` (fallback 300ms). Show a loading state (player background + our spinner) until the iframe fires `load`. Keep the static cover HTML in the page for no-JS and for SEO.
- **Phones/tablets (<1024):** keep cover + Play button → full-screen overlay (no change). Orientation from the feed is used **only** here (to suggest rotating the phone for landscape-only games).
- Player bar (desktop): left = 40px game icon + title (700) + "by {developer}"; right = like, dislike, favourite, fullscreen, share, report icons 40×40, each with a small label under it in 11px (e.g. "Like"). No counts unless we have real data.

### V2.5 SEO text card (home, category, list pages)
- A **single white card**, radius 20, padding 32 (16 on phones), spanning the full grid width, placed **directly above the footer**, after all tiles and rows. Content follows SEO-PLAN §Content: H1 (home) / H2s, short paragraphs, **bold** key phrases, bullet lists with linked category names, a "Top games" list (5 linked published games), FAQ. Links in `--c-primary-dark`, bold.

### V2.6 Footer (Poki structure, our content)
- White background with a **slanted top edge**: `clip-path: polygon(0 48px, 100% 0, 100% 100%, 0 100%)`; padding-top 96px.
- Left block: logo + tagline "Play free games instantly." on one line; below it social icon buttons (44px dark circles with white icons) for each social URL in `brand.json` (hide any that are empty).
- Right: three columns with **small uppercase grey headings** (`--t-small`, letter-spacing .06em, `--c-ink-2`) and **bold dark links** (16px, 700, `--c-ink`, 36px line spacing):
  - POPULAR: up to 8 published categories + "All Games"
  - HELP AND SUPPORT: Contact, Privacy, Terms, Cookies
  - GET TO KNOW US: About, For developers
- Bottom line: "© {year} SparkBeta Tech". Phones: columns stack, 2 per row.

### V2.7 Motion summary
Tile hover/press, tile load-in, floating nav bar slide, search panel slide-in (240ms), Play button gentle pulse (mobile cover), favourite heart pop (scale 1→1.25→1, 250ms). All motion off under `prefers-reduced-motion`. No other animation.

### V2.8 Poki details (second walkthrough, 11 Nov 2026 — overrides earlier text where different)
- **"Played" badge:** a game the visitor has played before (from the recently-played list in localStorage) gets the **circular-arrow** badge in the top-left corner on every tile, everywhere. It has priority over "new" and "hot". Applied by a small script after load (badge is absolutely positioned, so no layout shift). The circular-arrow icon means *only* "you played this" (drop the earlier "updated" meaning).
- **Hover preview (desktop):** if the game data has `previewVideo`, play it muted and looped inside the tile while hovered (load only on hover, stop on leave). If there is no video but there are `screenshots` (up to 4), cross-fade through them every 900ms while hovered. If neither exists, do a slow zoom on the thumbnail (`scale 1 → 1.12` over 3s) plus the title slide-up. Off with `prefers-reduced-motion`.
- **Search panel (Poki layout):** slides in from the left (240ms), width 440px (full width on phones), height 100vh, background = the page gradient (not white), page behind dimmed with `rgba(14,36,64,.45)`. Inside, top to bottom: white pill search input (52px, our icon on the left, magnifier on the right, placeholder "What do you want to play?"); a round 44px white close button with a left chevron sitting just outside the panel's right edge; one horizontally scrolling row of category chips (white pills, **UPPERCASE** 12px 800, letter-spacing .04em); "Recently played" heading + tiles (hidden if empty, with the played badge); "Popular this week" heading + a 6-per-row grid of S tiles (12 games). While typing, results replace the two lists (same 6-per-row grid). Escape, close button or a click on the dimmed page closes it.
- **All categories page and category tiles:** title tile "All Categories" is 2×1 cells. Every category tile is **2×1 cells**: white, radius 16, image on the left (square, 72% of the tile height, radius 12) and the name on the right in **UPPERCASE** 13px 800. The image is the thumbnail of that category's most popular published game (no emoji; the `emoji` field stays only as a fallback when the category has no game image).
- **Player loading:** while the iframe loads, the dark player shows three white dots pulsing left to right (our own simple loader).
- **Ad labels:** reserved ad blocks show the word "ADVERTISEMENT" in 10px, letter-spacing .12em, `--c-ink-2`, under the block (vertical along the right edge for the wide strip under the player).

### V2.9 Player profile panel (Poki-like, **no login** in MVP)
- Nav box/bar gets a **profile icon** (smiley in a circle, our own drawing). It opens a panel that slides in from the left like the search panel (same size, gradient background, round close button outside the edge).
- Top card (white at 70% opacity, radius 20): a large smiley avatar (our own simple SVG), the title "Your games", the line "Saved on this device", and two stat pills: games played (controller icon + number) and time played (clock icon + "32m" / "2h 5m").
- Below: "Ready for another round?" heading and a row of L tiles (2×2) of recently played games, each with the played badge and a small white pill "Played today" / "Played yesterday" / "Played 3 days ago" (clock icon), with a round next-arrow button to scroll the row. Then "Your favourites" as S tiles. Empty state: "Play a game and it will show up here."
- Data lives in localStorage only (`storage.ts`): per game `{slug, firstPlayed, lastPlayed, plays, seconds}`. Time played = seconds the game page is visible (`visibilitychange`) after Play/auto-load, counted in 5-second steps, capped at 4 hours per session.
- A small text link at the bottom: "Clear my history" (asks to confirm inside the panel, not with a browser dialog).
- Sign-in with Google/Apple and cloud sync are **Phase 2** (needs a server and privacy work). Do not build them now.
