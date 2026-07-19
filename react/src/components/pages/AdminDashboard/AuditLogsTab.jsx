import { useEffect, useState } from "react";
import { useSnackbar } from "../../../context/SnackbarContext";
import api from "../../../api";
import useAdminTable from "../../../hooks/useAdminTable";
import DataTable from "../../common/DataTable";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import Chip from "../../ui/Chip";
import Dialog from "../../ui/Dialog";
import { TableSearch, formatDate } from "./shared";

const logColumns = [
  { id: "timestamp", label: "Time", sortable: true, format: formatDate },
  { id: "userId", label: "User ID", sortable: true },
  {
    id: "role",
    label: "Role",
    sortable: true,
    format: (value) => <Chip tone={value === "admin" ? "accent" : "neutral"}>{value}</Chip>,
  },
  { id: "action", label: "Action", sortable: true },
  { id: "details", label: "Details", format: (value) => <span className="break-all font-mono text-[11px]">{JSON.stringify(value)}</span> },
];

const AuditLogsTab = ({ subscribeSSE }) => {
  const showSnackbar = useSnackbar();
  const { tableProps, refresh, prepend, search, setSearch } = useAdminTable("/api/admin/logs", { initialSortBy: "timestamp" });

  const [openClearLogs, setOpenClearLogs] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => subscribeSSE("NEW_LOG", prepend), [subscribeSSE, prepend]);

  const clearingAll = retentionDays === "ALL";

  const handleClearLogs = async () => {
    try {
      const response = await api.delete("/api/admin/logs", {
        data: clearingAll ? { retentionDays: null, confirmDeleteAll: true } : { retentionDays },
      });
      showSnackbar(response.data.message, "success");
      setOpenClearLogs(false);
      setConfirmText("");
      refresh();
    } catch (error) {
      console.error("Error clearing logs:", error);
      showSnackbar("Failed to clear logs", "error");
    }
  };

  return (
    <div>
      <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start">
        <TableSearch value={search} onChange={setSearch} placeholder="Search logs…" />
        <Button variant="dangerOutline" onClick={() => setOpenClearLogs(true)}>
          Clear Logs
        </Button>
      </div>
      <DataTable columns={logColumns} {...tableProps} noDataMessage="No logs found" />

      <Dialog
        open={openClearLogs}
        onClose={() => {
          setOpenClearLogs(false);
          setConfirmText("");
        }}
        title="Clear Audit Logs"
        maxWidth="max-w-md"
      >
        <p className="text-[13px] leading-relaxed text-muted">Select retention period. Logs older than this will be permanently deleted.</p>
        <Select
          label="Retention Period"
          value={retentionDays}
          onChange={(event) => setRetentionDays(event.target.value === "ALL" ? "ALL" : parseInt(event.target.value, 10))}
          options={[
            { value: 30, label: "Older than 30 Days" },
            { value: 7, label: "Older than 7 Days" },
            { value: 1, label: "Older than 24 Hours" },
            { value: "ALL", label: "Clear All Logs" },
          ]}
          className="mt-4"
        />
        {clearingAll && (
          <Input
            label='Deleting the entire audit trail. Type "DELETE" to confirm.'
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder="DELETE"
            className="mt-4"
          />
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setOpenClearLogs(false);
              setConfirmText("");
            }}
          >
            Cancel
          </Button>
          <Button variant="danger" disabled={clearingAll && confirmText !== "DELETE"} onClick={handleClearLogs}>
            Clear Logs
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

export default AuditLogsTab;
