# Playzoni accounts (sign-in + cloud sync) — spec v1, 11 Nov 2026

Owner asked for Poki-style accounts on MongoDB. The website stays static (Astro on Cloudflare Pages). Accounts run as a **separate small API** so the game pages stay fast and keep working if the API is down.

## Stack (approved)
| Part | Choice |
|---|---|
| API runtime | Node.js 22 LTS + Fastify, TypeScript strict, in `api/` in this repo |
| Auth library | Better Auth (MongoDB adapter): Google, Microsoft, passkeys. Apple later (needs a paid Apple developer account) |
| Database | MongoDB Atlas, region AWS Frankfurt (eu-central-1). Start on the free M0 cluster; move to M10 when traffic needs it |
| Hosting | DigitalOcean App Platform (owner's usual), `api.playzoni.com` |
| Secrets | DigitalOcean app environment variables only. Never in git, logs or chat |

## Who can make an account
- Everyone can play every game as a **guest** — no account needed, ever (no sign-up walls).
- Account sign-up asks one checkbox: "I am 18 or older". Reason: India's DPDP Act treats under-18s as children and needs verifiable parental consent; we do not build that in v1. **Owner must confirm this with a lawyer before launch of accounts.**

## Data (MongoDB collections)
- Better Auth's own: `user`, `account`, `session`, `verification`, `passkey`.
- `profiles` `{ userId, displayName, avatar (one of 12 built-in avatars), createdAt }`
- `history` `{ userId, slug, firstPlayed, lastPlayed, plays, seconds }` — unique on (userId, slug)
- `favourites` `{ userId, slug, addedAt }` — unique on (userId, slug)
- `votes` `{ userId, slug, value: 1 | -1, at }` — unique on (userId, slug)
- `gameStats` `{ slug, likes, dislikes, plays, updatedAt }` — counters updated from votes/history; this is what lets pages show **real** like counts.
No IP addresses, no device fingerprints, no birthdays stored.

## API
| Method | Path | What |
|---|---|---|
| * | `/auth/*` | Better Auth routes (sign-in, callback, sign-out, passkeys) |
| GET | `/me` | profile + stats (games played, time played) |
| PATCH | `/me` | display name, avatar |
| POST | `/me/merge` | first sign-in: upload the guest data from localStorage (history, favourites, votes) and merge |
| GET/PUT | `/me/history`, `/me/favourites` | sync |
| POST | `/votes` | like/dislike (one per user per game) |
| GET | `/stats/:slug` | public counts, cached 5 minutes |
| GET | `/me/export` | download all my data as JSON |
| DELETE | `/me` | delete account and all its data immediately |
Rules: CORS only `https://playzoni.com`; session cookie `Secure; HttpOnly; SameSite=Lax; Domain=.playzoni.com`; rate limit 60 requests/minute per session; request bodies ≤ 32 KB; no personal data in logs.

## Website side
- Profile panel (DESIGN §V2.9) gets a "Save your progress" card when signed out: buttons "Continue with Google", "Continue with Microsoft", "Use a passkey", plus the 18+ checkbox and links to Privacy and Terms. Shown only inside the panel — never as a popup.
- Signed in: panel shows the synced stats, history and favourites on every device; like counts on game pages come from `/stats/:slug`.
- If the API is unreachable, everything falls back to local storage silently.

## Owner steps (Claude cannot create accounts)
1. Create a MongoDB Atlas account and a free M0 cluster in Frankfurt. Make a database user for the API. Allow access from DigitalOcean.
2. Create Google and Microsoft sign-in apps (OAuth client IDs) with the callback URLs the build chat gives you.
3. Create a DigitalOcean App Platform app from this repo's `api/` folder.
4. Put the secrets (Mongo connection string, OAuth client secrets, auth secret) into the DigitalOcean app settings — never into chat or git.
