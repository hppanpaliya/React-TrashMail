const crypto = require("crypto");
const net = require("net");
const dns = require("dns");
// undici's own fetch + Agent are used (rather than the global fetch) so the
// DNS-pinning dispatcher below is guaranteed compatible with the client.
const { fetch: undiciFetch, Agent } = require("undici");
const { getDB } = require("../db");
const config = require("../config");

// Delays (ms) between delivery attempts. MAX_ATTEMPTS total attempts are made,
// so only the first MAX_ATTEMPTS - 1 entries are used. Jitter is added at
// runtime. Tests inject their own (zeroed) schedule.
const DEFAULT_BACKOFF_MS = [1000, 5000, 25000, 60000, 120000];
const MAX_ATTEMPTS = 5;
const MAX_BACKOFF_MS = 60000;
// Auto-disable a webhook after this many consecutive failed deliveries so a
// dead endpoint cannot generate retry storms forever.
const FAILURE_DISABLE_THRESHOLD = 15;
const REQUEST_TIMEOUT_MS = 10000;
const MAX_URL_LENGTH = 2048;
const MAX_TEXT_BYTES = 10 * 1024; // ~10KB of body text in the payload

function getWebhooksCollection() {
  return getDB().collection("webhooks");
}

// ---------------------------------------------------------------------------
// SSRF protection
// ---------------------------------------------------------------------------

function isPrivateIPv4(ip) {
  const octets = ip.split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => Number.isNaN(o))) return true; // fail closed
  const [a, b, c] = octets;
  if (a === 0) return true; // 0.0.0.0/8 ("this" network, incl. 0.0.0.0)
  if (a === 127) return true; // loopback 127.0.0.0/8
  if (a === 10) return true; // private 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // private 172.16.0.0/12
  if (a === 192 && b === 168) return true; // private 192.168.0.0/16
  if (a === 169 && b === 254) return true; // link-local 169.254.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking 198.18.0.0/15
  if (a === 192 && b === 0 && c === 0) return true; // IETF protocol 192.0.0.0/24
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1 192.0.2.0/24
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2 198.51.100.0/24
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3 203.0.113.0/24
  if (a >= 224) return true; // multicast 224/4, reserved 240/4, broadcast
  return false;
}

function isPrivateIPv6(ip) {
  const s = ip.toLowerCase();
  if (s === "::" || s === "::1") return true; // unspecified / loopback
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) - check the embedded IPv4 address
  const v4 = s.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4) return isPrivateIPv4(v4[1]);
  // Same, but in the canonical hex form the WHATWG URL parser produces
  // (e.g. ::ffff:a00:1 for ::ffff:10.0.0.1)
  const hexV4 = s.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexV4) {
    const hi = parseInt(hexV4[1], 16);
    const lo = parseInt(hexV4[2], 16);
    return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  // IPv4-compatible ::a.b.c.d (deprecated ::/96) - check the embedded IPv4
  const compatV4 = s.match(/^::(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (compatV4) return isPrivateIPv4(compatV4[1]);
  const firstGroup = parseInt(s.split(":")[0] || "0", 16);
  if (firstGroup >= 0xfe80 && firstGroup <= 0xfebf) return true; // link-local fe80::/10
  if (firstGroup >= 0xfc00 && firstGroup <= 0xfdff) return true; // unique-local fc00::/7
  if (firstGroup >= 0xff00) return true; // multicast ff00::/8
  // 6to4 2002:AABB:CCDD:: embeds IPv4 A.B.C.D
  const sixToFour = s.match(/^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})/);
  if (sixToFour) {
    const hi = parseInt(sixToFour[1], 16);
    const lo = parseInt(sixToFour[2], 16);
    return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  // NAT64 64:ff9b::/96 - block outright (may embed arbitrary IPv4)
  if (s.startsWith("64:ff9b:")) return true;
  return false;
}

function isPrivateAddress(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // not an IP at all - fail closed
}

function normalizeHostname(hostname) {
  // URL keeps brackets around IPv6 literals; also strip a trailing FQDN dot.
  return hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "")
    .toLowerCase();
}

function isForbiddenHostname(hostname) {
  const host = normalizeHostname(hostname);
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (net.isIP(host) && isPrivateAddress(host)) return true;
  return false;
}

/**
 * Validate a webhook URL at save-time. Throws an Error with a user-facing
 * message when the URL is not acceptable. Returns the parsed URL when valid.
 * Private/loopback destinations are rejected unless WEBHOOK_ALLOW_PRIVATE is
 * enabled (self-hosted escape hatch).
 */
function validateWebhookUrl(rawUrl, { allowPrivate = config.webhookAllowPrivate } = {}) {
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    throw new Error("Webhook URL is required");
  }
  if (rawUrl.length > MAX_URL_LENGTH) {
    throw new Error(`Webhook URL must be at most ${MAX_URL_LENGTH} characters`);
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch (err) {
    throw new Error("Webhook URL is not a valid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Webhook URL must use http or https");
  }

  if (!allowPrivate && isForbiddenHostname(url.hostname)) {
    throw new Error("Webhook URL must not point to a private, loopback or link-local address");
  }

  return url;
}

/**
 * Delivery-time SSRF check: resolve the hostname via DNS and reject when any
 * resolved address is private/loopback/link-local. This catches DNS records
 * that point public-looking names at internal addresses (and DNS rebinding at
 * save-time). Throws when the destination is not allowed.
 */
async function assertSafeDestination(hostname, { allowPrivate = config.webhookAllowPrivate, lookupImpl = dns.promises.lookup } = {}) {
  if (allowPrivate) return null; // no pinning needed

  const host = normalizeHostname(hostname);
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("Refusing to deliver webhook to localhost");
  }

  if (net.isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new Error(`Refusing to deliver webhook to private address ${host}`);
    }
    return [host];
  }

  const results = await lookupImpl(host, { all: true, verbatim: true });
  const addresses = Array.isArray(results) ? results : [results];
  if (addresses.length === 0) {
    throw new Error(`Could not resolve webhook host ${host}`);
  }
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error(`Refusing to deliver webhook: ${host} resolves to private address ${address}`);
    }
  }
  // Return the validated addresses so the connection can be pinned to them
  // (closing the check-vs-connect DNS rebinding window).
  return addresses.map((r) => r.address);
}

/**
 * undici Agent whose connector resolves to a pre-validated address only, so
 * the socket target is exactly what assertSafeDestination approved. The
 * returned address is re-checked, failing closed even if state changed.
 * TLS SNI/cert validation still uses the original hostname (undici keeps
 * servername from the URL).
 */
function pinnedDispatcher(addresses, timeoutMs) {
  return new Agent({
    connectTimeout: timeoutMs,
    connect: {
      lookup(hostname, opts, cb) {
        const ip = addresses[0];
        const family = net.isIP(ip);
        if (!family || isPrivateAddress(ip)) {
          return cb(new Error("Refusing webhook delivery: pinned address is not a safe public IP"));
        }
        if (opts && opts.all) {
          return cb(null, [{ address: ip, family }]);
        }
        return cb(null, ip, family);
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Payload + signing
// ---------------------------------------------------------------------------

/**
 * HMAC-SHA256 hex digest of the raw request body, keyed with the webhook
 * secret. Sent as `X-TrashMail-Signature: sha256=<hex>`.
 */
function signBody(secret, body) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function truncateText(text, maxBytes = MAX_TEXT_BYTES) {
  if (typeof text !== "string") return "";
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
  return Buffer.from(text, "utf8").subarray(0, maxBytes).toString("utf8");
}

function buildEmailPayload(emailId, emailDoc) {
  return {
    event: "email.received",
    to: emailId,
    from: (emailDoc.from && emailDoc.from.text) || "",
    subject: emailDoc.subject || "",
    date: emailDoc.date instanceof Date ? emailDoc.date.toISOString() : emailDoc.date || null,
    text: truncateText(emailDoc.text),
    attachments: Array.isArray(emailDoc.attachments) ? emailDoc.attachments.map((a) => a.filename) : [],
  };
}

function buildTestPayload(emailId) {
  return {
    event: "webhook.test",
    to: emailId,
    from: "TrashMail <test@trashmail.local>",
    subject: "TrashMail webhook test",
    date: new Date().toISOString(),
    text: "This is a test delivery from TrashMail. Your webhook is configured correctly.",
    attachments: [],
  };
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    // Never keep the process (or Jest) alive just for a webhook retry.
    if (typeof timer.unref === "function") timer.unref();
  });
}

function withJitter(ms) {
  // Up to +25% random jitter so bursts don't retry in lockstep.
  return Math.round(ms + Math.random() * ms * 0.25);
}

/**
 * One HTTP POST attempt. Throws on any failure (SSRF rejection, network
 * error, timeout, non-2xx response). Redirects are NOT followed - a redirect
 * could otherwise bounce the request to an internal address.
 */
async function attemptDelivery(webhook, payload, { fetchImpl, lookupImpl, timeoutMs = REQUEST_TIMEOUT_MS, allowPrivate } = {}) {
  const url = new URL(webhook.url);
  const addresses = await assertSafeDestination(url.hostname, { allowPrivate, lookupImpl });

  const body = JSON.stringify(payload);
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "TrashMail-Webhook",
    "X-TrashMail-Event": payload.event,
  };
  if (webhook.secret) {
    headers["X-TrashMail-Signature"] = `sha256=${signBody(webhook.secret, body)}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (typeof timer.unref === "function") timer.unref();

  // Pin the connection to the validated address unless a test injected its own
  // fetch (mocks never open sockets, so pinning is meaningless there).
  const dispatcher = !fetchImpl && addresses ? pinnedDispatcher(addresses, timeoutMs) : undefined;
  const doFetch = fetchImpl || undiciFetch;

  try {
    const response = await doFetch(webhook.url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
      redirect: "manual",
      ...(dispatcher ? { dispatcher } : {}),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.status;
  } finally {
    clearTimeout(timer);
    if (dispatcher) {
      dispatcher.close().catch(() => {});
    }
  }
}

/**
 * Attempt delivery up to MAX_ATTEMPTS times with (jittered) exponential
 * backoff. Never throws - resolves with the final outcome:
 *   { ok: true, status, attempts } | { ok: false, error, attempts }
 */
async function deliverWithRetries(webhook, payload, options = {}) {
  const schedule = options.schedule || DEFAULT_BACKOFF_MS;
  const maxAttempts = options.maxAttempts || MAX_ATTEMPTS;

  let lastError = "unknown error";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const status = await attemptDelivery(webhook, payload, options);
      return { ok: true, status, attempts: attempt };
    } catch (err) {
      lastError =
        err && err.name === "AbortError" ? `Request timed out after ${options.timeoutMs || REQUEST_TIMEOUT_MS}ms` : err.message || String(err);
      if (attempt < maxAttempts) {
        let delay = schedule[attempt - 1] != null ? schedule[attempt - 1] : schedule[schedule.length - 1] || 0;
        delay = Math.min(delay, MAX_BACKOFF_MS);
        if (delay > 0) await sleep(withJitter(delay));
      }
    }
  }
  return { ok: false, error: lastError, attempts: maxAttempts };
}

/** Persist the final outcome of a delivery on the webhook document. */
async function recordOutcome(emailId, outcome) {
  if (outcome.ok) {
    await getWebhooksCollection().updateOne(
      { emailId },
      { $set: { lastStatus: "success", lastError: null, lastDeliveredAt: new Date(), consecutiveFailures: 0 } }
    );
    return;
  }
  // mongodb driver v6+: findOneAndUpdate resolves to the document itself.
  const updated = await getWebhooksCollection().findOneAndUpdate(
    { emailId },
    { $set: { lastStatus: "failed", lastError: outcome.error }, $inc: { consecutiveFailures: 1 } },
    { returnDocument: "after" }
  );
  const failures = updated && (updated.consecutiveFailures ?? (updated.value && updated.value.consecutiveFailures));
  if (failures >= FAILURE_DISABLE_THRESHOLD) {
    await getWebhooksCollection().updateOne(
      { emailId },
      { $set: { enabled: false, disabledReason: "auto-disabled after repeated delivery failures" } }
    );
    console.error(`Webhook for ${emailId} auto-disabled after ${failures} consecutive failures`);
  }
}

/**
 * Fire-and-forget entry point called from the email-save path. Looks up the
 * webhook for the inbox, delivers with retries and records the outcome.
 * MUST never throw and never slow down email ingestion - callers do not await
 * it and every error is swallowed (logged only).
 */
async function deliverForEmail(emailId, emailDoc, options = {}) {
  try {
    const webhook = await getWebhooksCollection().findOne({ emailId });
    if (!webhook || !webhook.enabled) return null;

    const payload = buildEmailPayload(emailId, emailDoc);
    const outcome = await deliverWithRetries(webhook, payload, options);
    if (!outcome.ok) {
      // Redact the mailbox address at default log level (mild PII).
      const target = process.env.LOG_LEVEL === "debug" ? emailId : `${String(emailId).slice(0, 3)}…`;
      console.error(`Webhook delivery failed for ${target} after ${outcome.attempts} attempts: ${outcome.error}`);
    }
    await recordOutcome(emailId, outcome);
    return outcome;
  } catch (err) {
    // Absolutely never let webhook problems affect email ingestion.
    console.error("Unexpected webhook delivery error:", err);
    return null;
  }
}

/**
 * Single test delivery (no retries) through the same delivery path.
 * Records the outcome on the webhook document and returns it.
 */
async function sendTestDelivery(webhook, options = {}) {
  let outcome;
  try {
    const payload = buildTestPayload(webhook.emailId);
    const status = await attemptDelivery(webhook, payload, options);
    outcome = { ok: true, status, attempts: 1 };
  } catch (err) {
    const message = err && err.name === "AbortError" ? "Request timed out" : (err && err.message) || String(err);
    outcome = { ok: false, error: message, attempts: 1 };
  }
  try {
    await recordOutcome(webhook.emailId, outcome);
  } catch (err) {
    console.error("Failed to record webhook test outcome:", err);
  }
  return outcome;
}

module.exports = {
  MAX_URL_LENGTH,
  isPrivateAddress,
  validateWebhookUrl,
  assertSafeDestination,
  signBody,
  buildEmailPayload,
  attemptDelivery,
  deliverWithRetries,
  deliverForEmail,
  sendTestDelivery,
  getWebhooksCollection,
};
