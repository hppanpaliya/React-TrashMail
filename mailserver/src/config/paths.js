const path = require("path");

// Single source of truth for where email attachments live on disk.
// Used by emailService (writing), attachmentController (serving) and
// emailController (deleting).
const attachmentsRoot = path.join(__dirname, "..", "..", "attachments");

module.exports = { attachmentsRoot };
