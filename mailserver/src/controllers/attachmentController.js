const path = require("path");
const { resolveAttachmentPath } = require("../utils/attachments");

const attachmentController = {
  getAttachment: (req, res) => {
    const { directory, filename } = req.params;

    let filePath;
    try {
      filePath = resolveAttachmentPath(directory, filename);
    } catch (error) {
      return res.status(403).json({ error: "Access denied" });
    }

    const downloadName = path.basename(filename).replace(/"/g, "");

    // Set content type based on file extension
    res.type(downloadName);
    
    // Force download
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        if (!res.headersSent) {
          res.status(404).json({ error: "File not found" });
        }
      }
    });
  },
};

module.exports = attachmentController;
