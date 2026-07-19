// Route builders that percent-encode the address segment. Email localparts can
// contain URL-significant characters (#, ?, +, %); the reader side decodes with
// decodeURIComponent, so encoding here keeps the round-trip lossless.
export const inboxPath = (address) => `/inbox/${encodeURIComponent(address)}`;
export const watchPath = (address) => `/watch/${encodeURIComponent(address)}`;
