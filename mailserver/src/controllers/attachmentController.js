const path = require("path");
const mime = require("mime-types");

const attachmentController = {
  getAttachment: (req, res) => {
    const { directory, filename } = req.params;
    
    // Security: Prevent directory traversal
    const safeDirectory = path.normalize(directory).replace(/^(\.\.[\/\\])+/, '');
    const safeFilename = path.normalize(filename).replace(/^(\.\.[\/\\])+/, '');
    
    const attachmentsRoot = path.join(__dirname, "../..", "attachments");
    const filePath = path.join(attachmentsRoot, safeDirectory, safeFilename);

    // Ensure the resolved path is still within the attachments root
    if (!filePath.startsWith(attachmentsRoot)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Set content type based on file extension
    const contentType = mime.lookup(filename) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Force download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
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
