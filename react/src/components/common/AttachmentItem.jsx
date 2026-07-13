import { useEffect, useState } from "react";
import { Paperclip, Download } from "lucide-react";
import api, { isCanceled } from "../../api";
import { downloadBlob } from "../../utils/download";
import { useSnackbar } from "../../context/SnackbarContext";
import Dialog from "../ui/Dialog";
import Chip from "../ui/Chip";
import Skeleton from "../ui/Skeleton";
import Button from "../ui/Button";

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i;

// A single email attachment: image attachments render an inline thumbnail
// (fetched as a blob with the auth header) with click-to-open; everything
// else stays a downloadable chip.
const AttachmentItem = ({ attachment }) => {
  const showSnackbar = useSnackbar();
  const isImage = IMAGE_RE.test(attachment.filename || "");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);

  const attachmentPath = `/api/attachment/${attachment.directory}/${attachment.filename}`;

  useEffect(() => {
    if (!isImage) return undefined;

    let objectUrl = null;
    const controller = new AbortController();

    const fetchPreview = async () => {
      try {
        const response = await api.get(attachmentPath, { responseType: "blob", signal: controller.signal });
        objectUrl = URL.createObjectURL(response.data);
        setPreviewUrl(objectUrl);
      } catch (error) {
        if (!isCanceled(error)) {
          setFailed(true);
        }
      }
    };

    fetchPreview();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentPath, isImage]);

  const handleDownload = async () => {
    try {
      const response = await api.get(attachmentPath, { responseType: "blob" });
      downloadBlob(response.data, attachment.filename);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      showSnackbar("Failed to download attachment", "error");
    }
  };

  if (isImage && !failed) {
    return (
      <div className="inline-flex max-w-36 flex-col items-center gap-1">
        {previewUrl ? (
          <button
            type="button"
            onClick={() => setOpenPreview(true)}
            aria-label={`Preview ${attachment.filename}`}
            className="cursor-zoom-in rounded-xl border border-hairline transition-all duration-150 hover:scale-[1.04] hover:shadow-lift focus-ring"
          >
            <img src={previewUrl} alt={attachment.filename} className="h-24 w-24 rounded-[11px] object-cover" />
          </button>
        ) : (
          <Skeleton className="h-24 w-24 rounded-xl" />
        )}
        <span title={attachment.filename} className="max-w-full truncate text-[11px] text-faint">
          {attachment.filename}
        </span>

        <Dialog open={openPreview} onClose={() => setOpenPreview(false)} title={attachment.filename} maxWidth="max-w-3xl">
          <div className="flex flex-col items-center gap-3">
            <img src={previewUrl || ""} alt={attachment.filename} className="max-h-[70dvh] max-w-full rounded-xl object-contain" />
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download aria-hidden="true" className="h-4 w-4" />
              Download
            </Button>
          </div>
        </Dialog>
      </div>
    );
  }

  return (
    <Chip tone="accent" icon={Paperclip} onClick={handleDownload} title={`Download ${attachment.filename}`}>
      {attachment.filename}
    </Chip>
  );
};

export default AttachmentItem;
