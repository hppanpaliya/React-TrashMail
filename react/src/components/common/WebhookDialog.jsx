import { useEffect, useState } from "react";
import { Webhook, Send, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import Dialog from "../ui/Dialog";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Switch from "../ui/Switch";
import Spinner from "../ui/Spinner";
import api, { isCanceled } from "../../api";
import { useSnackbar } from "../../context/SnackbarContext";
import { formatAbsoluteTime, formatRelativeTime } from "../../utils/time";

const EMPTY_FORM = { url: "", secret: "", enabled: true };

// Client-side sanity check only; the backend keeps the real SSRF protection.
// https is required except for localhost (self-host/testing convenience).
const validateWebhookUrl = (raw) => {
  const value = raw.trim();
  if (!value) return "Please enter a webhook URL";
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return "Enter a valid URL (e.g. https://example.com/hooks/trashmail)";
  }
  const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLocalhost)) {
    return "Webhook URL must use https://";
  }
  return null;
};

// Per-inbox webhook settings. GET 404 means "not configured" → empty form.
const WebhookDialog = ({ open, onClose, emailId }) => {
  const showSnackbar = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [hasSecret, setHasSecret] = useState(false);
  const [status, setStatus] = useState(null); // { lastStatus, lastError, lastDeliveredAt }
  const [testResult, setTestResult] = useState(null); // { ok, status?, error? }
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const controller = new AbortController();
    setLoading(true);
    setTestResult(null);
    setUnavailable(false);

    api
      .get(`/api/webhooks/${emailId}`, { signal: controller.signal })
      .then((response) => {
        const { url, enabled, hasSecret: secretSet, lastStatus, lastError, lastDeliveredAt } = response.data || {};
        setConfigured(true);
        setForm({ url: url || "", secret: "", enabled: Boolean(enabled) });
        setHasSecret(Boolean(secretSet));
        setStatus({ lastStatus, lastError, lastDeliveredAt });
        setLoading(false);
      })
      .catch((error) => {
        if (isCanceled(error)) return;
        if (error.response?.status === 404) {
          // Not configured yet — start from an empty form.
          setConfigured(false);
          setForm(EMPTY_FORM);
          setHasSecret(false);
          setStatus(null);
        } else {
          setUnavailable(true);
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, [open, emailId]);

  const handleSave = async () => {
    const url = form.url.trim();
    const urlError = validateWebhookUrl(url);
    if (urlError) {
      showSnackbar(urlError, "warning");
      return;
    }
    setSaving(true);
    try {
      const body = { url, enabled: form.enabled };
      if (form.secret) body.secret = form.secret;
      await api.put(`/api/webhooks/${emailId}`, body);
      setConfigured(true);
      if (form.secret) setHasSecret(true);
      setForm((prev) => ({ ...prev, secret: "" }));
      showSnackbar("Webhook saved", "success");
    } catch (error) {
      console.error("Error saving webhook:", error);
      showSnackbar("Failed to save webhook", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/api/webhooks/${emailId}`);
      setConfigured(false);
      setForm(EMPTY_FORM);
      setHasSecret(false);
      setStatus(null);
      setTestResult(null);
      showSnackbar("Webhook removed", "success");
    } catch (error) {
      console.error("Error deleting webhook:", error);
      showSnackbar("Failed to remove webhook", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await api.post(`/api/webhooks/${emailId}/test`);
      setTestResult(response.data || { ok: false, error: "No response" });
    } catch (error) {
      setTestResult({ ok: false, error: error.response?.data?.error || "Test request failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Webhook" maxWidth="max-w-md">
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : unavailable ? (
        <p className="py-4 text-sm text-muted">Webhooks aren&apos;t available on this server yet.</p>
      ) : (
        <div className="flex flex-col gap-4 pt-1">
          <p className="text-[13px] leading-relaxed text-muted">
            POST each new email for <span className="break-all font-medium text-ink">{emailId}</span> to your endpoint.
          </p>

          <Input
            label="Webhook URL"
            type="url"
            placeholder="https://example.com/hooks/trashmail"
            icon={Webhook}
            value={form.url}
            onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
          />

          <Input
            label={hasSecret ? "Signing secret (set — leave blank to keep)" : "Signing secret (optional)"}
            type="password"
            placeholder={hasSecret ? "••••••••" : "shared secret"}
            autoComplete="off"
            value={form.secret}
            onChange={(event) => setForm((prev) => ({ ...prev, secret: event.target.value }))}
          />

          <Switch checked={form.enabled} onChange={(enabled) => setForm((prev) => ({ ...prev, enabled }))} label="Deliveries enabled" />

          {status && (status.lastStatus != null || status.lastError || status.lastDeliveredAt) && (
            <div className="rounded-xl border border-hairline bg-raised px-3 py-2.5 text-xs text-muted">
              <p className="font-medium text-ink">Last delivery</p>
              {status.lastDeliveredAt && (
                <p className="mt-1 tabular-nums" title={formatAbsoluteTime(status.lastDeliveredAt)}>
                  {formatRelativeTime(status.lastDeliveredAt)}
                </p>
              )}
              {status.lastStatus != null && <p className="mt-0.5 tabular-nums">HTTP {status.lastStatus}</p>}
              {status.lastError && <p className="mt-0.5 break-words text-danger">{status.lastError}</p>}
            </div>
          )}

          {testResult && (
            <div
              role="status"
              className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[13px] ${
                testResult.ok ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span className="break-words">
                {testResult.ok
                  ? `Test delivery succeeded${testResult.status ? ` (HTTP ${testResult.status})` : ""}`
                  : `Test failed${testResult.status ? ` (HTTP ${testResult.status})` : ""}${testResult.error ? `: ${testResult.error}` : ""}`}
              </span>
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            {configured ? (
              <Button variant="dangerOutline" size="sm" onClick={handleDelete} disabled={saving}>
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Remove
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing || !configured}>
                <Send aria-hidden="true" className="h-4 w-4" />
                {testing ? "Testing…" : "Send test"}
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default WebhookDialog;
