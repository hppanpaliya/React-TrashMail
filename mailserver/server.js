const express = require("express");
const { SMTPServer } = require("smtp-server");
const { handleIncomingEmail } = require("./emailHandler");
const { smtpPort } = require("./src/config");
const { connectMongoDB } = require("./src/db");
const emailRoutes = require("./src/routes/emailRoutes");
const attachmentRoutes = require("./src/routes/attachmentRoutes");
const cors = require("cors");
const path = require("path");
const cron = require("node-cron");
const { getOldEmails } = require("./emailHandler");
const { deleteEmailAndAttachments } = require("./emailHandler");

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
  const app = express();
  const port = 4000;

  // Enable CORS
  app.use(cors());

  // Define routes

  app.use(emailRoutes);
  app.use(attachmentRoutes);
  app.use(express.static(path.join(__dirname, "build")));

  // Handle all other requests by serving the React app's entry point (index.html)
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });

  // Start server

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
