# Playzoni — design system (v1.0)

Original brand. Bright, friendly, fast. Light theme only in MVP. All values below become CSS variables in `src/styles/tokens.css` and are mapped in the Tailwind config. Components use only these tokens.

## §Brand
- Name: **Playzoni** (always this casing in text; logo is lowercase `playzoni`).
- Tagline: "Play free games instantly."
- Logo: SVG wordmark `playzoni` in Nunito 900, colour `--c-ink`, with the `o` replaced by a filled circle in `--c-primary` containing a white play triangle. Provide `logo.svg` (wordmark) and `icon.svg` (circle + triangle only). Favicons: 32px PNG, 180px apple-touch-icon, 192/512 PNG + `site.webmanifest` (name, short_name, theme_color = `--c-primary`, background_color = `--c-bg`).

## §Colours
| Token | Hex | Use |
|---|---|---|
| `--c-bg` | `#FFF7EE` | Page background (warm cream) |
| `--c-surface` | `#FFFFFF` | Tiles, cards, header |
| `--c-ink` | `#1D1A2F` | Main text, logo |
| `--c-ink-2` | `#5B5670` | Secondary text |
| `--c-line` | `#EDE4D8` | Borders, dividers |
| `--c-primary` | `#FF5A36` | Play button, links hover, active nav, logo dot |
| `--c-primary-ink` | `#FFFFFF` | Text on primary |
| `--c-primary-dark` | `#E24420` | Primary hover/pressed |
| `--c-accent` | `#FFC531` | "New" badge, focus highlights |
| `--c-accent-2` | `#2EC4B6` | "Hot" badge, secondary chips |
| `--c-player-bg` | `#14121F` | Behind the game iframe |
| `--c-focus` | `#1D1A2F` | 3px focus ring (always visible on keyboard focus) |

Contrast: body text on `--c-bg` ≥ 7:1; white on `--c-primary` is used only at ≥ 18px bold (large text) or on icons.

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
- Title: hidden by default; on hover (desktop) and focus, a bottom gradient (`transparent → rgba(29,26,47,.85)`) slides up with the title in white `--t-tile`, 2 lines max, ellipsis. On touch devices the title is not shown on tiles (image + `alt` + `aria-label` only), except in rows where a 1-line title is shown below the tile.
- Hover: `transform: translateY(-3px) scale(1.03)`, shadow `--sh-tile-hover`, 150ms ease-out. Respect `prefers-reduced-motion` (no transform).
- Badges (top-left, pill, `--t-small`): "New" (`--c-accent`, ink text) if addedDate ≤ 14 days; "Hot" (`--c-accent-2`) if in top 20 popularity. Max one badge.
- Whole tile is one `<a href="/game/<slug>">` with `aria-label="{Title}"`.

## §Grid (`GameGrid`)
- Cell size `--cell`: 88px (<480), 100px (480–1279), 112px (≥1280). Gap 10px (<480), 12px (≥480).
- `display:grid; grid-template-columns: repeat(auto-fill, var(--cell)); grid-auto-rows: var(--cell); grid-auto-flow: dense; justify-content: center;`
- Mosaic mode (home, category page 1): pattern repeats every 18 tiles — positions 1 and 10 are L, positions 4, 7, 14 are M, the rest S. Featured games fill L slots first. Below 480px use M instead of L (L would fill the full width).
- Uniform mode (rows, related, lists): all S, or all M where the task says so.
- No horizontal page scroll at any width.

## §Rows (`GameRow`)
Title (`--t-h3`) left, "See all ›" link right. Tiles in one horizontal line, scroll-snap, swipe on touch, hidden scrollbar, arrow buttons on desktop (≥1024) at both ends. Tile size M on desktop, S on mobile, with 1-line title below.

## §Header
Height 56px mobile / 64px ≥768, `--c-surface`, bottom border `--c-line`, sticky top. Left: logo (height 28px). Centre (≥768): search input, pill, 44px tall, max 420px, icon left. Mobile: search icon button (44×44) opening a full-screen search overlay. Right: favourites (heart) icon button 44×44. Below the header bar: category nav — horizontal pill chips (`--r-pill`, 36px tall, `--c-surface`, border `--c-line`, active = `--c-primary` bg + white text), scrolls sideways on mobile, wraps to one centred line on desktop if it fits.

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
