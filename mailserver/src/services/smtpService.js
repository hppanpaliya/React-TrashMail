const { SMTPServer } = require("smtp-server");
const { handleIncomingEmail } = require("./emailService");
const config = require("../config");

/**
 * Decide whether we accept mail for the given recipient address.
 * - If ACCEPT_UNKNOWN_DOMAINS=true, accept everything (explicit opt-out).
 * - If ALLOWED_DOMAINS was never configured, keep the historical behavior of
 *   accepting everything (avoids breaking dev setups).
 * - Otherwise only accept recipients whose domain is in config.allowedDomains.
 */
function isRecipientAllowed(address) {
  if (config.acceptUnknownDomains || !config.allowedDomainsConfigured) {
    return true;
  }
  const domain = (String(address || "").split("@")[1] || "").toLowerCase();
  if (!domain) return false;
  return config.allowedDomains.some((d) => d.toLowerCase() === domain);
}

function createSMTPServer() {
  const server = new SMTPServer({
    authOptional: true,
    size: config.smtpMaxMessageSize,
    onRcptTo(address, session, callback) {
      if (!isRecipientAllowed(address.address)) {
        const error = new Error("Mailbox unavailable: recipient domain not accepted here");
        error.responseCode = 550;
        return callback(error);
      }
      return callback();
    },
    onData(stream, session, callback) {
      handleIncomingEmail(stream, session)
        .then(() => callback())
        .catch((error) => callback(error));
    },
  });

  server.on("error", (error) => {
    console.error("SMTP server error:", error);
  });

  return server;
}

async function startSMTPServer() {
  const server = createSMTPServer();
  await server.listen(config.smtpPort);
  console.log("Mail server listening on port", config.smtpPort);
  return server;
}

module.exports = { startSMTPServer, isRecipientAllowed };
