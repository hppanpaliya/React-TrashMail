const { connectMongoDB, closeMongoDB } = require("./src/db");
const createApp = require("./src/app");
const { startSMTPServer } = require("./src/services/smtpService");
const { setupCronJobs } = require("./src/services/cronService");

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

async function startServer() {
  try {
    await connectMongoDB();
    await startSMTPServer();
    await startWebServer();
    setupCronJobs();
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

startServer();
