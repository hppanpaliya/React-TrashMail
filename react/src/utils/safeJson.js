/**
 * Parse a JSON string without throwing.
 * Returns `fallback` (default null) on malformed input.
 */
export function safeParseJSON(input, fallback = null) {
  if (typeof input !== "string") return fallback;
  try {
    return JSON.parse(input);
  } catch {
    if (import.meta.env?.DEV) {
      console.warn("safeParseJSON: discarded malformed payload", input);
    }
    return fallback;
  }
}
