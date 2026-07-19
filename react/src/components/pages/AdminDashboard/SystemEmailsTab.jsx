import useAdminTable from "../../../hooks/useAdminTable";
import DataTable from "../../common/DataTable";
import { TableSearch, emailColumns } from "./shared";

const SystemEmailsTab = () => {
  const { tableProps, search, setSearch } = useAdminTable("/api/admin/system-emails");

  return (
    <div>
      <TableSearch value={search} onChange={setSearch} placeholder="Search system emails…" />
      <DataTable columns={emailColumns} {...tableProps} noDataMessage="No system emails found" />
    </div>
  );
};

export default SystemEmailsTab;
