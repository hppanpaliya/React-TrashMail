import { fetchEventSource } from "@microsoft/fetch-event-source";
import { env } from "./env";
import { safeParseJSON } from "./utils/safeJson";

// Opens an authenticated SSE stream using the x-auth-token HEADER — the token
// must never appear in the URL, where it would leak into access logs, browser
// history and Referer headers. onData receives already-parsed JSON; malformed
// frames are dropped instead of crashing the handler.
// Returns a close function for effect cleanup.
export function openSSE(path, { onData, onError, retryDelayMs = 5000 } = {}) {
  const controller = new AbortController();
  const token = localStorage.getItem("token");

  fetchEventSource(`${env.REACT_APP_API_URL}${path}`, {
    signal: controller.signal,
    headers: token ? { "x-auth-token": token } : {},
    openWhenHidden: true, // keep the stream alive on tab blur, like EventSource
    async onopen(response) {
      // Auth failures must stop, not hot-loop the retry.
      if (response.status === 401 || response.status === 403) {
        throw new Error(`SSE unauthorized (${response.status})`);
      }
    },
    onmessage(ev) {
      const data = safeParseJSON(ev.data);
      if (data === null || typeof data !== "object") return;
      onData?.(data);
    },
    onerror(err) {
      if (err && /unauthorized/i.test(String(err.message))) {
        throw err; // fatal: abort the stream
      }
      onError?.(err);
      return retryDelayMs; // transient: retry after delay
    },
  }).catch(() => {
    // Fatal errors (including aborts) end here; cleanup owns the lifecycle.
  });

  return () => controller.abort();
}
