// Forgiving game search for the search panel (DESIGN §V2.13). Young players misspell a lot, so a query should still
// find what they mean: typos (one or two letters wrong, missing, extra or swapped), sounds-like spellings
// ("fone" → "phone", "kar" → "car"), letters typed in order with gaps ("mtch" → "match"), several words in any order,
// and category words ("cars", "shoot", "2 player", "football"). Results are scored, then sorted by score and by the
// index's own popularity order. Pure functions, no DOM: the panel decides what to show when nothing matches.

import type { IndexGame } from './render-tiles';

export interface ScoredGame {
  game: IndexGame;
  score: number;
}

// Words a child might type for a category, mapped to our category slugs.
const CATEGORY_WORDS: Record<string, string[]> = {
  car: ['car-games', 'driving-games', 'racing-games', 'parking-games'],
  cars: ['car-games', 'driving-games', 'racing-games'],
  drive: ['driving-games', 'car-games'],
  driving: ['driving-games', 'car-games'],
  race: ['racing-games', 'car-games'],
  racing: ['racing-games', 'car-games'],
  truck: ['car-games', 'driving-games'],
  bike: ['bike-games', 'racing-games'],
  moto: ['bike-games', 'racing-games'],
  park: ['parking-games'],
  parking: ['parking-games'],
  shoot: ['shooting-games'],
  shooting: ['shooting-games'],
  gun: ['shooting-games'],
  guns: ['shooting-games'],
  sniper: ['shooting-games'],
  war: ['shooting-games', 'action-games', 'strategy-games'],
  fight: ['fighting-games', 'action-games'],
  fighting: ['fighting-games', 'action-games'],
  action: ['action-games'],
  puzzle: ['puzzle-games'],
  puzzles: ['puzzle-games'],
  brain: ['puzzle-games'],
  sort: ['puzzle-games'],
  match: ['match-3-games', 'puzzle-games'],
  football: ['soccer-games', 'sports-games'],
  soccer: ['soccer-games', 'sports-games'],
  basketball: ['basketball-games', 'sports-games'],
  ball: ['sports-games', 'arcade-games'],
  sport: ['sports-games'],
  sports: ['sports-games'],
  friend: ['two-player-games', 'multiplayer-games'],
  friends: ['two-player-games', 'multiplayer-games'],
  two: ['two-player-games'],
  '2': ['two-player-games'],
  player: ['two-player-games', 'multiplayer-games'],
  multiplayer: ['multiplayer-games', 'io-games'],
  online: ['multiplayer-games', 'io-games'],
  io: ['io-games'],
  snake: ['io-games'],
  dress: ['dress-up-games'],
  makeup: ['dress-up-games'],
  fashion: ['dress-up-games'],
  cook: ['cooking-games'],
  cooking: ['cooking-games'],
  food: ['cooking-games'],
  zombie: ['zombie-games'],
  zombies: ['zombie-games'],
  scary: ['horror-games'],
  horror: ['horror-games'],
  chess: ['chess-games', 'board-games'],
  board: ['board-games'],
  cards: ['card-games', 'solitaire-games'],
  card: ['card-games', 'solitaire-games'],
  solitaire: ['solitaire-games'],
  mahjong: ['mahjong-games'],
  bubble: ['bubble-shooter-games'],
  word: ['word-games'],
  words: ['word-games'],
  obby: ['obby-games', 'platform-games'],
  jump: ['platform-games', 'skill-games'],
  run: ['skill-games', 'arcade-games'],
  runner: ['skill-games', 'arcade-games'],
  stickman: ['stickman-games'],
  idle: ['idle-games', 'clicker-games'],
  clicker: ['clicker-games'],
  click: ['clicker-games'],
  adventure: ['adventure-games'],
  strategy: ['strategy-games'],
  simulator: ['simulation-games'],
  simulation: ['simulation-games'],
  arcade: ['arcade-games'],
  easy: ['arcade-games', 'skill-games'],
};
const CATEGORY_KEYS = Object.keys(CATEGORY_WORDS);

// Lower case, accents removed, only letters, digits and spaces.
export function clean(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// A rough "sounds like" form: common spelling swaps children make, and doubled letters folded.
export function soundsLike(word: string): string {
  return word
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/q/g, 'k')
    .replace(/c(?=[aou]|$)/g, 'k')
    .replace(/c/g, 's')
    .replace(/z/g, 's')
    .replace(/x/g, 'ks')
    .replace(/wh/g, 'w')
    .replace(/kn/g, 'n')
    .replace(/y/g, 'i')
    .replace(/ee|ea/g, 'i')
    .replace(/oo|ou/g, 'u')
    .replace(/(.)\1+/g, '$1');
}

// Edit distance with swaps (Damerau–Levenshtein, optimal string alignment), stopping early above `max`.
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    let best = Infinity;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
  }
  return d[a.length][b.length];
}

// Best edit distance between `q` and any part of `text` (Sellers' approximate substring search): finds
// "tiktaktoe" inside "chilltictactoe" even with the spaces gone.
export function substringDistance(q: string, text: string): number {
  let prev = new Array<number>(text.length + 1).fill(0);
  for (let i = 1; i <= q.length; i++) {
    const cur = new Array<number>(text.length + 1);
    cur[0] = i;
    for (let j = 1; j <= text.length; j++) {
      const cost = q[i - 1] === text[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return Math.min(...prev);
}

// True when every letter of `q` appears in `word` in the same order ("mtch" in "match").
function inOrder(q: string, word: string): boolean {
  let i = 0;
  for (const ch of word) if (ch === q[i]) i++;
  return i === q.length;
}

// How many typos a word of this length may have.
const allowed = (len: number): number => (len <= 2 ? 0 : len <= 4 ? 1 : len <= 7 ? 2 : 3);

// Typos allowed when matching anywhere inside a title: stricter than word matching for short and medium queries, so
// "shoting" finds "shooting" but not "sorting".
const looseTypos = (len: number): number => (len >= 8 ? allowed(len) : allowed(len) - 1);

// Score of one typed word against one title word (0 = no match).
function wordScore(q: string, w: string): number {
  if (w === q) return 10;
  if (w.startsWith(q)) return q.length >= 2 ? 8 : 3;
  if (q.length >= 3 && w.includes(q)) return 6;
  const prefix = w.slice(0, q.length + 1);
  const typos = Math.min(editDistance(q, w, 3), editDistance(q, prefix, 3));
  // A typo in a long word is strong evidence ("subwey" → "subway"), so the cost per typo shrinks with length.
  if (typos <= allowed(q.length)) return Math.max(4, 8 - (typos * typos * 3) / q.length);
  const sq = soundsLike(q);
  const sw = soundsLike(w);
  if (sq.length >= 2 && sw === sq) return 8;
  if (sq.length >= 3 && sw.startsWith(sq)) return 5;
  if (sq.length >= 3 && editDistance(sq, sw.slice(0, sq.length + 1), 2) <= allowed(sq.length) - 1) return 4;
  if (q.length >= 3 && inOrder(q, w)) return 3;
  return 0;
}

// Category slugs a typed word points to (also with typos: "shoting", "karz").
function categoriesFor(q: string): string[] {
  if (CATEGORY_WORDS[q]) return CATEGORY_WORDS[q];
  if (q.length < 3) return [];
  for (const key of CATEGORY_KEYS) {
    if (key.length >= 3 && (editDistance(q, key, 2) <= allowed(key.length) - (key.length <= 4 ? 0 : 1) || soundsLike(q) === soundsLike(key))) {
      return CATEGORY_WORDS[key];
    }
  }
  return [];
}

// Scores every game against the query. Games with a score above zero are returned, best first; equal scores keep
// the index order (most popular first).
export function fuzzySearch(index: IndexGame[], query: string): ScoredGame[] {
  const q = clean(query);
  if (q === '') return [];
  const qWords = q.split(' ').filter(Boolean);
  const qJoined = q.replace(/ /g, '');
  const cats = qWords.map(categoriesFor);

  const scored: ScoredGame[] = [];
  index.forEach((game, order) => {
    const title = clean(game.title);
    const words = title.split(' ').filter(Boolean);
    const joined = title.replace(/ /g, '');
    let score = 0;

    // The whole typed text inside the title (spaces ignored) is the strongest signal.
    if (title.startsWith(q) || joined.startsWith(qJoined)) score += 40;
    else if (title.includes(q) || (qJoined.length >= 3 && joined.includes(qJoined))) score += 30;
    else if (qJoined.length >= 4 && editDistance(qJoined, joined.slice(0, qJoined.length + 1), 3) <= allowed(qJoined.length)) score += 22;
    else if (qJoined.length >= 5 && substringDistance(qJoined, joined) <= looseTypos(qJoined.length)) score += 20;
    else if (qJoined.length >= 5 && substringDistance(soundsLike(qJoined), soundsLike(joined)) <= looseTypos(qJoined.length) - 1) score += 16;

    // Each typed word: its best match among the title's words, or a matching category.
    let matchedWords = 0;
    qWords.forEach((qw, i) => {
      let best = 0;
      for (const w of words) best = Math.max(best, wordScore(qw, w));
      // A word that names a category ("shoting" → shooting) beats a loose typo match on some other title word, but
      // not an exact or prefix match on the title itself.
      if (best < 7 && cats[i].length > 0 && game.cats?.some((c) => cats[i].includes(c))) {
        const primary = game.cats?.[0] !== undefined && cats[i].includes(game.cats[0]);
        best = Math.max(best, primary ? 6.9 : 6.7);
      }
      if (best > 0) matchedWords++;
      // The first word usually names the game ("subwey surf"), so it counts a little more.
      score += i === 0 && qWords.length > 1 ? best * 1.3 : best;
    });
    // Every typed word matched: a clear bonus; some words missing: a small penalty.
    if (qWords.length > 1) score += matchedWords === qWords.length ? 8 : -1 * (qWords.length - matchedWords);
    if (matchedWords === 0 && score < 16) return;

    // Tie-break: a little extra for popular games (index order).
    scored.push({ game, score: score + Math.max(0, 1 - order / 2000) });
  });

  return scored.sort((a, b) => b.score - a.score);
}
