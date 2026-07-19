import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import Input from "../../ui/Input";

export const InboxLink = ({ to, children }) => (
  <Link to={to} target="_blank" className="break-all text-accent hover:underline focus-ring rounded">
    {children}
  </Link>
);

export const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

export const formatBytes = (value) => {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// Columns shared by every email-listing tab.
export const emailColumns = [
  { id: "date", label: "Date", sortable: true, format: formatDate },
  { id: "emailId", label: "To", sortable: true, format: (value) => <InboxLink to={`/inbox/${value}`}>{value}</InboxLink> },
  { id: "from", label: "From", sortable: true, format: (value) => value?.text || "" },
  {
    id: "subject",
    label: "Subject",
    sortable: true,
    format: (value, row) => <InboxLink to={`/inbox/${row.emailId}/${row._id}`}>{value}</InboxLink>,
  },
];

export const TableSearch = ({ value, onChange, placeholder }) => (
  <Input
    icon={Search}
    type="search"
    placeholder={placeholder}
    aria-label={placeholder}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="mb-3 flex-1"
  />
);
