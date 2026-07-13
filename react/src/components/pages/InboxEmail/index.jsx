import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Letter } from "react-letter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Info, Download, Trash2, Paperclip } from "lucide-react";
import ConfirmModal from "../../common/ConfirmModal";
import AttachmentItem from "../../common/AttachmentItem";
import EmailViewSkeleton from "../../common/EmailViewSkeleton";
import ExpiryChip from "../../common/ExpiryChip";
import IconButton from "../../ui/IconButton";
import Button from "../../ui/Button";
import { useAuth } from "../../../context/AuthContext";
import { useSnackbar } from "../../../context/SnackbarContext";
import api from "../../../api";
import { downloadBlob } from "../../../utils/download";
import { formatAbsoluteTime, formatRelativeTime } from "../../../utils/time";
import { cx } from "../../../utils/cx";

const VIEW_MODES = [
  { value: "html", label: "HTML" },
  { value: "text", label: "Text" },
  { value: "original", label: "Original" },
];

const InboxEmail = () => {
  const { emailId, email_id } = useParams();
  const [emailData, setEmailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHeaders, setShowHeaders] = useState(false);
  const [viewMode, setViewMode] = useState("html"); // 'html', 'text', 'original'
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const { token } = useAuth();
  const showSnackbar = useSnackbar();
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();

    const fetchEmailData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/email/${emailId}/${email_id}`, { signal: controller.signal });
        setEmailData(response.data?.[0] || null);
        setLoading(false);
      } catch (err) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
        console.error("Error fetching email data:", err);
        setError("Could not load this email.");
        setLoading(false);
      }
    };

    fetchEmailData();

    return () => controller.abort();
  }, [email_id, emailId, token]);

  const emailAttachments = emailData?.attachments || [];
  const emailHeaders = emailData?.headerLines;

  const handleDeleteEmail = async () => {
    try {
      await api.delete(`/api/email/${emailId}/${email_id}`);
      navigate(`/inbox/${emailId}`);
    } catch (err) {
      console.error("Error deleting email:", err);
      showSnackbar("Failed to delete email", "error");
    }
  };

  const handleDownloadRaw = async () => {
    try {
      const response = await api.get(`/api/email/${emailId}/${email_id}/raw`, { responseType: "blob" });
      const safeName = (emailData?.subject || email_id).replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || email_id;
      downloadBlob(response.data, `${safeName}.eml`);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        showSnackbar("Raw source is not available for this email", "info");
      } else {
        console.error("Error downloading raw email:", err);
        showSnackbar("Failed to download raw email", "error");
      }
    }
  };

  const containerVariants = {
    initial: { opacity: reduceMotion ? 1 : 0 },
    animate: {
      opacity: 1,
      transition: {
        delayChildren: reduceMotion ? 0 : 0.05,
        staggerChildren: reduceMotion ? 0 : 0.06,
      },
    },
  };

  const childVariants = {
    initial: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : -10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  };

  const availableModes = VIEW_MODES.filter((mode) => {
    if (mode.value === "text") return Boolean(emailData?.text);
    if (mode.value === "original") return Boolean(emailData?.htmlOriginal);
    return true;
  });

  return (
    <div className="pt-2">
      <div className="glass overflow-hidden rounded-2xl shadow-card">
        {loading ? (
          <EmailViewSkeleton />
        ) : error ? (
          <div className="p-8 text-center">
            <IconButton label="Back to inbox" onClick={() => navigate(`/inbox/${emailId}`)} className="mb-2">
              <ArrowLeft />
            </IconButton>
            <p className="text-sm text-danger">{error}</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="initial" animate="animate">
            {/* Header: back + subject + meta */}
            <motion.div variants={childVariants} className="px-4 pt-4 sm:px-6 sm:pt-5">
              <IconButton label="Back to inbox" size="sm" onClick={() => navigate(`/inbox/${emailId}`)} className="-ml-1.5 mb-2">
                <ArrowLeft />
              </IconButton>
              <h1 className="break-words text-lg font-semibold leading-snug text-ink sm:text-xl">{emailData?.subject || "No Subject"}</h1>
              <dl className="mt-3 flex flex-col gap-1 text-[13px] text-muted">
                <div className="flex gap-2">
                  <dt className="w-11 shrink-0 font-medium text-faint">From</dt>
                  <dd className="min-w-0 break-words">{emailData?.from?.text || "No From"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-11 shrink-0 font-medium text-faint">To</dt>
                  <dd className="min-w-0 break-words">{emailData?.to?.text || "No To"}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="w-11 shrink-0 font-medium text-faint">Date</dt>
                  <dd className="tabular-nums flex flex-wrap items-center gap-2">
                    {emailData?.date ? `${formatAbsoluteTime(emailData.date)} (${formatRelativeTime(emailData.date)})` : "No Date"}
                    <ExpiryChip date={emailData?.date} />
                  </dd>
                </div>
              </dl>
            </motion.div>

            {/* Action toolbar */}
            <motion.div
              variants={childVariants}
              className="mt-4 flex flex-wrap items-center justify-between gap-2 border-y border-hairline bg-raised px-4 py-2.5 sm:px-6"
            >
              <div role="group" aria-label="View mode" className="flex overflow-hidden rounded-lg border border-hairline">
                {availableModes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setViewMode(mode.value)}
                    aria-pressed={viewMode === mode.value}
                    className={cx(
                      "cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-ring",
                      viewMode === mode.value ? "bg-accent text-accent-ink" : "text-muted hover:bg-raised hover:text-ink",
                      mode.value === "original" && viewMode !== "original" && "text-warning"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <IconButton
                  label={showHeaders ? "Hide email headers" : "Show email headers"}
                  size="sm"
                  tone={showHeaders ? "accent" : "default"}
                  onClick={() => setShowHeaders((prev) => !prev)}
                >
                  <Info />
                </IconButton>
                <IconButton label="Download raw email (.eml)" size="sm" onClick={handleDownloadRaw}>
                  <Download />
                </IconButton>
                <Button variant="dangerOutline" size="sm" onClick={() => setOpenDeleteModal(true)}>
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </motion.div>

            {/* Headers (collapsible) */}
            {showHeaders && (
              <motion.div
                initial={reduceMotion ? {} : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden border-b border-hairline bg-raised"
              >
                <div className="max-h-52 overflow-auto px-4 py-3 sm:px-6">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Email headers</h2>
                  {emailHeaders && emailHeaders.length > 0 ? (
                    emailHeaders.map((header, i) => {
                      const line = header.line || "";
                      const sep = line.indexOf(":");
                      return (
                        <p key={i} className="break-all font-mono text-[11px] leading-relaxed text-muted">
                          <strong className="text-ink">{sep > 0 ? line.slice(0, sep) : line}</strong>
                          {sep > 0 && `: ${line.slice(sep + 1).trim()}`}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted">No Headers</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Email content */}
            <motion.div variants={childVariants} className="min-h-52 p-4 sm:p-6">
              {viewMode === "text" ? (
                <pre className="max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-raised p-4 font-mono text-[13px] leading-relaxed text-ink">
                  {emailData?.text || "No Text Content"}
                </pre>
              ) : (
                <div className="email-body max-w-full overflow-x-auto rounded-xl bg-white p-3 text-black sm:p-4">
                  {/* Empty html lets react-letter fall back to the text part. */}
                  <Letter
                    html={(viewMode === "original" ? emailData?.htmlOriginal || emailData?.html : emailData?.html) || ""}
                    text={emailData?.text || "No Message"}
                  />
                </div>
              )}
            </motion.div>

            {/* Attachments */}
            {emailAttachments.length > 0 && (
              <motion.div variants={childVariants} className="border-t border-hairline px-4 py-4 sm:px-6">
                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <Paperclip aria-hidden="true" className="h-4 w-4" />
                  Attachments ({emailAttachments.length})
                </h2>
                <div className="flex flex-wrap items-start gap-3">
                  {emailAttachments.map((attachment, i) => (
                    <AttachmentItem key={`${attachment.filename}-${i}`} attachment={attachment} />
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      <ConfirmModal
        open={openDeleteModal}
        setOpen={setOpenDeleteModal}
        title="Delete Email"
        body="Are you sure you want to delete this email?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          handleDeleteEmail();
          setOpenDeleteModal(false);
        }}
        onCancel={() => setOpenDeleteModal(false)}
      />
    </div>
  );
};

export default InboxEmail;
