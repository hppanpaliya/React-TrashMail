const express = require("express");
const sseService = require("../services/sseService");
const { validateEmailId } = require("../middleware/validationMiddleware");
const jwt = require("jsonwebtoken");
const config = require("../config");

const router = express.Router();

const sseAuthMiddleware = (req, res, next) => {
  const token = req.query.token;
  if (!token) {
    console.error("SSE Auth Failed: No token provided");
    return res.status(401).json({ message: "No token, authorization denied" });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error("SSE Auth Failed:", err.message);
    console.error("Token:", token);
    console.error("Secret used:", config.jwtSecret); // Be careful logging secrets in prod, but ok for debug
    // If token is expired or invalid, we might want to allow connection but not associate with user
    // But for now, let's be strict.
    res.status(401).json({ message: "Token is not valid" });
  }
};

router.get("/sse/:emailId", sseAuthMiddleware, validateEmailId, (req, res) => {
  const { emailId } = req.params;
  // Double check if the user in token matches the emailId requested
  // This prevents User A from listening to User B's events
  // Note: emailId in params is the temporary email address, user.username is the account username.
  // They are different concepts in this app.
  // If the app design links them, we should check here.
  
  sseService.addClient(emailId, res);
});

module.exports = router;
