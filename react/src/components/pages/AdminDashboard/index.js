import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Tab,
  Tabs,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  InputAdornment,
  DialogActions
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../../../context/AuthContext';
import { env } from '../../../env';
import axios from 'axios';
import DataTable from '../../common/DataTable';
import { Link } from 'react-router-dom';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const useTableState = (initialSortBy = 'timestamp') => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(false);

  return {
    data, setData,
    total, setTotal,
    page, setPage,
    rowsPerPage, setRowsPerPage,
    search, setSearch,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    loading, setLoading
  };
};

const AdminDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const { token } = useAuth();

  // State for each tab
  const logsState = useTableState('timestamp');
  const conflictsState = useTableState('lastAccess');
  const usersState = useTableState('username');
  const systemEmailsState = useTableState('date');
  const receivedEmailsState = useTableState('date');
  
  // User Edit State
  const [editUser, setEditUser] = useState(null);
  const [domainInput, setDomainInput] = useState('');

  // Invite Generation State
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [inviteRole, setInviteRole] = useState('user');

  // Clear Logs State
  const [openClearLogs, setOpenClearLogs] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);

  // SSE Connection
  useEffect(() => {
    let eventSource;
    if (token) {
      eventSource = new EventSource(`${env.REACT_APP_API_URL}/api/admin/sse/logs?token=${token}`);
      
      eventSource.onmessage = (event) => {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'NEW_LOG') {
          // Prepend new log if we are on the first page and not searching
          if (logsState.page === 0 && !logsState.search) {
            logsState.setData(prev => [parsed.data, ...prev].slice(0, logsState.rowsPerPage));
            logsState.setTotal(prev => prev + 1);
          }
        } else if (parsed.type === 'NEW_EMAIL') {
          // Prepend new email if we are on the first page and not searching
          if (receivedEmailsState.page === 0 && !receivedEmailsState.search) {
            receivedEmailsState.setData(prev => [parsed.data, ...prev].slice(0, receivedEmailsState.rowsPerPage));
            receivedEmailsState.setTotal(prev => prev + 1);
          }
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE Error:", err);
        eventSource.close();
      };
    }
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [
    token,
    logsState,
    receivedEmailsState
  ]);

  const fetchData = useCallback(async (endpoint, stateObj) => {
    stateObj.setLoading(true);
    try {
      const res = await axios.get(`${env.REACT_APP_API_URL}${endpoint}`, {
        params: {
          page: stateObj.page + 1,
          limit: stateObj.rowsPerPage,
          search: stateObj.search,
          sortBy: stateObj.sortBy,
          sortOrder: stateObj.sortOrder
        },
        headers: { 'x-auth-token': token }
      });
      
      if (res.data.logs) {
        stateObj.setData(res.data.logs);
        stateObj.setTotal(res.data.total);
      } else if (res.data.emails) {
        stateObj.setData(res.data.emails);
        stateObj.setTotal(res.data.total);
      } else if (res.data.conflicts) {
        stateObj.setData(res.data.conflicts);
        stateObj.setTotal(res.data.total);
      } else if (res.data.users) {
        stateObj.setData(res.data.users);
        stateObj.setTotal(res.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      stateObj.setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (tabValue === 0) fetchData('/api/admin/logs', logsState);
    if (tabValue === 1) fetchData('/api/admin/conflicts', conflictsState);
    if (tabValue === 2) fetchData('/api/auth/users', usersState);
    if (tabValue === 4) fetchData('/api/admin/system-emails', systemEmailsState);
    if (tabValue === 5) fetchData('/api/admin/received-emails', receivedEmailsState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tabValue, 
    logsState.page, logsState.rowsPerPage, logsState.search, logsState.sortBy, logsState.sortOrder,
    conflictsState.page, conflictsState.rowsPerPage, conflictsState.search, conflictsState.sortBy, conflictsState.sortOrder,
    usersState.page, usersState.rowsPerPage, usersState.search, usersState.sortBy, usersState.sortOrder,
    systemEmailsState.page, systemEmailsState.rowsPerPage, systemEmailsState.search, systemEmailsState.sortBy, systemEmailsState.sortOrder,
    receivedEmailsState.page, receivedEmailsState.rowsPerPage, receivedEmailsState.search, receivedEmailsState.sortBy, receivedEmailsState.sortOrder
  ]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleGenerateInvite = async () => {
    try {
      const res = await axios.post(`${env.REACT_APP_API_URL}/api/admin/invites`, 
        { role: inviteRole },
        { headers: { 'x-auth-token': token } }
      );
      setGeneratedInvite(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to generate invite');
    }
  };

  const handleClearLogs = async () => {
    try {
      const response = await axios.delete(
        `${env.REACT_APP_API_URL}/api/admin/logs`,
        { 
          headers: { 'x-auth-token': token },
          data: { retentionDays: retentionDays === 'ALL' ? null : retentionDays }
        }
      );
      alert(response.data.message);
      setOpenClearLogs(false);
      fetchData('/api/admin/logs', logsState); // Refresh logs
    } catch (error) {
      console.error("Error clearing logs:", error);
      alert("Failed to clear logs");
    }
  };

  const handleEditUser = (user) => {
    setEditUser(user);
    setDomainInput(user.allowedDomains ? user.allowedDomains.join(', ') : '');
  };

  const handleSaveUser = async () => {
    try {
      const domains = domainInput.trim() === '' ? null : domainInput.split(',').map(d => d.trim());
      
      await axios.put(`${env.REACT_APP_API_URL}/api/admin/users/${editUser._id}/domains`, 
        { allowedDomains: domains },
        { headers: { 'x-auth-token': token } }
      );
      
      setEditUser(null);
      fetchData('/api/auth/users', usersState);
    } catch (err) {
      console.error(err);
      alert('Failed to update user');
    }
  };

  // Columns Definitions
  const logColumns = [
    { id: 'timestamp', label: 'Time', minWidth: 170, sortable: true, format: (value) => new Date(value).toLocaleString() },
    { id: 'userId', label: 'User ID', minWidth: 100, sortable: true },
    { id: 'role', label: 'Role', minWidth: 100, sortable: true, format: (value) => <Chip label={value} color={value === 'admin' ? 'secondary' : 'default'} size="small" /> },
    { id: 'action', label: 'Action', minWidth: 170, sortable: true },
    { id: 'details', label: 'Details', minWidth: 170, format: (value) => JSON.stringify(value) },
  ];

  const conflictColumns = [
    { id: 'emailId', label: 'Email ID', minWidth: 170, sortable: true },
    { id: 'accessCount', label: 'Access Count', minWidth: 100, sortable: true },
    { id: 'lastAccess', label: 'Last Access', minWidth: 170, sortable: true, format: (value) => new Date(value).toLocaleString() },
    { id: 'users', label: 'Users Involved', minWidth: 170, format: (value) => value.join(', ') },
  ];

  const userColumns = [
    { id: 'username', label: 'Username', minWidth: 170, sortable: true },
    { id: 'role', label: 'Role', minWidth: 100, sortable: true, format: (value) => value || 'user' },
    { id: 'allowedDomains', label: 'Allowed Domains', minWidth: 170, format: (value) => value ? value.join(', ') : <Chip label="Global Default" size="small" /> },
    { 
      id: 'actions', 
      label: 'Actions', 
      minWidth: 100, 
      format: (value, row) => (
        <Button size="small" variant="outlined" onClick={() => handleEditUser(row)}>
          Edit Domains
        </Button>
      )
    },
  ];

  const emailColumns = [
    { id: 'date', label: 'Date', minWidth: 170, sortable: true, format: (value) => new Date(value).toLocaleString() },
    { id: 'emailId', label: 'To', minWidth: 170, sortable: true },
    { id: 'from', label: 'From', minWidth: 170, sortable: true, format: (value) => value?.text || '' },
    { id: 'subject', label: 'Subject', minWidth: 170, sortable: true },
  ];

  const receivedEmailColumns = [
    { id: 'date', label: 'Date', minWidth: 170, sortable: true, format: (value) => new Date(value).toLocaleString() },
    { 
      id: 'emailId', 
      label: 'To', 
      minWidth: 170, 
      sortable: true,
      format: (value) => (
        <Link to={`/inbox/${value}`} style={{ textDecoration: 'none', color: 'inherit' }} target="_blank">
          <Typography color="primary" variant="body2" sx={{ '&:hover': { textDecoration: 'underline' } }}>
            {value}
          </Typography>
        </Link>
      )
    },
    { id: 'from', label: 'From', minWidth: 170, sortable: true, format: (value) => value?.text || '' },
    { 
      id: 'subject', 
      label: 'Subject', 
      minWidth: 170, 
      sortable: true,
      format: (value, row) => (
        <Link to={`/inbox/${row.emailId}/${row._id}`} style={{ textDecoration: 'none', color: 'inherit' }} target="_blank">
          <Typography color="primary" variant="body2" sx={{ '&:hover': { textDecoration: 'underline' } }}>
            {value}
          </Typography>
        </Link>
      )
    },
    { 
      id: 'accessedBy', 
      label: 'Accessed By', 
      minWidth: 170, 
      format: (value) => (
        value && value.length > 0 ? (
          value.map((user, i) => (
            <Chip key={i} label={user} size="small" sx={{ mr: 0.5 }} />
          ))
        ) : (
          <Typography variant="caption" color="text.secondary">Not Accessed</Typography>
        )
      )
    }
  ];

  const renderSearch = (stateObj, placeholder) => (
    <Box sx={{ mb: 2 }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder={placeholder}
        value={stateObj.search}
        onChange={(e) => stateObj.setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom component="div" sx={{ color: 'text.primary' }}>
        Admin Dashboard
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="scrollable" scrollButtons="auto">
          <Tab label="Audit Logs" />
          <Tab label="Conflicts" />
          <Tab label="Users" />
          <Tab label="Invites" />
          <Tab label="System Emails" />
          <Tab label="Received Emails" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
            <Box sx={{ flexGrow: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search logs..."
                value={logsState.search}
                onChange={(e) => logsState.setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Button variant="contained" color="error" onClick={() => setOpenClearLogs(true)} sx={{ height: 56 }}>
              Clear Logs
            </Button>
          </Box>
          <DataTable
            columns={logColumns}
            data={logsState.data}
            total={logsState.total}
            page={logsState.page}
            rowsPerPage={logsState.rowsPerPage}
            onPageChange={logsState.setPage}
            onRowsPerPageChange={logsState.setRowsPerPage}
            sortBy={logsState.sortBy}
            sortOrder={logsState.sortOrder}
            onSort={(prop) => {
              const isAsc = logsState.sortBy === prop && logsState.sortOrder === 'asc';
              logsState.setSortOrder(isAsc ? 'desc' : 'asc');
              logsState.setSortBy(prop);
            }}
            loading={logsState.loading}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {renderSearch(conflictsState, "Search conflicts...")}
          <DataTable
            columns={conflictColumns}
            data={conflictsState.data}
            total={conflictsState.total}
            page={conflictsState.page}
            rowsPerPage={conflictsState.rowsPerPage}
            onPageChange={conflictsState.setPage}
            onRowsPerPageChange={conflictsState.setRowsPerPage}
            sortBy={conflictsState.sortBy}
            sortOrder={conflictsState.sortOrder}
            onSort={(prop) => {
              const isAsc = conflictsState.sortBy === prop && conflictsState.sortOrder === 'asc';
              conflictsState.setSortOrder(isAsc ? 'desc' : 'asc');
              conflictsState.setSortBy(prop);
            }}
            loading={conflictsState.loading}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {renderSearch(usersState, "Search users...")}
          <DataTable
            columns={userColumns}
            data={usersState.data}
            total={usersState.total}
            page={usersState.page}
            rowsPerPage={usersState.rowsPerPage}
            onPageChange={usersState.setPage}
            onRowsPerPageChange={usersState.setRowsPerPage}
            sortBy={usersState.sortBy}
            sortOrder={usersState.sortOrder}
            onSort={(prop) => {
              const isAsc = usersState.sortBy === prop && usersState.sortOrder === 'asc';
              usersState.setSortOrder(isAsc ? 'desc' : 'asc');
              usersState.setSortBy(prop);
            }}
            loading={usersState.loading}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ maxWidth: 400, mx: 'auto', textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>Generate New Invite Code</Typography>
            <TextField
              select
              label="Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              SelectProps={{ native: true }}
              fullWidth
              sx={{ mb: 2 }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </TextField>
            <Button variant="contained" onClick={handleGenerateInvite} fullWidth>
              Generate Code
            </Button>

            {generatedInvite && (
              <Paper sx={{ mt: 4, p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" color="text.secondary">Generated Code:</Typography>
                <Typography variant="h5" sx={{ my: 1, fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {generatedInvite.code}
                </Typography>
                <Chip label={generatedInvite.role} size="small" color="primary" />
              </Paper>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          {renderSearch(systemEmailsState, "Search system emails...")}
          <DataTable
            columns={emailColumns}
            data={systemEmailsState.data}
            total={systemEmailsState.total}
            page={systemEmailsState.page}
            rowsPerPage={systemEmailsState.rowsPerPage}
            onPageChange={systemEmailsState.setPage}
            onRowsPerPageChange={systemEmailsState.setRowsPerPage}
            sortBy={systemEmailsState.sortBy}
            sortOrder={systemEmailsState.sortOrder}
            onSort={(prop) => {
              const isAsc = systemEmailsState.sortBy === prop && systemEmailsState.sortOrder === 'asc';
              systemEmailsState.setSortOrder(isAsc ? 'desc' : 'asc');
              systemEmailsState.setSortBy(prop);
            }}
            loading={systemEmailsState.loading}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          {renderSearch(receivedEmailsState, "Search received emails...")}
          <DataTable
            columns={receivedEmailColumns}
            data={receivedEmailsState.data}
            total={receivedEmailsState.total}
            page={receivedEmailsState.page}
            rowsPerPage={receivedEmailsState.rowsPerPage}
            onPageChange={receivedEmailsState.setPage}
            onRowsPerPageChange={receivedEmailsState.setRowsPerPage}
            sortBy={receivedEmailsState.sortBy}
            sortOrder={receivedEmailsState.sortOrder}
            onSort={(prop) => {
              const isAsc = receivedEmailsState.sortBy === prop && receivedEmailsState.sortOrder === 'asc';
              receivedEmailsState.setSortOrder(isAsc ? 'desc' : 'asc');
              receivedEmailsState.setSortBy(prop);
            }}
            loading={receivedEmailsState.loading}
          />
        </TabPanel>
      </Paper>

      <Dialog open={!!editUser} onClose={() => setEditUser(null)}>
        <DialogTitle>Edit User Domains</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter comma-separated domains (e.g., "example.com, test.com"). Leave empty to use global defaults.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Allowed Domains"
            fullWidth
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Clear Logs Dialog */}
      <Dialog open={openClearLogs} onClose={() => setOpenClearLogs(false)}>
        <DialogTitle>Clear Audit Logs</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Select retention period. Logs older than this will be permanently deleted.
          </Typography>
          <TextField
            select
            fullWidth
            label="Retention Period"
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
            SelectProps={{
              native: true,
            }}
            sx={{ mt: 2 }}
          >
            <option value={30}>Older than 30 Days</option>
            <option value={7}>Older than 7 Days</option>
            <option value={1}>Older than 24 Hours</option>
            <option value="ALL">Clear All Logs</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClearLogs(false)}>Cancel</Button>
          <Button onClick={handleClearLogs} color="error" variant="contained">
            Clear Logs
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;
