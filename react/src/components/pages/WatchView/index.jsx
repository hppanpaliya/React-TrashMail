import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { isCanceled } from "../../../api";
import { useAuth } from "../../../context/AuthContext";
import { extractOtp } from "../../../utils/otp";
import { copyText } from "../../../utils/clipboard";
import { formatRelativeTime } from "../../../utils/time";
import { getRecentInboxes } from "../../../utils/recentInboxes";
import { cx } from "../../../utils/cx";

const POLL_INTERVAL_MS = 30000;
const LIST_LIMIT = 10;

// "Jane <jane@x.com>" → "Jane"; bare addresses pass through.
const senderName = (from) => {
  const text = from?.text || "";
  const name = text.split("<")[0].replace(/["']/g, "").trim();
  return name || text.trim() || "Unknown sender";
};

const htmlToText = (html) => {
  if (!html) return "";
  try {
    return new DOMParser().parseFromString(html, "text/html").body.textContent || "";
  } catch {
    return "";
  }
};

// Every interactive element in this view keeps a ≥44px hit target.
const TapRow = ({ onClick, className, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cx("flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 text-left focus-ring", className)}
  >
    {children}
  </button>
);

const OtpButton = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(code);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy code ${code}`}
      className="my-2 w-full cursor-pointer rounded-xl bg-accent-soft px-3 py-3 text-center focus-ring"
    >
      <span className="block font-mono text-3xl font-bold tracking-[0.15em] text-accent tabular-nums">{code}</span>
      <span className="mt-1 block text-[11px] text-muted">{copied ? "Copied!" : "Tap to copy"}</span>
    </button>
  );
};

const CenteredNote = ({ children }) => <p className="px-4 py-10 text-center text-sm leading-relaxed text-muted">{children}</p>;

// Ultra-compact, text-first inbox reader for tiny (~200px) viewports such as
// Apple Watch WebKit. Always dark, system font, no chrome or animations.
const WatchView = () => {
  const { emailId } = useParams();
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth();

  const [emails, setEmails] = useState(null); // null = loading
  const [selected, setSelected] = useState(null); // email _id
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  const fetchList = useCallback(
    async (signal) => {
      try {
        const response = await api.get(`/api/emails-list/${emailId}`, {
          params: { page: 1, limit: LIST_LIMIT, sortBy: "date", sortOrder: "desc" },
          signal,
        });
        setEmails(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        if (isCanceled(err)) return;
        if (err.response?.status === 404) {
          setEmails([]);
          setError(null);
        } else {
          setError("Could not load inbox");
        }
      }
    },
    [emailId]
  );

  // List load + slow poll (SSE is overkill for a wrist glance).
  useEffect(() => {
    if (!token || !emailId) return undefined;

    const controller = new AbortController();
    setEmails(null);
    setSelected(null);
    fetchList(controller.signal);
    const timer = setInterval(() => fetchList(controller.signal), POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [token, emailId, fetchList]);

  // Detail load on tap.
  useEffect(() => {
    if (!token || !emailId || !selected) return undefined;

    const controller = new AbortController();
    setDetail(null);

    api
      .get(`/api/email/${emailId}/${selected}`, { signal: controller.signal })
      .then((response) => setDetail(response.data?.[0] || null))
      .catch((err) => {
        if (!isCanceled(err)) setDetail({ error: true });
      });

    return () => controller.abort();
  }, [token, emailId, selected]);

  let content;

  if (authLoading) {
    content = <CenteredNote>Loading…</CenteredNote>;
  } else if (!token) {
    content = <CenteredNote>Open TrashMail on your phone to sign in first.</CenteredNote>;
  } else if (!emailId) {
    const recent = getRecentInboxes();
    content = (
      <div className="flex flex-col">
        <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-faint">Recent inboxes</p>
        {recent.length === 0 && <CenteredNote>No recent inboxes. Open one on your phone first.</CenteredNote>}
        {recent.map((address) => (
          <TapRow key={address} onClick={() => navigate(`/watch/${address}`)} className="border-b border-hairline">
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{address}</span>
          </TapRow>
        ))}
      </div>
    );
  } else if (selected) {
    const bodyText = detail && !detail.error ? detail.text || htmlToText(detail.html) : "";
    const otp = detail && !detail.error ? extractOtp([detail.subject, bodyText]) : null;
    content = (
      <div className="flex flex-col">
        <TapRow onClick={() => setSelected(null)} className="border-b border-hairline text-sm font-semibold text-accent">
          ‹ Back
        </TapRow>
        {!detail ? (
          <CenteredNote>Loading…</CenteredNote>
        ) : detail.error ? (
          <CenteredNote>Could not load this email.</CenteredNote>
        ) : (
          <div className="px-3 py-2">
            <p className="text-[13px] font-semibold leading-snug text-ink">{detail.subject || "No subject"}</p>
            <p className="mt-0.5 text-[11px] text-faint">
              {senderName(detail.from)} · {formatRelativeTime(detail.date)}
            </p>
            {otp && <OtpButton code={otp} />}
            <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-muted">{bodyText.trim() || "No text content"}</p>
          </div>
        )}
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col">
        {emails === null ? (
          <CenteredNote>Loading…</CenteredNote>
        ) : error ? (
          <CenteredNote>{error}</CenteredNote>
        ) : emails.length === 0 ? (
          <CenteredNote>No emails yet. Waiting for mail…</CenteredNote>
        ) : (
          emails.map((email) => {
            const otp = extractOtp(email.subject, { requireKeyword: true });
            return (
              <TapRow key={email._id} onClick={() => setSelected(email._id)} className="border-b border-hairline py-2">
                <span className="min-w-0 flex-1">
                  <span className={cx("block truncate text-[13px] leading-tight", email.readStatus ? "text-muted" : "font-semibold text-ink")}>
                    {senderName(email.from)}
                  </span>
                  <span className="block truncate text-[12px] leading-tight text-faint">{email.subject || "No subject"}</span>
                </span>
                <span className="shrink-0 text-right">
                  {otp && <span className="block font-mono text-[12px] font-bold text-accent tabular-nums">{otp}</span>}
                  <span className="block text-[10px] text-faint tabular-nums">{formatRelativeTime(email.date)}</span>
                </span>
              </TapRow>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="dark min-h-dvh bg-base text-ink" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <header className="flex min-h-11 items-center border-b border-hairline">
        {emailId ? (
          <TapRow onClick={() => navigate("/watch")}>
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-accent">{emailId}</span>
          </TapRow>
        ) : (
          <Link to="/" className="flex min-h-11 w-full items-center px-3 text-[12px] font-semibold text-accent focus-ring">
            TrashMail
          </Link>
        )}
      </header>
      {content}
    </div>
  );
};

export default WatchView;
