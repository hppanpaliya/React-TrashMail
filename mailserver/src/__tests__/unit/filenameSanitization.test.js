const fs = require("fs");
const os = require("os");
const path = require("path");
const { sanitizeAttachmentFilename, dedupeFilename } = require("../../utils/filename");

describe("sanitizeAttachmentFilename", () => {
  test("strips directory traversal components", () => {
    expect(sanitizeAttachmentFilename("../../../etc/passwd")).toBe("passwd");
    expect(sanitizeAttachmentFilename("..\\..\\windows\\system32\\evil.exe")).toBe("evil.exe");
    expect(sanitizeAttachmentFilename("/absolute/path/file.txt")).toBe("file.txt");
  });

  test("strips control characters", () => {
    expect(sanitizeAttachmentFilename("bad\r\nname\x00.txt")).toBe("badname.txt");
  });

  test("falls back to a generated name when empty or unusable", () => {
    expect(sanitizeAttachmentFilename("")).toMatch(/^attachment-[0-9a-f]{12}$/);
    expect(sanitizeAttachmentFilename(undefined)).toMatch(/^attachment-[0-9a-f]{12}$/);
    expect(sanitizeAttachmentFilename("..")).toMatch(/^attachment-[0-9a-f]{12}$/);
    expect(sanitizeAttachmentFilename("./")).toMatch(/^attachment-[0-9a-f]{12}$/);
  });

  test("keeps normal filenames intact", () => {
    expect(sanitizeAttachmentFilename("report.pdf")).toBe("report.pdf");
    expect(sanitizeAttachmentFilename("photo (1).jpg")).toBe("photo (1).jpg");
  });

  test("truncates absurdly long filenames but keeps the extension", () => {
    const long = "a".repeat(500) + ".txt";
    const result = sanitizeAttachmentFilename(long);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result.endsWith(".txt")).toBe(true);
  });
});

describe("dedupeFilename", () => {
  test("returns a non-colliding filename within a folder", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dedupe-test-"));
    try {
      expect(dedupeFilename(fs, dir, "file.txt")).toBe("file.txt");
      fs.writeFileSync(path.join(dir, "file.txt"), "one");
      expect(dedupeFilename(fs, dir, "file.txt")).toBe("file-1.txt");
      fs.writeFileSync(path.join(dir, "file-1.txt"), "two");
      expect(dedupeFilename(fs, dir, "file.txt")).toBe("file-2.txt");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
