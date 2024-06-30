const express = require("express");
const attachmentController = require("../controllers/attachmentController");

const router = express.Router();

// GET /attachments/:directory/:filename
// Serve attachment files
router.get("/attachment/:directory/:filename", attachmentController.getAttachment);

module.exports = router;
