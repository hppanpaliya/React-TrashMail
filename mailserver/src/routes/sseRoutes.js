const express = require("express");
const sseService = require("../services/sseService");
const { validateEmailId, handleValidationErrors } = require("../middleware/validationMiddleware");
const jwt = require("jsonwebtoken");
const config = require("../config");
const { getDB } = require("../db");
const { ObjectId } = require("mongodb");

const router = express.Router();

// Authenticates SSE connections via the ?token= query param. Mirrors
// authMiddleware: the user is re-fetched from the DB so revoked roles or
// domain access take effect immediately.
const sseAuthMiddleware = async (req, res, next) => {
  const token = req.query.token;
  if (!token) {
    console.error("SSE Auth Failed: No token provided");
    return res.status(401).json({ message: "No token, authorization denied" });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
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
router.get("/sse/:emailId", sseAuthMiddleware, validateEmailId, handleValidationErrors, (req, res) => {
  const { emailId } = req.params;
  sseService.addClient(emailId, res);
});

// SSE endpoint for all emails (admin only)
router.get("/sse-all", sseAuthMiddleware, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
  }
  sseService.addAllEmailsClient(res);
});

module.exports = router;
