// Extract a likely one-time code (4-8 standalone digits) from email text.
// Prefers codes near OTP-ish keywords; falls back to the first standalone
// digit run that doesn't look like part of a date/phone/amount.

const KEYWORD_RE = /(code|otp|pin|passcode|password|verification|verify|2fa|token|confirm)/i;
// Standalone digit run: not adjacent to another digit and not part of a
// decimal/phone group (digit-separator-digit). Sentence punctuation after
// a code ("is 482913.") must still match. Lookbehind is avoided (it is a
// load-time SyntaxError on Safari < 16.4); the left-boundary rules are
// enforced in hasValidPrefix instead.
const CODE_RE = /(\d{4,8})(?!\d)(?![.,-]\d)/g;

// Reproduces the former (?<!\d)(?<!\d[.,-]) lookbehinds in plain JS.
const hasValidPrefix = (text, index) => {
  const prev = text[index - 1];
  if (prev === undefined) return true;
  if (/\d/.test(prev)) return false;
  if (/[.,-]/.test(prev) && /\d/.test(text[index - 2] || "")) return false;
  return true;
};

// options.requireKeyword: only return codes with an OTP-ish keyword nearby —
// use for list previews where a bare number ("Receipt #10482") would be a
// false positive.
export const extractOtp = (texts, options = {}) => {
  const candidates = [];

  for (const text of Array.isArray(texts) ? texts : [texts]) {
    if (!text || typeof text !== "string") continue;

    for (const match of text.matchAll(CODE_RE)) {
      const code = match[1];
      const start = match.index;
      if (!hasValidPrefix(text, start)) continue;
      const context = text.slice(Math.max(0, start - 48), start + code.length + 24);
      const nearKeyword = KEYWORD_RE.test(context);
      // Skip obvious years in date-like contexts unless keyword-adjacent.
      const looksLikeYear = /^(19|20)\d{2}$/.test(code) && !nearKeyword;
      if (looksLikeYear) continue;
      candidates.push({ code, nearKeyword });
    }
  }

  const keyworded = candidates.find((candidate) => candidate.nearKeyword);
  if (keyworded) return keyworded.code;
  if (options.requireKeyword) return null;
  return candidates.length > 0 ? candidates[0].code : null;
};
