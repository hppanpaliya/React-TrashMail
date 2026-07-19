import { useState } from "react";
import { useSnackbar } from "../../../context/SnackbarContext";
import api from "../../../api";
import useAdminTable from "../../../hooks/useAdminTable";
import DataTable from "../../common/DataTable";
import ConfirmModal from "../../common/ConfirmModal";
import Button from "../../ui/Button";
import { TableSearch, emailColumns, formatBytes } from "./shared";

const AttachmentsTab = () => {
  const showSnackbar = useSnackbar();
  const { tableProps, refresh, search, setSearch } = useAdminTable("/api/admin/emails-with-attachments");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDeleteEmail = async () => {
    try {
      await api.delete(`/api/email/${deleteTarget.emailId}/${deleteTarget._id}`);
      setDeleteTarget(null);
      refresh();
      showSnackbar("Email deleted successfully", "success");
    } catch (err) {
      console.error(err);
      showSnackbar("Failed to delete email", "error");
    }
  };

  const attachmentColumns = [
    ...emailColumns,
    { id: "attachmentCount", label: "Attachments", sortable: true },
    { id: "totalAttachmentSize", label: "Total Size", sortable: true, format: formatBytes },
    {
      id: "actions",
      label: "Actions",
      format: (value, row) => (
        <Button size="sm" variant="dangerOutline" onClick={() => setDeleteTarget(row)}>
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div>
      <TableSearch value={search} onChange={setSearch} placeholder="Search emails with attachments…" />
      <DataTable columns={attachmentColumns} {...tableProps} noDataMessage="No emails with attachments found" />

      <ConfirmModal
        open={!!deleteTarget}
        setOpen={(open) => !open && setDeleteTarget(null)}
        title="Delete Email"
        body={`Delete "${deleteTarget?.subject}" and its attachments? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteEmail}
      />
    </div>
  );
};

export default AttachmentsTab;
