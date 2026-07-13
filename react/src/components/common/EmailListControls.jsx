import { Search, X } from "lucide-react";
import Input from "../ui/Input";
import Select from "../ui/Select";
import IconButton from "../ui/IconButton";

export const DEFAULT_SORT_OPTIONS = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "subject-asc", label: "Subject (A-Z)" },
  { value: "subject-desc", label: "Subject (Z-A)" },
  { value: "from-asc", label: "From (A-Z)" },
  { value: "from-desc", label: "From (Z-A)" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All emails" },
  { value: "read", label: "Read" },
  { value: "unread", label: "Unread" },
];

// Server-side search / filter / sort controls shared by the email list pages.
const EmailListControls = ({
  searchTerm,
  onSearchChange,
  filterRead,
  onFilterChange,
  sortBy,
  onSortChange,
  onClear,
  sortOptions = DEFAULT_SORT_OPTIONS,
  resultSummary,
}) => {
  return (
    <div className="mb-4 mt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          icon={Search}
          type="search"
          placeholder="Search emails…"
          aria-label="Search emails"
          data-search-input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <Select
            aria-label="Filter"
            value={filterRead}
            onChange={(event) => onFilterChange(event.target.value)}
            options={FILTER_OPTIONS}
            className="flex-1 sm:w-36"
          />
          <Select
            aria-label="Sort by"
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            options={sortOptions}
            className="flex-1 sm:w-40"
          />
          <IconButton label="Clear search and filters" onClick={onClear} className="border border-hairline">
            <X />
          </IconButton>
        </div>
      </div>

      {resultSummary && (
        <p aria-live="polite" className="mt-2 tabular-nums text-xs text-faint">
          {resultSummary}
        </p>
      )}
    </div>
  );
};

export default EmailListControls;
