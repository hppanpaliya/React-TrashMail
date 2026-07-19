const express = require("express");
const rateLimit = require("express-rate-limit");
const sseService = require("../services/sseService");
const { validateEmailId, handleValidationErrors } = require("../middleware/validationMiddleware");
const jwt = require("jsonwebtoken");
const config = require("../config");
const { getDB } = require("../db");
const { ObjectId } = require("mongodb");

const router = express.Router();

// The global /api limiter skips /sse/, so throttle connection establishment
// here instead (streams themselves are long-lived).
const sseLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { message: "Too many SSE connection attempts, try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authenticates SSE connections via the ?token= query param. Mirrors
// authMiddleware: the user is re-fetched from the DB so revoked roles or
// domain access take effect immediately.
const sseAuthMiddleware = async (req, res, next) => {
  // Prefer the header (fetch-based SSE client); the query fallback exists only
  // for older clients during rollout and should be removed once they are gone.
  const token = req.header("x-auth-token") || req.query.token;
  if (!token) {
    console.error("SSE Auth Failed: No token provided");
    return res.status(401).json({ message: "No token, authorization denied" });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    const userId = decoded.id || (decoded.user && decoded.user.id);

    const db = getDB();
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role || "user",
      allowedDomains: user.allowedDomains,
    };
    next();
  } catch (err) {
    console.error("SSE Auth Failed:", err.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};

// validateEmailId enforces the same per-user domain authorization used by the
// REST email routes (user.allowedDomains or the global config.allowedDomains),
// so users can only subscribe to inboxes on domains they may view.
router.get("/sse/:emailId", sseLimiter, sseAuthMiddleware, validateEmailId, handleValidationErrors, (req, res) => {
  const { emailId } = req.params;
  if (!sseService.addClient(emailId, res, { ip: req.ip, userId: req.user.id })) {
    return res.status(429).json({ message: "Too many concurrent connections" });
  }
});

// SSE endpoint for all emails (admin only)
router.get("/sse-all", sseLimiter, sseAuthMiddleware, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
  }
  if (!sseService.addAllEmailsClient(res, { ip: req.ip, userId: req.user.id })) {
    return res.status(429).json({ message: "Too many concurrent connections" });
  }
});

module.exports = router;
