import useAdminTable from "../../../hooks/useAdminTable";
import DataTable from "../../common/DataTable";
import { InboxLink, TableSearch, formatDate } from "./shared";

const conflictColumns = [
  { id: "emailId", label: "Email ID", sortable: true, format: (value) => <InboxLink to={`/inbox/${value}`}>{value}</InboxLink> },
  { id: "accessCount", label: "Access Count", sortable: true },
  { id: "lastAccess", label: "Last Access", sortable: true, format: formatDate },
  { id: "users", label: "Users Involved", format: (value) => value.join(", ") },
];

const ConflictsTab = () => {
  const { tableProps, search, setSearch } = useAdminTable("/api/admin/conflicts", { initialSortBy: "lastAccess" });

  return (
    <div>
      <TableSearch value={search} onChange={setSearch} placeholder="Search conflicts…" />
      <DataTable columns={conflictColumns} {...tableProps} noDataMessage="No conflicts found" getRowKey={(row, i) => row.emailId ?? i} />
    </div>
  );
};

export default ConflictsTab;
