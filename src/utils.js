// ── Shared helpers ──────────────────────────────────────────────────────────

// Fisher-Yates — unbiased, unlike sort(() => Math.random() - 0.5)
export function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Strip accents, articles, punctuation and case so typed guesses can be compared.
// "L'Éléphant !" → "ELEPHANT"
export function normalize(str) {
  return (str ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(LE|LA|LES|UN|UNE|DES|DU|DE|L)\s+/, '');
}

// Damerau-Levenshtein (optimal string alignment) — an adjacent transposition
// costs 1, not 2, because "canrad" for "canard" is the typo people actually make.
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// Exactly two adjacent characters swapped — "CANRAD" for "CANARD".
function isTransposition(a, b) {
  if (a.length !== b.length) return false;
  const diff = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
  return diff.length === 2
    && diff[1] === diff[0] + 1
    && a[diff[0]] === b[diff[1]]
    && a[diff[1]] === b[diff[0]];
}

// A guess counts if it normalizes to the answer, is a transposition of it, or
// is one edit away on a long word.
//
// The length gate matters: at distance 1 with no gate, "canari" would score for
// "canard". Transpositions are exempt because swapping two letters almost never
// lands on a different real word.
export function isMatch(guess, answer) {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g || !a) return false;
  if (g === a) return true;
  if (a.length >= 4 && isTransposition(g, a)) return true;
  return a.length > 6 && levenshtein(g, a) <= 1;
}

// Does this word match anything in a list? Deliberately more forgiving than
// isMatch, with no length gate: the Rimes Rapides pool is model-generated and
// comes back misspelled often enough ("CIGNE" for CYGNE) that a correctly
// spelled word would otherwise be rejected and cost someone the round. A
// near-miss of a rhyme almost certainly rhymes too, so the loose side is safe.
export function matchesAny(word, pool, maxDistance = 1) {
  const w = normalize(word);
  if (!w) return false;
  return (pool ?? []).some(entry => {
    const e = normalize(entry);
    return !!e && (e === w || levenshtein(w, e) <= maxDistance);
  });
}

// Votes are settled once everyone has voted, the deadline has passed with at
// least one vote in, or no outstanding vote could change the leader.
export function votesSettled(votes, voterIds, deadline) {
  const cast = Object.keys(votes ?? {}).length;
  if (cast >= voterIds.length) return true;
  if (cast > 0 && deadline && Date.now() >= deadline) return true;
  if (cast === 0) return false;

  const tally = {};
  Object.values(votes).forEach(v => { tally[v] = (tally[v] ?? 0) + 1; });
  const counts = Object.values(tally).sort((a, b) => b - a);
  const remaining = voterIds.length - cast;
  return counts[0] > (counts[1] ?? 0) + remaining;
}

export function tallyVotes(votes) {
  const tally = {};
  Object.values(votes ?? {}).forEach(v => { tally[v] = (tally[v] ?? 0) + 1; });
  return tally;
}

export function topVote(votes) {
  const entries = Object.entries(tallyVotes(votes)).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? null;
}
