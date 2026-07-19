const { SMTPServer } = require("smtp-server");
const { handleIncomingEmail } = require("./emailService");
const config = require("../config");

const DEFAULT_MAX_SIZE = 25 * 1024 * 1024;

// The size cap must never be disabled by a bad config value.
function resolveMaxSize() {
  const v = Number(config.smtpMaxMessageSize);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_MAX_SIZE;
}

// The routable domain is the segment after the LAST "@" (quoted local-parts
// may themselves contain "@").
function parseDomain(address) {
  const raw = String(address || "");
  const at = raw.lastIndexOf("@");
  if (at === -1) return "";
  return raw.slice(at + 1).trim().toLowerCase();
}

/**
 * Decide whether we accept mail for the given recipient address.
 * - If ACCEPT_UNKNOWN_DOMAINS=true, accept everything (explicit opt-in).
 * - If ALLOWED_DOMAINS was never configured, reject everything (default-deny;
 *   a startup warning tells operators to configure one or the other).
 * - Otherwise only accept recipients whose domain is in config.allowedDomains.
 */
function isRecipientAllowed(address) {
  if (config.acceptUnknownDomains) return true;

  const domain = parseDomain(address);
  if (!domain) return false;

  if (!config.allowedDomainsConfigured) return false;

  return config.allowedDomains.some((d) => d.toLowerCase() === domain);
}

function createSMTPServer() {
  const maxMessageSize = resolveMaxSize();
  const maxRecipients = config.smtpMaxRecipients || 50;

  const server = new SMTPServer({
    authOptional: true, // inbound MX: mail arrives unauthenticated
    size: maxMessageSize,
    maxClients: config.smtpMaxClients || 50,
    socketTimeout: config.smtpSocketTimeoutMs || 60000,
    onRcptTo(address, session, callback) {
      if (session.envelope.rcptTo.length >= maxRecipients) {
        const error = new Error("Too many recipients");
        error.responseCode = 452;
        return callback(error);
      }
      if (!isRecipientAllowed(address.address)) {
        const error = new Error("Mailbox unavailable: recipient domain not accepted here");
        error.responseCode = 550;
        return callback(error);
      }
      return callback();
    },
    onData(stream, session, callback) {
      // Independent byte counter: don't trust clients to honor the advertised
      // SIZE. Overflowing streams are destroyed and rejected with 552.
      let bytes = 0;
      stream.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > maxMessageSize) {
          stream.destroy();
        }
      });

      const sizeError = () => {
        const e = new Error("Message exceeds fixed maximum message size");
        e.responseCode = 552;
        return e;
      };

      handleIncomingEmail(stream, session)
        .then(() => {
          if (stream.sizeExceeded || bytes > maxMessageSize) {
            return callback(sizeError());
          }
          return callback();
        })
        .catch((error) => {
          // Full detail server-side; only a fixed generic line to the client so
          // internal error text can never leak into the SMTP response.
          console.error("SMTP onData error:", error);
          if (stream.sizeExceeded || bytes > maxMessageSize) {
            return callback(sizeError());
          }
          const generic = new Error("Message rejected");
          generic.responseCode = 451;
          return callback(generic);
        });
    },
  });

  server.on("error", (error) => {
    console.error("SMTP server error:", error);
  });

  return server;
}

async function startSMTPServer() {
  if (!config.allowedDomainsConfigured && !config.acceptUnknownDomains) {
    console.warn(
      "WARNING: No ALLOWED_DOMAINS configured and ACCEPT_UNKNOWN_DOMAINS is false; " +
        "all inbound mail will be rejected. Set one to receive mail."
    );
  }
  const server = createSMTPServer();
  await server.listen(config.smtpPort);
  console.log("Mail server listening on port", config.smtpPort);
  return server;
}

module.exports = { startSMTPServer, isRecipientAllowed };
