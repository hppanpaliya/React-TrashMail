const express = require("express");
const path = require("path");

const router = express.Router();

// GET /attachments/:directory/:filename
// Serve attachment files
router.get("/attachment/:directory/:filename", (req, res) => {
  const { directory, filename } = req.params;
  const filePath = path.join(__dirname, "attachments", directory, filename);

  res.sendFile(filePath);
});

module.exports = router;
