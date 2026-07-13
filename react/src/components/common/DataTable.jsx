import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import Spinner from "../ui/Spinner";
import Select from "../ui/Select";
import IconButton from "../ui/IconButton";
import { cx } from "../../utils/cx";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100].map((n) => ({ value: n, label: `${n} rows` }));

// Server-paginated data table. Renders a real <table> on sm+ screens and
// stacked cards on mobile. `page` is zero-based (matches admin API usage).
const DataTable = ({
  columns,
  data,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  sortBy,
  sortOrder,
  onSort,
  loading,
  noDataMessage = "No records found",
  hidePagination = false,
}) => {
  const lastPage = Math.max(0, Math.ceil(total / rowsPerPage) - 1);
  const from = total === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min(total, (page + 1) * rowsPerPage);

  const sortButton = (column) => (
    <button
      type="button"
      onClick={() => onSort(column.id)}
      className="inline-flex cursor-pointer items-center gap-1 text-left font-medium hover:text-ink focus-ring rounded"
      aria-label={`Sort by ${column.label}`}
    >
      {column.label}
      {sortBy === column.id &&
        (sortOrder === "asc" ? (
          <ArrowUp aria-hidden="true" className="h-3 w-3 text-accent" />
        ) : (
          <ArrowDown aria-hidden="true" className="h-3 w-3 text-accent" />
        ))}
    </button>
  );

  return (
    <div className="glass overflow-hidden rounded-2xl">
      {/* Desktop table */}
      <div className="hidden max-h-[65dvh] overflow-auto sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 z-10 bg-raised-solid text-left text-xs uppercase tracking-wide text-muted">
              {columns.map((column) => (
                <th key={column.id} className="whitespace-nowrap border-b border-hairline px-4 py-3 font-medium">
                  {column.sortable ? sortButton(column) : column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-muted">
                  {noDataMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={row._id || index} className="border-b border-hairline last:border-b-0 hover:bg-raised">
                  {columns.map((column) => (
                    <td key={column.id} className="max-w-72 break-words px-4 py-2.5 align-top text-[13px] text-ink">
                      {column.format ? column.format(row[column.id], row) : row[column.id]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{noDataMessage}</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {data.map((row, index) => (
              <li key={row._id || index} className="flex flex-col gap-1.5 px-4 py-3">
                {columns.map((column) => (
                  <div key={column.id} className="flex items-baseline gap-2 text-[13px]">
                    <span className="w-24 shrink-0 text-[11px] font-medium uppercase tracking-wide text-faint">{column.label}</span>
                    <span className="min-w-0 break-words text-ink">{column.format ? column.format(row[column.id], row) : row[column.id]}</span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination footer */}
      {hidePagination ? null : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-3 py-2">
          <Select
            aria-label="Rows per page"
            value={rowsPerPage}
            onChange={(event) => {
              onRowsPerPageChange(parseInt(event.target.value, 10));
              onPageChange(0);
            }}
            options={ROWS_PER_PAGE_OPTIONS}
            selectClassName="h-8 rounded-lg text-xs"
            className="w-28"
          />
          <div className="flex items-center gap-1">
            <span className={cx("tabular-nums px-2 text-xs text-muted")}>
              {from}–{to} of {total}
            </span>
            <IconButton label="Previous page" size="sm" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft />
            </IconButton>
            <IconButton label="Next page" size="sm" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
              <ChevronRight />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
