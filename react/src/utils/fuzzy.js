// Tiny fuzzy matcher for the command palette: case-insensitive subsequence
// match with bonuses for word starts and consecutive runs. Returns a score
// (higher is better) or -1 when the query is not a subsequence of the text.
export const fuzzyScore = (query, text) => {
  if (!query) return 0;
  if (typeof text !== "string") return -1;

  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let score = 0;
  let tIndex = 0;
  let lastMatch = -2;

  for (let qIndex = 0; qIndex < q.length; qIndex++) {
    const char = q[qIndex];
    if (char === " ") continue;

    const found = t.indexOf(char, tIndex);
    if (found === -1) return -1;

    const atWordStart = found === 0 || t[found - 1] === " " || t[found - 1] === "@" || t[found - 1] === ".";
    if (atWordStart) score += 8;
    if (found === lastMatch + 1) score += 5;
    score -= Math.min(found - tIndex, 10); // gap penalty, capped

    lastMatch = found;
    tIndex = found + 1;
  }

  return score;
};
