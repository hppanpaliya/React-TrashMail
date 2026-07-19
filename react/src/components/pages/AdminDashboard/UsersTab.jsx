import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useSnackbar } from "../../../context/SnackbarContext";
import api from "../../../api";
import useAdminTable from "../../../hooks/useAdminTable";
import DataTable from "../../common/DataTable";
import ConfirmModal from "../../common/ConfirmModal";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import Chip from "../../ui/Chip";
import Dialog from "../../ui/Dialog";
import { TableSearch } from "./shared";

const UsersTab = () => {
  const { user: me } = useAuth();
  const showSnackbar = useSnackbar();
  const { tableProps, refresh, search, setSearch } = useAdminTable("/api/auth/users", {
    initialSortBy: "username",
    initialSortOrder: "asc",
  });

  const [editUser, setEditUser] = useState(null);
  const [domainInput, setDomainInput] = useState("");
  const [roleUser, setRoleUser] = useState(null);
  const [roleValue, setRoleValue] = useState("user");
  const [statusUser, setStatusUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const isSelf = (row) => me && String(row._id) === String(me._id || me.id);

  const handleEditDomains = (row) => {
    setEditUser(row);
    setDomainInput(row.allowedDomains === "*" ? "*" : row.allowedDomains ? row.allowedDomains.join(", ") : "");
  };

  const handleSaveDomains = async () => {
    try {
      let domains;
      if (domainInput.trim() === "*") {
        domains = "*";
      } else {
        domains = domainInput.trim() === "" ? null : domainInput.split(",").map((d) => d.trim());
      }
      await api.put(`/api/admin/users/${editUser._id}/domains`, { allowedDomains: domains });
      setEditUser(null);
      refresh();
      showSnackbar("User domains updated", "success");
    } catch (err) {
      console.error(err);
      showSnackbar("Failed to update user", "error");
    }
  };

  const handleSaveRole = async () => {
    try {
      await api.put(`/api/admin/users/${roleUser._id}/role`, { role: roleValue });
      setRoleUser(null);
      refresh();
      showSnackbar("User role updated", "success");
    } catch (err) {
      console.error(err);
      showSnackbar(err.response?.data?.message || "Failed to update role", "error");
    }
  };

  const handleToggleStatus = async () => {
    try {
      await api.put(`/api/admin/users/${statusUser._id}/status`, { disabled: !statusUser.disabled });
      setStatusUser(null);
      refresh();
      showSnackbar(`User ${statusUser.disabled ? "enabled" : "disabled"}`, "success");
    } catch (err) {
      console.error(err);
      showSnackbar(err.response?.data?.message || "Failed to update status", "error");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/admin/users/${deleteUser._id}`);
      setDeleteUser(null);
      setDeleteConfirm("");
      refresh();
      showSnackbar("User deleted", "success");
    } catch (err) {
      console.error(err);
      showSnackbar(err.response?.data?.message || "Failed to delete user", "error");
    }
  };

  const userColumns = [
    {
      id: "username",
      label: "Username",
      sortable: true,
      format: (value, row) => (
        <span className="inline-flex items-center gap-2">
          {value}
          {row.disabled && <Chip tone="danger">Disabled</Chip>}
        </span>
      ),
    },
    {
      id: "role",
      label: "Role",
      sortable: true,
      format: (value) => <Chip tone={value === "admin" ? "accent" : "neutral"}>{value || "user"}</Chip>,
    },
    {
      id: "allowedDomains",
      label: "Allowed Domains",
      format: (value) => (value === "*" ? <Chip tone="accent">All Domains</Chip> : value ? value.join(", ") : <Chip>Global Default</Chip>),
    },
    {
      id: "actions",
      label: "Actions",
      format: (value, row) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => handleEditDomains(row)}>
            Domains
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isSelf(row)}
            onClick={() => {
              setRoleUser(row);
              setRoleValue(row.role || "user");
            }}
          >
            Role
          </Button>
          <Button size="sm" variant="outline" disabled={isSelf(row)} onClick={() => setStatusUser(row)}>
            {row.disabled ? "Enable" : "Disable"}
          </Button>
          <Button
            size="sm"
            variant="dangerOutline"
            disabled={isSelf(row)}
            onClick={() => {
              setDeleteUser(row);
              setDeleteConfirm("");
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <TableSearch value={search} onChange={setSearch} placeholder="Search users…" />
      <DataTable columns={userColumns} {...tableProps} noDataMessage="No users found" />

      {/* Edit domains */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} title="Edit User Domains" maxWidth="max-w-md">
        <p className="text-[13px] leading-relaxed text-muted">
          Enter comma-separated domains (e.g., &quot;example.com, test.com&quot;). Use * for all domains. Leave empty to use global defaults.
        </p>
        <Input label="Allowed Domains" value={domainInput} onChange={(event) => setDomainInput(event.target.value)} className="mt-4" />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditUser(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveDomains}>
            Save
          </Button>
        </div>
      </Dialog>

      {/* Change role */}
      <Dialog open={!!roleUser} onClose={() => setRoleUser(null)} title={`Change Role — ${roleUser?.username || ""}`} maxWidth="max-w-sm">
        <Select
          label="Role"
          value={roleValue}
          onChange={(event) => setRoleValue(event.target.value)}
          options={[
            { value: "user", label: "User" },
            { value: "admin", label: "Admin" },
          ]}
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRoleUser(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveRole}>
            Save
          </Button>
        </div>
      </Dialog>

      {/* Enable / disable */}
      <ConfirmModal
        open={!!statusUser}
        setOpen={(open) => !open && setStatusUser(null)}
        title={statusUser?.disabled ? "Enable User" : "Disable User"}
        body={
          statusUser?.disabled
            ? `Re-enable "${statusUser?.username}"? They will be able to sign in again.`
            : `Disable "${statusUser?.username}"? They will be signed out and unable to sign in until re-enabled.`
        }
        confirmText={statusUser?.disabled ? "Enable" : "Disable"}
        cancelText="Cancel"
        onConfirm={handleToggleStatus}
      />

      {/* Delete (type username to confirm) */}
      <Dialog
        open={!!deleteUser}
        onClose={() => {
          setDeleteUser(null);
          setDeleteConfirm("");
        }}
        title="Delete User"
        maxWidth="max-w-md"
      >
        <p className="text-[13px] leading-relaxed text-muted">
          Permanently delete <span className="font-semibold text-ink">{deleteUser?.username}</span>. This cannot be undone. Audit history is
          retained. Type the username to confirm.
        </p>
        <Input
          label="Username"
          value={deleteConfirm}
          onChange={(event) => setDeleteConfirm(event.target.value)}
          placeholder={deleteUser?.username}
          className="mt-4"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setDeleteUser(null);
              setDeleteConfirm("");
            }}
          >
            Cancel
          </Button>
          <Button variant="danger" disabled={deleteConfirm !== deleteUser?.username} onClick={handleDelete}>
            Delete User
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

export default UsersTab;
