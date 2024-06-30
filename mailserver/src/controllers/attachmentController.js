const path = require("path");

const attachmentController = {
  getAttachment: (req, res) => {
    const { directory, filename } = req.params;
    const filePath = path.join(__dirname, "..", "attachments", directory, filename);

    res.sendFile(filePath);
  },
};

module.exports = attachmentController;
