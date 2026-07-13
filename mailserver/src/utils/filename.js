const path = require("path");
const crypto = require("crypto");

/**
 * Sanitize an attacker-controlled attachment filename (it arrives over SMTP)
 * so it is safe to join into a filesystem path:
 * - strips any directory components (both / and \ separators)
 * - strips control characters
 * - falls back to a generated name when nothing usable remains
 */
function sanitizeAttachmentFilename(filename) {
  let name = typeof filename === "string" ? filename : "";

  // Normalize Windows separators, then keep only the basename.
  name = path.basename(name.replace(/\\/g, "/"));

  // Strip control characters and any leftover path separators.
  // eslint-disable-next-line no-control-regex
  name = name
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[/\\]/g, "")
    .trim();

  if (name === "" || name === "." || name === "..") {
    name = `attachment-${crypto.randomBytes(6).toString("hex")}`;
  }

  // Keep filenames to a sane length (preserve the extension).
  if (name.length > 200) {
    const ext = path.extname(name).slice(0, 20);
    name = name.slice(0, 200 - ext.length) + ext;
  }

  return name;
}

/**
 * Given a directory and a desired filename, return a filename that does not
 * collide with an existing file in that directory ("file.txt" -> "file-1.txt").
 */
function dedupeFilename(fs, directory, filename) {
  const ext = path.extname(filename);
  const base = filename.slice(0, filename.length - ext.length);
  let candidate = filename;
  let counter = 1;
  while (fs.existsSync(path.join(directory, candidate))) {
    candidate = `${base}-${counter}${ext}`;
    counter += 1;
  }
  return candidate;
}

module.exports = { sanitizeAttachmentFilename, dedupeFilename };
