const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const helmet = require("helmet");
const mongoSanitize = require("./middleware/mongoSanitizeMiddleware");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const emailRoutes = require("./routes/emailRoutes");
const attachmentRoutes = require("./routes/attachmentRoutes");
const sseRoutes = require("./routes/sseRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");

function createApp() {
  const app = express();
  // If behind a proxy (e.g., Heroku, Nginx), trust the proxy
  app.set('trust proxy', true);

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // React often needs unsafe-inline for development or certain builds
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow CORS for development
  }));

  // Enable CORS with exposed headers for pagination
  app.use(cors({
    exposedHeaders: ['X-Total-Count', 'X-Total-Pages', 'X-Current-Page']
  }));

  // Rate Limiting (Global)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased limit to allow normal usage
    message: "Too many requests from this IP, please try again later.",
    validate: {xForwardedForHeader: false}, // Disable validation since we're handling proxy correctly
    skip: (req) => req.originalUrl.includes('/sse/') // Skip rate limiting for SSE connections
  });
  app.use("/api", limiter);

  // Data Sanitization against NoSQL query injection
  app.use(mongoSanitize());

  // Prevent Parameter Pollution
  app.use(hpp());
  
  // Parse JSON bodies (needed for auth)
  app.use(express.json({ limit: '10kb' })); // Limit body size

  // Define routes
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api", emailRoutes);
  app.use("/api", attachmentRoutes);
  app.use("/api", sseRoutes);
  
  // Serve static files from the React app build directory
  const buildPath = path.join(__dirname, ".", "build"); 
  app.use(express.static(buildPath));

  if (fs.existsSync(path.join(buildPath, "index.html"))) {
    app.use((req, res) => {
      res.sendFile(path.join(buildPath, "index.html"));
    });
  }

  return app;
}

module.exports = createApp;
