const path = require("path");

const ATTACHMENTS_ROOT = path.resolve(__dirname, "..", "..", "attachments");

function resolveAttachmentPath(...segments) {
  const resolvedPath = path.resolve(ATTACHMENTS_ROOT, ...segments);
  const rootWithSeparator = `${ATTACHMENTS_ROOT}${path.sep}`;

  if (resolvedPath !== ATTACHMENTS_ROOT && !resolvedPath.startsWith(rootWithSeparator)) {
    throw new Error("Invalid attachment path");
  }

  return resolvedPath;
}

function sanitizeAttachmentFilename(filename) {
  const basename = path.basename(String(filename || ""));
  const sanitized = basename.replace(/[\\/:*?"<>|]/g, "_").trim();

  return sanitized || "attachment.bin";
}

module.exports = {
  ATTACHMENTS_ROOT,
  resolveAttachmentPath,
  sanitizeAttachmentFilename,
};
