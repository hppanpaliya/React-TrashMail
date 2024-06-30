const { connectMongoDB, closeMongoDB } = require("./src/db");
const createApp = require("./src/app");
const { startSMTPServer } = require("./src/services/smtpService");
const { setupCronJobs } = require("./src/services/cronService");
const config = require("./src/config");

async function startWebServer() {
  const app = createApp();
  const port = config.webPort || 4000;

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
    setupCronJobs();
    await connectMongoDB();
    await startSMTPServer();
    await startWebServer();
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

startServer();
