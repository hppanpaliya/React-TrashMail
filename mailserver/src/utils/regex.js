// Escape regex metacharacters in user-supplied strings before using them in
// a MongoDB $regex query (prevents ReDoS / unintended pattern matching).
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { escapeRegex };
