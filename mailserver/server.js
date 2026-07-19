const { connectMongoDB, closeMongoDB } = require("./src/db");
const createApp = require("./src/app");
const { startSMTPServer } = require("./src/services/smtpService");
const { setupCronJobs } = require("./src/services/cronService");
const config = require("./src/config");

async function startWebServer() {
  const app = createApp();
  const port = config.webPort || 4000;

  return await new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log("Web server listening on port", port);
      resolve(server);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use.`);
      } else {
        console.error("Web server error:", err);
      }
      reject(err);
    });
  });
}

async function startServer() {
  try {
    await connectMongoDB();
    setupCronJobs();
    const smtpServer = await startSMTPServer();
    const server = await startWebServer();

    let isShuttingDown = false;
    const shutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log(`Received ${signal}, shutting down gracefully...`);
      const force = setTimeout(() => process.exit(1), 10000);
      force.unref();
      try {
        await new Promise((res) => server.close(res));
        if (smtpServer && typeof smtpServer.close === "function") {
          await new Promise((res) => smtpServer.close(res));
        }
        await closeMongoDB();
        clearTimeout(force);
        process.exit(0);
      } catch (err) {
        console.error("Error during shutdown:", err);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

startServer();
