const express = require("express");
const { SMTPServer } = require("smtp-server");
const { handleIncomingEmail } = require("./emailHandler");
const { smtpPort } = require("./config");
const { connectMongoDB } = require("./db");
const emailRoutes = require("./emailRoutes");
const attachmentRoutes = require("./attachmentRoutes");
const cors = require("cors");

async function startSMTPServer() {
  const server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      handleIncomingEmail(stream)
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
  app.get("/", (req, res) => {
    res.send("Hello, this is a mail server!");
  });
  app.use(emailRoutes);
  app.use(attachmentRoutes);

  // Start server
  const server = app.listen(port, () => {
    console.log("Web server listening on port", port);
  });

  // Handle cleanup on server close
  server.on("close", async () => {
    await closeMongoDB();
  });
}

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
