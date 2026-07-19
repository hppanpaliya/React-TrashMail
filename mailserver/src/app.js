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
const webhookRoutes = require("./routes/webhookRoutes");

function createApp() {
  const app = express();
  // Configure proxy trust based on your deployment:
  // - 0 or false: Direct connection (local development, no proxy)
  // - 1: Behind one proxy (e.g., Nginx only)
  // - 2: Behind two proxies (e.g., Cloudflare + Nginx)
  // - N: Behind N proxies
  // IMPORTANT: Setting this incorrectly allows rate limit bypass!
  const rawTrustProxy = process.env.TRUST_PROXY || "0";
  let trustProxyValue;
  if (rawTrustProxy === "false") {
    trustProxyValue = false;
  } else {
    const n = parseInt(rawTrustProxy, 10);
    if (Number.isNaN(n)) {
      console.warn(`Invalid TRUST_PROXY value "${rawTrustProxy}"; defaulting to 0 (no proxy trust).`);
      trustProxyValue = 0;
    } else {
      trustProxyValue = n;
    }
  }
  app.set("trust proxy", trustProxyValue);

  // Security Headers.
  // Helmet's default CSP includes upgrade-insecure-requests, which makes
  // browsers rewrite every asset request to https:// — on a plain-HTTP
  // self-hosted deployment (the Docker default) the page then renders blank.
  // It and HSTS are therefore opt-in via FORCE_HTTPS=true for deployments
  // that actually terminate TLS.
  const forceHttps = process.env.FORCE_HTTPS === "true";
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // React often needs unsafe-inline for development or certain builds
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'"],
          ...(forceHttps ? {} : { upgradeInsecureRequests: null }),
        },
      },
      hsts: forceHttps,
      crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow CORS for development
    })
  );

  // Enable CORS with exposed headers for pagination. Cross-origin browser
  // callers must be allowlisted via ALLOWED_ORIGINS (comma-separated); the SPA
  // is served same-origin, so no Origin header means the request is allowed.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (allowedOrigins.length === 0) {
    console.warn("ALLOWED_ORIGINS is not set; cross-origin browser requests will be rejected (same-origin only).");
  }
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      exposedHeaders: ["X-Total-Count", "X-Total-Pages", "X-Current-Page"],
    })
  );

  // Rate Limiting (Global)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased limit to allow normal usage
    message: "Too many requests from this IP, please try again later.",
    // Skip rate limiting for SSE connections only. Match precisely on the
    // path (relative to the /api mount) so "/sse/" appearing elsewhere in the
    // URL or query string cannot be used to bypass rate limiting.
    skip: (req) => req.path.startsWith("/sse/"),
  });
  app.use("/api", limiter);

  // Parse JSON bodies first so downstream sanitizers see req.body
  app.use(express.json({ limit: "10kb" })); // Limit body size

  // Data Sanitization against NoSQL query injection (must run AFTER body parse)
  app.use(mongoSanitize());

  // Prevent Parameter Pollution
  app.use(hpp());

  // Define routes
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  // Webhook routes are mounted BEFORE emailRoutes: emailRoutes applies a
  // generic HTML-escaping sanitizer at router level which would corrupt
  // webhook URLs/secrets in request bodies as they pass through the /api
  // chain. Webhook inputs are strictly validated instead.
  app.use("/api", webhookRoutes);
  app.use("/api", emailRoutes);
  app.use("/api", attachmentRoutes);
  app.use("/api", sseRoutes);

  // Liveness/readiness probe: verifies the DB connection, unauthenticated and
  // outside /api so rate limiting never rejects the container healthcheck.
  app.get("/health", async (req, res) => {
    try {
      const { getDB } = require("./db");
      await getDB().command({ ping: 1 });
      res.status(200).json({ status: "ok" });
    } catch (err) {
      res.status(503).json({ status: "unhealthy" });
    }
  });

  // Unknown API routes -> JSON 404 (must come before the SPA fallback)
  app.use("/api", (req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Serve static files from the React app build directory
  const buildPath = path.join(__dirname, ".", "build");
  app.use(express.static(buildPath));

  if (fs.existsSync(path.join(buildPath, "index.html"))) {
    app.use((req, res) => {
      res.sendFile(path.join(buildPath, "index.html"));
    });
  }

  // Central error handler: sanitized JSON, stack only outside production
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    const status = err.status || 500;
    res.status(status).json({
      error: status === 500 ? "Internal server error" : err.message,
      ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
    });
  });

  return app;
}

module.exports = createApp;
