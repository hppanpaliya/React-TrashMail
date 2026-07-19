import { useEffect, useState } from "react";
import { useSnackbar } from "../../../context/SnackbarContext";
import api from "../../../api";
import Input from "../../ui/Input";
import Button from "../../ui/Button";
import Skeleton from "../../ui/Skeleton";

const SettingsTab = () => {
  const showSnackbar = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retention, setRetention] = useState("");
  const [source, setSource] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/api/admin/settings");
        if (cancelled) return;
        setRetention(String(res.data.emailRetentionDays));
        setSource(res.data.source);
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const days = parseInt(retention, 10);
  const valid = Number.isInteger(days) && days >= 1 && days <= 3650;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/api/admin/settings", { emailRetentionDays: days });
      setSource("db");
      showSnackbar("Settings saved", "success");
    } catch (err) {
      console.error(err);
      showSnackbar(err.response?.data?.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass max-w-xl rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-ink">Email Retention</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        Emails older than this many days are deleted by the nightly cleanup job (along with their attachments).
      </p>
      {loading ? (
        <Skeleton className="mt-4 h-10 w-40" />
      ) : (
        <>
          <div className="mt-4 flex items-end gap-2">
            <Input
              label="Retention (days)"
              type="number"
              min={1}
              max={3650}
              value={retention}
              onChange={(event) => setRetention(event.target.value)}
              className="w-40"
            />
            <Button variant="primary" disabled={!valid || saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
          {!valid && retention !== "" && <p className="mt-2 text-xs text-danger">Must be an integer between 1 and 3650.</p>}
          <p className="mt-3 text-xs text-faint">
            {source === "db"
              ? "Currently using the value saved here (overrides the EMAIL_RETENTION_DAYS environment variable)."
              : "Currently using the EMAIL_RETENTION_DAYS environment default. Saving stores an override in the database."}
          </p>
        </>
      )}
    </div>
  );
};

export default SettingsTab;
