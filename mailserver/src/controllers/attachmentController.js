const path = require("path");
const mime = require("mime-types");
const { attachmentsRoot } = require("../config/paths");

const attachmentController = {
  getAttachment: (req, res) => {
    const { directory, filename } = req.params;

    // Security: Prevent directory traversal
    const safeDirectory = path.normalize(directory).replace(/^(\.\.[\/\\])+/, "");
    const safeFilename = path.normalize(filename).replace(/^(\.\.[\/\\])+/, "");

    const filePath = path.resolve(attachmentsRoot, safeDirectory, safeFilename);

    // Ensure the resolved path is strictly inside the attachments root.
    // Comparing with a trailing separator prevents sibling-directory escapes
    // (e.g. /attachments-evil matching a bare startsWith check).
    if (!filePath.startsWith(attachmentsRoot + path.sep)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Set content type based on file extension
    const contentType = mime.lookup(safeFilename) || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // Force download. Strip quotes and CR/LF so a crafted filename cannot
    // inject additional headers or break out of the quoted string.
    const dispositionName = path.basename(safeFilename).replace(/[\r\n"\\]/g, "");
    res.setHeader("Content-Disposition", `attachment; filename="${dispositionName}"`);

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
