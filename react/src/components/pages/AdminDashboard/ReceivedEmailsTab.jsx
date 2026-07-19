import { useEffect } from "react";
import useAdminTable from "../../../hooks/useAdminTable";
import DataTable from "../../common/DataTable";
import Chip from "../../ui/Chip";
import { TableSearch, emailColumns } from "./shared";

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

const ReceivedEmailsTab = ({ subscribeSSE }) => {
  const { tableProps, prepend, search, setSearch } = useAdminTable("/api/admin/received-emails");

  useEffect(() => subscribeSSE("NEW_EMAIL", prepend), [subscribeSSE, prepend]);

  return (
    <div>
      <TableSearch value={search} onChange={setSearch} placeholder="Search received emails…" />
      <DataTable columns={receivedEmailColumns} {...tableProps} noDataMessage="No received emails found" />
    </div>
  );
};

export default ReceivedEmailsTab;
