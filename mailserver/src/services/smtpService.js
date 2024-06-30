const { SMTPServer } = require("smtp-server");
const { handleIncomingEmail } = require("./emailService");
const { smtpPort } = require("../config");

function createSMTPServer() {
  const server = new SMTPServer({
    authOptional: true,
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
  await server.listen(smtpPort);
  console.log("Mail server listening on port", smtpPort);
  return server;
}

module.exports = { startSMTPServer };
