// The suggested save name comes from attacker-controllable MIME headers:
// strip any path components and control characters before handing it to the
// anchor's download attribute.
export const sanitizeDownloadName = (name) => {
  const base =
    String(name ?? "")
      .split(/[\\/]/)
      .pop() || "";
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\x00-\x1f]/g, "").trim();
  return cleaned || "download";
};

// Trigger a client-side download of a Blob.
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = sanitizeDownloadName(filename);
  document.body.appendChild(anchor);
  anchor.click();
  // Defer cleanup: revoking synchronously can cancel the download in browsers
  // that haven't started reading the blob yet.
  setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 0);
};
