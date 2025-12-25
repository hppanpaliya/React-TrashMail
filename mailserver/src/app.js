const express = require("express");
const cors = require("cors");
const path = require("path");
const emailRoutes = require("./routes/emailRoutes");
const attachmentRoutes = require("./routes/attachmentRoutes");
const sseRoutes = require("./routes/sseRoutes");
const authRoutes = require("./routes/authRoutes");

function createApp() {
  const app = express();

  // Enable CORS
  app.use(cors());
  
  // Parse JSON bodies (needed for auth)
  app.use(express.json());

  // Define routes
  app.use("/api/auth", authRoutes);
  app.use("/api", emailRoutes);
  app.use("/api", attachmentRoutes);
  app.use("/api", sseRoutes);
  app.use(express.static(path.join(__dirname, "build")));

  // Handle all other requests by serving the React app's entry point (index.html)
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });

  return app;
}

module.exports = createApp;
