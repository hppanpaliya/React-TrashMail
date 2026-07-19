import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import IconButton from "./IconButton";
import { cx } from "../../utils/cx";

// Windowed page numbers around the current page: at most span*2+1 pages,
// centered on `page`, shifted inward at either edge so it never overflows.
export const pageWindow = (page, totalPages, span = 2) => {
  if (totalPages < 1) return [];
  const size = span * 2 + 1;
  const maxStart = Math.max(1, totalPages - size + 1);
  const start = Math.min(Math.max(1, page - span), maxStart);
  const end = Math.min(totalPages, start + size - 1);
  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
};

const Pagination = ({ page, totalPages, onChange, className }) => {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className={cx("flex items-center justify-center gap-1", className)}>
      <IconButton label="First page" size="sm" disabled={page === 1} onClick={() => onChange(1)}>
        <ChevronsLeft />
      </IconButton>
      <IconButton label="Previous page" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft />
      </IconButton>

      {pageWindow(page, totalPages).map((p) => (
        <button
          key={p}
          type="button"
          aria-label={`Page ${p}`}
          aria-current={p === page ? "page" : undefined}
          onClick={() => onChange(p)}
          className={cx(
            "h-8 min-w-8 rounded-lg px-2 text-[13px] tabular-nums cursor-pointer transition-colors duration-150 focus-ring",
            p === page ? "bg-accent font-semibold text-accent-ink" : "text-muted hover:bg-raised hover:text-ink"
          )}
        >
          {p}
        </button>
      ))}

      <IconButton label="Next page" size="sm" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight />
      </IconButton>
      <IconButton label="Last page" size="sm" disabled={page === totalPages} onClick={() => onChange(totalPages)}>
        <ChevronsRight />
      </IconButton>
    </nav>
  );
};

export default Pagination;
