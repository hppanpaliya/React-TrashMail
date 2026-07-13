import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useSnackbar } from "../../../context/SnackbarContext";
import { env } from "../../../env";
import api from "../../../api";
import DataTable from "../../common/DataTable";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import Chip from "../../ui/Chip";
import Dialog from "../../ui/Dialog";
import { cx } from "../../../utils/cx";

const TABS = ["Audit Logs", "Conflicts", "Users", "Invites", "System Emails", "Received Emails", "Top Emails", "Attachments"];

const useTableState = (initialSortBy = "timestamp") => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading] = useState(false);

  return {
    data,
    setData,
    total,
    setTotal,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    loading,
    setLoading,
  };
};

const InboxLink = ({ to, children }) => (
  <Link to={to} target="_blank" className="break-all text-accent hover:underline focus-ring rounded">
    {children}
  </Link>
);

const AdminDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const { token } = useAuth();
  const showSnackbar = useSnackbar();

  // State for each tab
  const logsState = useTableState("timestamp");
  const conflictsState = useTableState("lastAccess");
  const usersState = useTableState("username");
  const systemEmailsState = useTableState("date");
  const receivedEmailsState = useTableState("date");
  const topEmailsState = useTableState("count");
  const attachmentsState = useTableState("date");

  // User Edit State
  const [editUser, setEditUser] = useState(null);
  const [domainInput, setDomainInput] = useState("");

  // Invite Generation State
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [inviteRole, setInviteRole] = useState("user");

  // Clear Logs State
  const [openClearLogs, setOpenClearLogs] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);

  // SSE Connection
  useEffect(() => {
    let eventSource;
    if (token) {
      eventSource = new EventSource(`${env.REACT_APP_API_URL}/api/admin/sse/logs?token=${token}`);

      eventSource.onmessage = (event) => {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "NEW_LOG") {
          // Prepend new log if we are on the first page and not searching
          if (logsState.page === 0 && !logsState.search) {
            logsState.setData((prev) => [parsed.data, ...prev].slice(0, logsState.rowsPerPage));
            logsState.setTotal((prev) => prev + 1);
          }
        } else if (parsed.type === "NEW_EMAIL") {
          // Prepend new email if we are on the first page and not searching
          if (receivedEmailsState.page === 0 && !receivedEmailsState.search) {
            receivedEmailsState.setData((prev) => [parsed.data, ...prev].slice(0, receivedEmailsState.rowsPerPage));
            receivedEmailsState.setTotal((prev) => prev + 1);
          }
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE Error:", err);
        eventSource.close();
      };
    }
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [token, logsState, receivedEmailsState]);

  const fetchData = useCallback(async (endpoint, stateObj) => {
    stateObj.setLoading(true);
    try {
      const res = await api.get(endpoint, {
        params: {
          page: stateObj.page + 1,
          limit: stateObj.rowsPerPage,
          search: stateObj.search,
          sortBy: stateObj.sortBy,
          sortOrder: stateObj.sortOrder,
        },
      });

      if (res.data.logs) {
        stateObj.setData(res.data.logs);
        stateObj.setTotal(res.data.total);
      } else if (res.data.emails && res.data.total) {
        stateObj.setData(res.data.emails);
        stateObj.setTotal(res.data.total);
      } else if (res.data.emails && !res.data.total) {
        // For top-emails endpoint
        stateObj.setData(res.data.emails);
        stateObj.setTotal(res.data.total || res.data.emails.length);
      } else if (res.data.conflicts) {
        stateObj.setData(res.data.conflicts);
        stateObj.setTotal(res.data.total);
      } else if (res.data.users) {
        stateObj.setData(res.data.users);
        stateObj.setTotal(res.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      stateObj.setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tabValue === 0) fetchData("/api/admin/logs", logsState);
    if (tabValue === 1) fetchData("/api/admin/conflicts", conflictsState);
    if (tabValue === 2) fetchData("/api/auth/users", usersState);
    if (tabValue === 4) fetchData("/api/admin/system-emails", systemEmailsState);
    if (tabValue === 5) fetchData("/api/admin/received-emails", receivedEmailsState);
    if (tabValue === 6) fetchData("/api/admin/top-emails", topEmailsState);
    if (tabValue === 7) fetchData("/api/admin/emails-with-attachments", attachmentsState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tabValue,
    fetchData,
    logsState.page,
    logsState.rowsPerPage,
    logsState.search,
    logsState.sortBy,
    logsState.sortOrder,
    conflictsState.page,
    conflictsState.rowsPerPage,
    conflictsState.search,
    conflictsState.sortBy,
    conflictsState.sortOrder,
    usersState.page,
    usersState.rowsPerPage,
    usersState.search,
    usersState.sortBy,
    usersState.sortOrder,
    systemEmailsState.page,
    systemEmailsState.rowsPerPage,
    systemEmailsState.search,
    systemEmailsState.sortBy,
    systemEmailsState.sortOrder,
    receivedEmailsState.page,
    receivedEmailsState.rowsPerPage,
    receivedEmailsState.search,
    receivedEmailsState.sortBy,
    receivedEmailsState.sortOrder,
    attachmentsState.page,
    attachmentsState.rowsPerPage,
    attachmentsState.search,
    attachmentsState.sortBy,
    attachmentsState.sortOrder,
  ]);

  const handleGenerateInvite = async () => {
    try {
      const res = await api.post(`/api/admin/invites`, { role: inviteRole });
      setGeneratedInvite(res.data);
    } catch (err) {
      console.error(err);
      showSnackbar("Failed to generate invite", "error");
    }
  };

  const handleClearLogs = async () => {
    try {
      const response = await api.delete(`/api/admin/logs`, {
        data: { retentionDays: retentionDays === "ALL" ? null : retentionDays },
      });
      showSnackbar(response.data.message, "success");
      setOpenClearLogs(false);
      fetchData("/api/admin/logs", logsState); // Refresh logs
    } catch (error) {
      console.error("Error clearing logs:", error);
      showSnackbar("Failed to clear logs", "error");
    }
  };

  const handleEditUser = (user) => {
    setEditUser(user);
    setDomainInput(user.allowedDomains === "*" ? "*" : user.allowedDomains ? user.allowedDomains.join(", ") : "");
  };

  const handleDeleteEmail = async (email) => {
    if (!window.confirm(`Are you sure you want to delete this email: "${email.subject}"?`)) {
      return;
    }

    try {
      await api.delete(`/api/email/${email.emailId}/${email._id}`);

      // Refresh the attachments data
      fetchData("/api/admin/emails-with-attachments", attachmentsState);
      showSnackbar("Email deleted successfully", "success");
    } catch (err) {
      console.error(err);
      showSnackbar("Failed to delete email", "error");
    }
  };

  const handleSaveUser = async () => {
    try {
      let domains;
      if (domainInput.trim() === "*") {
        domains = "*";
      } else {
        domains = domainInput.trim() === "" ? null : domainInput.split(",").map((d) => d.trim());
      }

      await api.put(`/api/admin/users/${editUser._id}/domains`, { allowedDomains: domains });

      setEditUser(null);
      fetchData("/api/auth/users", usersState);
    } catch (err) {
      console.error(err);
      showSnackbar("Failed to update user", "error");
    }
  };

  // Columns Definitions
  const logColumns = [
    { id: "timestamp", label: "Time", sortable: true, format: (value) => new Date(value).toLocaleString() },
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

  const conflictColumns = [
    { id: "emailId", label: "Email ID", sortable: true, format: (value) => <InboxLink to={`/inbox/${value}`}>{value}</InboxLink> },
    { id: "accessCount", label: "Access Count", sortable: true },
    { id: "lastAccess", label: "Last Access", sortable: true, format: (value) => new Date(value).toLocaleString() },
    { id: "users", label: "Users Involved", format: (value) => value.join(", ") },
  ];

  const userColumns = [
    { id: "username", label: "Username", sortable: true },
    { id: "role", label: "Role", sortable: true, format: (value) => value || "user" },
    {
      id: "allowedDomains",
      label: "Allowed Domains",
      format: (value) => (value === "*" ? <Chip tone="accent">All Domains</Chip> : value ? value.join(", ") : <Chip>Global Default</Chip>),
    },
    {
      id: "actions",
      label: "Actions",
      format: (value, row) => (
        <Button size="sm" variant="outline" onClick={() => handleEditUser(row)}>
          Edit Domains
        </Button>
      ),
    },
  ];

  const emailColumns = [
    { id: "date", label: "Date", sortable: true, format: (value) => new Date(value).toLocaleString() },
    { id: "emailId", label: "To", sortable: true, format: (value) => <InboxLink to={`/inbox/${value}`}>{value}</InboxLink> },
    { id: "from", label: "From", sortable: true, format: (value) => value?.text || "" },
    {
      id: "subject",
      label: "Subject",
      sortable: true,
      format: (value, row) => <InboxLink to={`/inbox/${row.emailId}/${row._id}`}>{value}</InboxLink>,
    },
  ];

  const receivedEmailColumns = [
    ...emailColumns,
    {
      id: "accessedBy",
      label: "Accessed By",
      format: (value) =>
        value && value.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {value.map((user, i) => (
              <Chip key={i}>{user}</Chip>
            ))}
          </span>
        ) : (
          <span className="text-xs text-faint">Not Accessed</span>
        ),
    },
  ];

  const topEmailColumns = [
    { id: "_id", label: "Email Address", sortable: true, format: (value) => <InboxLink to={`/inbox/${value}`}>{value}</InboxLink> },
    { id: "count", label: "Email Count", sortable: true },
    { id: "lastEmailDate", label: "Last Email", sortable: true, format: (value) => new Date(value).toLocaleString() },
  ];

  const attachmentColumns = [
    ...emailColumns,
    { id: "attachmentCount", label: "Attachments", sortable: true },
    {
      id: "totalAttachmentSize",
      label: "Total Size",
      sortable: true,
      format: (value) => {
        if (value === 0) return "0 B";
        const units = ["B", "KB", "MB", "GB"];
        let size = value;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
      },
    },
    {
      id: "actions",
      label: "Actions",
      format: (value, row) => (
        <Button size="sm" variant="dangerOutline" onClick={() => handleDeleteEmail(row)}>
          Delete
        </Button>
      ),
    },
  ];

  const makeSortHandler = (stateObj) => (prop) => {
    const isAsc = stateObj.sortBy === prop && stateObj.sortOrder === "asc";
    stateObj.setSortOrder(isAsc ? "desc" : "asc");
    stateObj.setSortBy(prop);
  };

  const renderSearch = (stateObj, placeholder) => (
    <Input
      icon={Search}
      type="search"
      placeholder={placeholder}
      aria-label={placeholder}
      value={stateObj.search}
      onChange={(event) => stateObj.setSearch(event.target.value)}
      className="mb-3 flex-1"
    />
  );

  const renderTable = (stateObj, columns, noDataMessage) => (
    <DataTable
      columns={columns}
      data={stateObj.data}
      total={stateObj.total}
      page={stateObj.page}
      rowsPerPage={stateObj.rowsPerPage}
      onPageChange={stateObj.setPage}
      onRowsPerPageChange={stateObj.setRowsPerPage}
      sortBy={stateObj.sortBy}
      sortOrder={stateObj.sortOrder}
      onSort={makeSortHandler(stateObj)}
      loading={stateObj.loading}
      noDataMessage={noDataMessage}
    />
  );

  return (
    <div className="pt-2">
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Admin Dashboard</h1>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Admin sections"
        className="scrollbar-none -mx-4 mt-4 flex gap-1 overflow-x-auto border-b border-hairline px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((tab, index) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={tabValue === index}
            onClick={() => setTabValue(index)}
            className={cx(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors duration-150 focus-ring cursor-pointer",
              tabValue === index ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tabValue === 0 && (
          <div>
            <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start">
              {renderSearch(logsState, "Search logs…")}
              <Button variant="dangerOutline" onClick={() => setOpenClearLogs(true)}>
                Clear Logs
              </Button>
            </div>
            {renderTable(logsState, logColumns, "No logs found")}
          </div>
        )}

        {tabValue === 1 && (
          <div>
            {renderSearch(conflictsState, "Search conflicts…")}
            {renderTable(conflictsState, conflictColumns, "No conflicts found")}
          </div>
        )}

        {tabValue === 2 && (
          <div>
            {renderSearch(usersState, "Search users…")}
            {renderTable(usersState, userColumns, "No users found")}
          </div>
        )}

        {tabValue === 3 && (
          <div className="glass mx-auto mt-2 max-w-md rounded-2xl p-6 text-center">
            <h2 className="text-base font-semibold text-ink">Generate New Invite Code</h2>
            <Select
              label="Role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              options={[
                { value: "user", label: "User" },
                { value: "admin", label: "Admin" },
              ]}
              className="mt-4 text-left"
            />
            <Button variant="primary" onClick={handleGenerateInvite} className="mt-4 w-full">
              Generate Code
            </Button>

            {generatedInvite && (
              <div className="mt-6 rounded-xl border border-hairline bg-raised p-4">
                <p className="text-xs text-muted">Generated Code:</p>
                <p className="my-2 break-all font-mono text-xl font-bold text-ink">{generatedInvite.code}</p>
                <Chip tone="accent">{generatedInvite.role}</Chip>
              </div>
            )}
          </div>
        )}

        {tabValue === 4 && (
          <div>
            {renderSearch(systemEmailsState, "Search system emails…")}
            {renderTable(systemEmailsState, emailColumns, "No system emails found")}
          </div>
        )}

        {tabValue === 5 && (
          <div>
            {renderSearch(receivedEmailsState, "Search received emails…")}
            {renderTable(receivedEmailsState, receivedEmailColumns, "No received emails found")}
          </div>
        )}

        {tabValue === 6 && (
          <DataTable
            columns={topEmailColumns}
            data={topEmailsState.data}
            total={topEmailsState.total}
            page={topEmailsState.page}
            rowsPerPage={topEmailsState.rowsPerPage}
            onPageChange={topEmailsState.setPage}
            onRowsPerPageChange={topEmailsState.setRowsPerPage}
            sortBy={topEmailsState.sortBy}
            sortOrder={topEmailsState.sortOrder}
            onSort={makeSortHandler(topEmailsState)}
            loading={topEmailsState.loading}
            noDataMessage="No emails found"
            hidePagination
          />
        )}

        {tabValue === 7 && (
          <div>
            {renderSearch(attachmentsState, "Search emails with attachments…")}
            {renderTable(attachmentsState, attachmentColumns, "No emails with attachments found")}
          </div>
        )}
      </div>

      {/* Edit user domains */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} title="Edit User Domains" maxWidth="max-w-md">
        <p className="text-[13px] leading-relaxed text-muted">
          Enter comma-separated domains (e.g., &quot;example.com, test.com&quot;). Use * for all domains. Leave empty to use global defaults.
        </p>
        <Input label="Allowed Domains" value={domainInput} onChange={(event) => setDomainInput(event.target.value)} className="mt-4" />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditUser(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveUser}>
            Save
          </Button>
        </div>
      </Dialog>

      {/* Clear logs */}
      <Dialog open={openClearLogs} onClose={() => setOpenClearLogs(false)} title="Clear Audit Logs" maxWidth="max-w-md">
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
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpenClearLogs(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleClearLogs}>
            Clear Logs
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
