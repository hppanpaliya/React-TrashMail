import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";
import useDebouncedValue from "./useDebouncedValue";

// Response payloads name their array after the resource; find whichever is present.
const DATA_KEYS = ["logs", "emails", "conflicts", "users", "invites"];

// Server-paginated table state + fetching for the admin endpoints.
// `tableProps` spreads straight into <DataTable>. `prepend` inserts a live
// (SSE) row when the user is on the first page with no active search.
const useAdminTable = (endpoint, { initialSortBy = "date", initialSortOrder = "desc", extraParams } = {}) => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const debouncedSearch = useDebouncedValue(search);
  // Serialized so callers can pass a fresh object literal each render.
  const extraKey = JSON.stringify(extraParams || {});

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, extraKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(endpoint, {
          params: { page: page + 1, limit: rowsPerPage, search: debouncedSearch, sortBy, sortOrder, ...JSON.parse(extraKey) },
        });
        if (cancelled) return;
        const key = DATA_KEYS.find((k) => Array.isArray(res.data[k]));
        const rows = key ? res.data[key] : [];
        setData(rows);
        setTotal(Number.isFinite(res.data.total) ? res.data.total : rows.length);
      } catch (err) {
        console.error(`Failed to fetch ${endpoint}:`, err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoint, page, rowsPerPage, debouncedSearch, sortBy, sortOrder, extraKey, refreshKey]);

  // Live values for callbacks that must not re-subscribe on every change.
  const liveRef = useRef({ page: 0, search: "", rowsPerPage: 10 });
  useEffect(() => {
    liveRef.current = { page, search: debouncedSearch, rowsPerPage };
  }, [page, debouncedSearch, rowsPerPage]);

  const prepend = useCallback((item) => {
    const live = liveRef.current;
    if (live.page !== 0 || live.search) return;
    setData((prev) => [item, ...prev].slice(0, live.rowsPerPage));
    setTotal((prev) => prev + 1);
  }, []);

  const onSort = useCallback(
    (prop) => {
      const isAsc = sortBy === prop && sortOrder === "asc";
      setSortOrder(isAsc ? "desc" : "asc");
      setSortBy(prop);
    },
    [sortBy, sortOrder]
  );

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return {
    tableProps: {
      data,
      total,
      page,
      rowsPerPage,
      onPageChange: setPage,
      onRowsPerPageChange: setRowsPerPage,
      sortBy,
      sortOrder,
      onSort,
      loading,
    },
    refresh,
    prepend,
    search,
    setSearch,
  };
};

export default useAdminTable;
