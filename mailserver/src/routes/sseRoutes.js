const express = require("express");
const sseService = require("../services/sseService");
const { validateEmailId } = require("../middleware/validationMiddleware");

const router = express.Router();

router.get("/sse/:emailId", validateEmailId, (req, res) => {
  const { emailId } = req.params;
  sseService.addClient(emailId, res);
});

module.exports = router;
