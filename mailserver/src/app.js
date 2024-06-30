const express = require("express");
const cors = require("cors");
const path = require("path");
const emailRoutes = require("./routes/emailRoutes");
const attachmentRoutes = require("./routes/attachmentRoutes");

function createApp() {
  const app = express();

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

  return app;
}

module.exports = createApp;
