import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  TableSortLabel,
  CircularProgress,
  Typography,
} from "@mui/material";

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
}) => {
  const handleChangePage = (event, newPage) => {
    onPageChange(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    onRowsPerPageChange(parseInt(event.target.value, 10));
    onPageChange(0);
  };

  const createSortHandler = (property) => () => {
    onSort(property);
  };

  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ maxHeight: { xs: "calc(100vh - 300px)", sm: "calc(100vh - 200px)" } }}>
        <Table stickyHeader aria-label="sticky table" size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                  sortDirection={sortBy === column.id ? sortOrder : false}
                  sx={{
                    whiteSpace: "nowrap",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    py: { xs: 1, sm: 1.5 },
                  }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortOrder : "asc"}
                      onClick={createSortHandler(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                    {noDataMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => {
                return (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row._id || index}>
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell
                          key={column.id}
                          align={column.align}
                          sx={{
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            py: { xs: 0.75, sm: 1.5 },
                            px: { xs: 1, sm: 2 },
                            whiteSpace: { xs: "nowrap", sm: "normal" },
                          }}
                        >
                          {column.format ? column.format(value, row) : value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          "& .MuiTablePagination-toolbar": {
            minHeight: { xs: 48, sm: 64 },
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
          },
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            mb: 0,
          },
          "& .MuiTablePagination-select": {
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
          },
        }}
      />
    </Paper>
  );
};

export default DataTable;
