/* Landit content rules, shared by tools/build-data.mjs and tools/check-content.mjs.

   One list, so the generator and the checker can never disagree.

   Lines that spell out a banned word on purpose carry the marker
   "check-content: allow-line". The checker only honours that marker inside
   the tools folder, never inside a design folder. */

/* Banned whole words, matched case-insensitively. */
export const BANNED_WORDS = [
  'win', 'wins', 'won', 'winning', 'prize', 'play', 'playing', 'quest', 'level', 'levels', // check-content: allow-line
  'pot', 'stars', 'score', 'scores', 'reward', 'rewards', 'unlock', 'unlocks', // check-content: allow-line
  'seamless', 'seamlessly', 'leverage', 'revolutionary', 'game-changing', 'owed', // check-content: allow-line
  'Landed', 'Kasdena', 'Russia', 'Russian', // check-content: allow-line
];

/* Banned phrases (matched case-insensitively, spaces flexible). */
export const BANNED_PHRASES = ['Tier 4']; // check-content: allow-line

/* Official names that contain a banned word but are not gamification.
   "Level 3" and "A-level" are UK qualification names, so they may appear
   in catalog text about courses. Nothing else is allowed. */
export const ALLOWED_PATTERNS = [
  /\bA-levels?\b/gi,          // the school qualification
  /\blevels? \d+\b/gi,        // "Level 3", "level 3 to 6": qualification names
];

/* Words that only raise a warning: reading documents from photos or files
   was removed from the product. */
export const WARN_WORDS = ['upload', 'scan', 'scanning']; // check-content: allow-line

/* The two dash characters Landit never uses, written as escapes so this
   file does not contain them. */
export const DASHES = /[\u2013\u2014]/g;

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Regexp for one whole word, case-insensitive. Hyphenated words work too. */
export function wordRe(word) {
  return new RegExp('(?<![A-Za-z0-9_-])' + escapeRe(word) + '(?![A-Za-z0-9_-])', 'gi');
}

/** Regexp for a phrase with flexible spaces, case-insensitive. */
export function phraseRe(phrase) {
  return new RegExp('(?<![A-Za-z0-9])' + phrase.split(/\s+/).map(escapeRe).join('\\s+') + '(?![A-Za-z0-9])', 'gi');
}

/** Blank out the allowed official names so they are not reported. */
export function maskAllowed(text) {
  let out = text;
  for (const re of ALLOWED_PATTERNS) out = out.replace(re, m => ' '.repeat(m.length));
  return out;
}

/** Every banned word or phrase found in a piece of text: [{term, index}]. */
export function findBanned(text) {
  const masked = maskAllowed(text);
  const hits = [];
  for (const w of BANNED_WORDS) for (const m of masked.matchAll(wordRe(w))) hits.push({ term: w, index: m.index });
  for (const p of BANNED_PHRASES) for (const m of masked.matchAll(phraseRe(p))) hits.push({ term: p, index: m.index });
  return hits.sort((a, b) => a.index - b.index);
}

/** Warning words found in a piece of text: [{term, index}]. */
export function findWarnWords(text) {
  const hits = [];
  for (const w of WARN_WORDS) for (const m of text.matchAll(wordRe(w))) hits.push({ term: w, index: m.index });
  return hits.sort((a, b) => a.index - b.index);
}
