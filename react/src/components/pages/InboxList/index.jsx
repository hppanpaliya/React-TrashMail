import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Copy, QrCode, Trash2, Webhook, Watch } from "lucide-react";
import SingleEmailItem from "../../common/SingleEmailItem";
import ConfirmModal from "../../common/ConfirmModal";
import NoEmailDisplay from "../../common/NoEmailDisplay";
import EmailListControls from "../../common/EmailListControls";
import QrCodeDialog from "../../common/QrCodeDialog";
import RecentInboxesMenu from "../../common/RecentInboxesMenu";
import WebhookDialog from "../../common/WebhookDialog";
import IconButton from "../../ui/IconButton";
import Pagination from "../../ui/Pagination";
import { useAuth } from "../../../context/AuthContext";
import { useSnackbar } from "../../../context/SnackbarContext";
import api, { isCanceled } from "../../../api";
import { openSSE } from "../../../sse";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import useUnreadTitle from "../../../hooks/useUnreadTitle";
import { copyText } from "../../../utils/clipboard";
import { addRecentInbox } from "../../../utils/recentInboxes";

const ITEMS_PER_PAGE = 50;

const EmailList = () => {
  const { emailId } = useParams();
  const [emailData, setEmailData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [openDeleteAllModal, setOpenDeleteAllModal] = useState(false);
  const [openQrDialog, setOpenQrDialog] = useState(false);
  const [openWebhookDialog, setOpenWebhookDialog] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState(null);
  const { token } = useAuth();
  const showSnackbar = useSnackbar();

  // Search, filter, sort (server-side)
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 350);
  const [filterRead, setFilterRead] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const navigate = useNavigate();

  // Refs so the long-lived SSE connection can read current state without re-connecting.
  const queryRef = useRef({ page: 1, search: "", filter: "all", sort: "date-desc" });
  const emailIdsRef = useRef(new Set());

  useEffect(() => {
    queryRef.current = { page, search: debouncedSearch, filter: filterRead, sort: sortBy };
  }, [page, debouncedSearch, filterRead, sortBy]);

  useEffect(() => {
    emailIdsRef.current = new Set(emailData.map((email) => email._id));
  }, [emailData]);

  // Track this inbox as recently visited.
  useEffect(() => {
    addRecentInbox(emailId);
  }, [emailId]);

  // Unread badge in the document title, driven by fetched data + SSE.
  const unreadCount = emailData.filter((email) => !email.readStatus).length;
  useUnreadTitle(unreadCount);

  // Query signature: a query change while on page > 1 resets the page first
  // and skips the fetch for the stale page, so exactly one request fires.
  const querySig = `${debouncedSearch}|${filterRead}|${sortBy}`;
  const lastSigRef = useRef(querySig);

  // Fetching: keyed on page + query state, with cancellation.
  useEffect(() => {
    if (!token) return undefined;

    if (lastSigRef.current !== querySig && page !== 1) {
      lastSigRef.current = querySig;
      setPage(1);
      return undefined; // no fetch for the stale page
    }
    lastSigRef.current = querySig;

    const controller = new AbortController();
    const [sortField, sortOrder] = sortBy.split("-");

    const fetchEmails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/emails-list/${emailId}`, {
          params: {
            page,
            limit: ITEMS_PER_PAGE,
            search: debouncedSearch || undefined,
            filter: filterRead,
            sortBy: sortField,
            sortOrder,
          },
          signal: controller.signal,
        });
        setEmailData(Array.isArray(response.data) ? response.data : []);
        setTotalCount(parseInt(response.headers["x-total-count"]) || 0);
        setTotalPages(parseInt(response.headers["x-total-pages"]) || 1);
        setLoading(false);
      } catch (err) {
        if (isCanceled(err)) return;
        if (err.response && err.response.status === 404) {
          // Older backends signalled an empty inbox with a 404.
          setEmailData([]);
          setTotalCount(0);
          setTotalPages(1);
        } else {
          console.error("Error fetching email data:", err);
          setEmailData([]);
          setError("Could not load this inbox. Please try again.");
        }
        setLoading(false);
      }
    };

    fetchEmails();

    return () => controller.abort();
  }, [emailId, token, page, debouncedSearch, filterRead, sortBy, querySig]);

  // SSE lifecycle: keyed on emailId/token only. Token travels in the
  // x-auth-token header (openSSE), never the URL.
  useEffect(() => {
    if (!token || !emailId) return undefined;

    const close = openSSE(`/api/sse/${emailId}`, {
      onData: (newEmail) => {
        if (!newEmail._id || emailIdsRef.current.has(newEmail._id)) return;

        const { page: currentPage, search, filter, sort } = queryRef.current;
        // Only splice new mail into the default (unfiltered, newest-first) view.
        if (search || filter === "read") return;

        setTotalCount((prev) => {
          const next = prev + 1;
          setTotalPages(Math.max(1, Math.ceil(next / ITEMS_PER_PAGE)));
          return next;
        });
        if (currentPage === 1 && sort === "date-desc") {
          setEmailData((prev) => {
            if (prev.some((email) => email._id === newEmail._id)) return prev;
            return [newEmail, ...prev].slice(0, ITEMS_PER_PAGE);
          });
        }
      },
    });

    return close;
  }, [emailId, token]);

  const handleEmailClick = (email) => {
    navigate(`/inbox/${emailId}/${email._id}`);
  };

  const handleOpenModal = () => {
    setOpenModal(true);
  };

  const handleCopyAddress = async () => {
    const ok = await copyText(emailId);
    showSnackbar(ok ? "Copied!" : "Could not copy address", ok ? "success" : "error");
  };

  const handleDeleteEmail = async (email) => {
    if (!email) return;
    try {
      await api.delete(`/api/email/${emailId}/${email._id}`);
      setEmailData((prev) => prev.filter((item) => item._id !== email._id));
      setTotalCount((prev) => {
        const next = Math.max(0, prev - 1);
        setTotalPages(Math.max(1, Math.ceil(next / ITEMS_PER_PAGE)));
        return next;
      });
      showSnackbar("Email deleted", "success");
    } catch (err) {
      console.error("Error deleting email:", err);
      showSnackbar("Failed to delete email", "error");
    }
  };

  const handleDeleteAll = async () => {
    try {
      const response = await api.delete(`/api/emails/${emailId}`);
      setEmailData([]);
      setTotalCount(0);
      setTotalPages(1);
      setPage(1);
      const deletedCount = response.data?.deletedCount ?? 0;
      showSnackbar(`Deleted ${deletedCount} email${deletedCount === 1 ? "" : "s"}`, "success");
    } catch (err) {
      console.error("Error deleting all emails:", err);
      showSnackbar("Failed to delete emails", "error");
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterRead("all");
    setSortBy("date-desc");
  };

  const handlePageChange = (value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveQuery = Boolean(debouncedSearch) || filterRead !== "all";

  return (
    <div className="pt-2">
      {/* Inbox header */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={handleCopyAddress}
          title="Copy address"
          className="min-w-0 cursor-pointer break-all text-left font-display text-2xl font-bold leading-tight text-ink transition-colors hover:text-accent focus-ring rounded-md sm:text-3xl"
        >
          {emailId}
        </button>
        <div className="flex items-center gap-0.5 pl-1">
          <IconButton label="Copy address" size="sm" onClick={handleCopyAddress}>
            <Copy />
          </IconButton>
          <IconButton label="Show QR code" size="sm" onClick={() => setOpenQrDialog(true)}>
            <QrCode />
          </IconButton>
          <RecentInboxesMenu current={emailId} />
          <IconButton label="Webhook settings" size="sm" onClick={() => setOpenWebhookDialog(true)}>
            <Webhook />
          </IconButton>
          <IconButton label="Open watch view" size="sm" onClick={() => navigate(`/watch/${emailId}`)}>
            <Watch />
          </IconButton>
          <IconButton label="Delete all emails" size="sm" tone="danger" disabled={totalCount === 0} onClick={() => setOpenDeleteAllModal(true)}>
            <Trash2 />
          </IconButton>
        </div>
      </div>

      <EmailListControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterRead={filterRead}
        onFilterChange={setFilterRead}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onClear={handleClearFilters}
        resultSummary={loading ? "Loading emails…" : `Showing ${emailData.length} of ${totalCount} emails (Page ${page} of ${totalPages})`}
      />

      {error && !loading ? (
        <div className="glass mt-6 rounded-2xl p-8 text-center">
          <p className="text-sm text-danger">{error}</p>
        </div>
      ) : emailData.length > 0 && !loading ? (
        emailData.map((email, index) => (
          <SingleEmailItem
            email={email}
            handleEmailClick={handleEmailClick}
            handleOpenModal={handleOpenModal}
            setEmailToDelete={setEmailToDelete}
            index={index}
            key={email._id}
          />
        ))
      ) : (
        <NoEmailDisplay loading={loading} waiting={!hasActiveQuery} />
      )}

      {!loading && !error && <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} className="mb-6 mt-8" />}

      <ConfirmModal
        open={openModal}
        setOpen={setOpenModal}
        title="Delete Email"
        body="Are you sure you want to delete this email?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          handleDeleteEmail(emailToDelete);
          setOpenModal(false);
        }}
        onCancel={() => setOpenModal(false)}
      />

      <ConfirmModal
        open={openDeleteAllModal}
        setOpen={setOpenDeleteAllModal}
        title="Delete All Emails"
        body={`Are you sure you want to delete all ${totalCount} emails in this inbox? This cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        onConfirm={() => {
          handleDeleteAll();
          setOpenDeleteAllModal(false);
        }}
        onCancel={() => setOpenDeleteAllModal(false)}
      />

      <QrCodeDialog open={openQrDialog} onClose={() => setOpenQrDialog(false)} value={emailId} />
      <WebhookDialog open={openWebhookDialog} onClose={() => setOpenWebhookDialog(false)} emailId={emailId} />
    </div>
  );
};

export default EmailList;
