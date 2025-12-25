const express = require("express");
const attachmentController = require("../controllers/attachmentController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /attachments/:directory/:filename
// Serve attachment files (Protected)
router.get("/attachment/:directory/:filename", authMiddleware, attachmentController.getAttachment);

module.exports = router;
