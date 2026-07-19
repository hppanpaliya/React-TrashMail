import useAdminTable from "../../../hooks/useAdminTable";
import DataTable from "../../common/DataTable";
import { InboxLink, formatDate } from "./shared";

const topEmailColumns = [
  { id: "_id", label: "Email Address", sortable: true, format: (value) => <InboxLink to={`/inbox/${value}`}>{value}</InboxLink> },
  { id: "count", label: "Email Count", sortable: true },
  { id: "lastEmailDate", label: "Last Email", sortable: true, format: formatDate },
];

const TopEmailsTab = () => {
  const { tableProps } = useAdminTable("/api/admin/top-emails", { initialSortBy: "count" });

  return <DataTable columns={topEmailColumns} {...tableProps} noDataMessage="No emails found" hidePagination />;
};

export default TopEmailsTab;
