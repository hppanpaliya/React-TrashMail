const express = require("express");
const sseService = require("../services/sseService");
const { validateEmailId } = require("../middleware/validationMiddleware");
const jwt = require("jsonwebtoken");
const config = require("../config");

const router = express.Router();

const sseAuthMiddleware = (req, res, next) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

router.get("/sse/:emailId", sseAuthMiddleware, validateEmailId, (req, res) => {
  const { emailId } = req.params;
  sseService.addClient(emailId, res);
});

module.exports = router;
