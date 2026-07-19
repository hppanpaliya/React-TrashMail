import { useState } from "react";
import { Copy } from "lucide-react";
import { useSnackbar } from "../../../context/SnackbarContext";
import api from "../../../api";
import { copyText } from "../../../utils/clipboard";
import useAdminTable from "../../../hooks/useAdminTable";
import DataTable from "../../common/DataTable";
import ConfirmModal from "../../common/ConfirmModal";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import Chip from "../../ui/Chip";
import IconButton from "../../ui/IconButton";
import { TableSearch, formatDate } from "./shared";

const EXPIRY_OPTIONS = [
  { value: "", label: "Never expires" },
  { value: "7", label: "Expires in 7 days" },
  { value: "30", label: "Expires in 30 days" },
  { value: "90", label: "Expires in 90 days" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All invites" },
  { value: "unused", label: "Unused" },
  { value: "used", label: "Used" },
  { value: "expired", label: "Expired" },
];

const InvitesTab = () => {
  const showSnackbar = useSnackbar();
  const [status, setStatus] = useState("all");
  const { tableProps, refresh, search, setSearch } = useAdminTable("/api/admin/invites", {
    initialSortBy: "createdAt",
    extraParams: { status },
  });

  const [inviteRole, setInviteRole] = useState("user");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const handleGenerateInvite = async () => {
    try {
      const body = { role: inviteRole };
      if (expiresInDays) body.expiresInDays = parseInt(expiresInDays, 10);
      const res = await api.post("/api/admin/invites", body);
      setGeneratedInvite(res.data);
      refresh();
    } catch (err) {
      console.error(err);
      showSnackbar("Failed to generate invite", "error");
    }
  };

  const handleCopy = async (code) => {
    const ok = await copyText(code);
    showSnackbar(ok ? "Invite code copied" : "Copy failed", ok ? "success" : "error");
  };

  const handleRevoke = async () => {
    try {
      await api.delete(`/api/admin/invites/${revokeTarget._id}`);
      setRevokeTarget(null);
      refresh();
      showSnackbar("Invite revoked", "success");
    } catch (err) {
      console.error(err);
      showSnackbar(err.response?.data?.message || "Failed to revoke invite", "error");
    }
  };

  const inviteStatus = (row) => {
    if (row.used) return <Chip tone="neutral">Used</Chip>;
    if (row.expired) return <Chip tone="warning">Expired</Chip>;
    return <Chip tone="success">Active</Chip>;
  };

  const inviteColumns = [
    {
      id: "code",
      label: "Code",
      format: (value) => (
        <span className="inline-flex max-w-full items-center gap-1">
          <span className="truncate font-mono text-[11px]" title={value}>
            {value}
          </span>
          <IconButton label="Copy invite code" size="sm" onClick={() => handleCopy(value)}>
            <Copy />
          </IconButton>
        </span>
      ),
    },
    {
      id: "role",
      label: "Role",
      sortable: true,
      format: (value) => <Chip tone={value === "admin" ? "accent" : "neutral"}>{value}</Chip>,
    },
    { id: "used", label: "Status", sortable: true, format: (value, row) => inviteStatus(row) },
    { id: "createdByUsername", label: "Created By", format: (value) => value || "—" },
    { id: "usedByUsername", label: "Used By", format: (value) => value || "—" },
    { id: "createdAt", label: "Created", sortable: true, format: formatDate },
    { id: "expiresAt", label: "Expires", sortable: true, format: (value) => (value ? formatDate(value) : "Never") },
    {
      id: "actions",
      label: "Actions",
      format: (value, row) =>
        row.used ? null : (
          <Button size="sm" variant="dangerOutline" onClick={() => setRevokeTarget(row)}>
            Revoke
          </Button>
        ),
    },
  ];

  return (
    <div>
      {/* Create panel */}
      <div className="glass mb-4 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-ink">Generate New Invite</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <Select
            label="Role"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value)}
            options={[
              { value: "user", label: "User" },
              { value: "admin", label: "Admin" },
            ]}
            className="sm:w-40"
          />
          <Select
            label="Expiry"
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(event.target.value)}
            options={EXPIRY_OPTIONS}
            className="sm:w-48"
          />
          <Button variant="primary" onClick={handleGenerateInvite}>
            Generate Code
          </Button>
        </div>

        {generatedInvite && (
          <div className="mt-4 rounded-xl border border-hairline bg-raised p-4">
            <p className="text-xs text-muted">Generated Code:</p>
            <div className="my-2 flex items-center gap-2">
              <p className="break-all font-mono text-sm font-bold text-ink">{generatedInvite.code}</p>
              <IconButton label="Copy invite code" size="sm" onClick={() => handleCopy(generatedInvite.code)}>
                <Copy />
              </IconButton>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="accent">{generatedInvite.role}</Chip>
              <span className="text-xs text-muted">
                {generatedInvite.expiresAt ? `Expires ${formatDate(generatedInvite.expiresAt)}` : "Never expires"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Invite list */}
      <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start">
        <TableSearch value={search} onChange={setSearch} placeholder="Search invite codes…" />
        <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} options={STATUS_OPTIONS} className="sm:w-40" />
      </div>
      <DataTable columns={inviteColumns} {...tableProps} noDataMessage="No invites found" />

      <ConfirmModal
        open={!!revokeTarget}
        setOpen={(open) => !open && setRevokeTarget(null)}
        title="Revoke Invite"
        body={`Delete this unused invite code? Anyone holding it will no longer be able to sign up.`}
        confirmText="Revoke"
        cancelText="Cancel"
        onConfirm={handleRevoke}
      />
    </div>
  );
};

export default InvitesTab;
