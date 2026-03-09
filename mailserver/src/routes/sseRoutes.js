const express = require("express");
const sseService = require("../services/sseService");
const { validateEmailId, handleValidationErrors } = require("../middleware/validationMiddleware");
const { authMiddleware, checkRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/sse/:emailId", authMiddleware, validateEmailId, handleValidationErrors, (req, res) => {
  const { emailId } = req.params;
  sseService.addClient(emailId.toLowerCase(), res);
});

// SSE endpoint for all emails (admin only)
router.get("/sse-all", authMiddleware, checkRole(["admin"]), (req, res) => {
  sseService.addAllEmailsClient(res);
});

module.exports = router;
