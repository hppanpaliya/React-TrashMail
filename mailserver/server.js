const { SMTPServer } = require("smtp-server");
const { handleIncomingEmail, getOldEmails, deleteEmailAndAttachments } = require("./src/services/emailService");
const { smtpPort } = require("./src/config");
const { connectMongoDB, closeMongoDB } = require("./src/db");
const cron = require("node-cron");
const createApp = require("./src/app");

async function startSMTPServer() {
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

  await server.listen(smtpPort);
  console.log("Mail server listening on port", smtpPort);
}

async function startWebServer() {
  const app = createApp();
  const port = 4000;

  const server = app.listen(port, () => {
    console.log("Web server listening on port", port);
  });

  // Handle cleanup on server close
  server.on("close", async () => {
    await closeMongoDB();
  });
}

cron.schedule("0 2 * * *", async () => {
  console.log("Running a daily check for old emails and attachments...");
  const oldEmails = await getOldEmails(30); // Get emails older than 30 days
  console.log("oldEmails", oldEmails);
  for (const email of oldEmails) {
    await deleteEmailAndAttachments(email.emailID, email.emailId.toHexString()); // Delete each old email
  }
});

async function startServer() {
  try {
    await startSMTPServer();
    await startWebServer();
    await connectMongoDB();
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

startServer();
