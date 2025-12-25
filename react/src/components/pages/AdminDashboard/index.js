import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions
} from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import { env } from '../../../env';
import axios from 'axios';

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

const AdminDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [logs, setLogs] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [users, setUsers] = useState([]);
  const [systemEmails, setSystemEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  // User Edit State
  const [editUser, setEditUser] = useState(null);
  const [domainInput, setDomainInput] = useState('');

  // Invite Generation State
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [inviteRole, setInviteRole] = useState('user');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${env.REACT_APP_API_URL}/api/admin/logs`, {
        headers: { 'x-auth-token': token }
      });
      setLogs(res.data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${env.REACT_APP_API_URL}/api/admin/conflicts`, {
        headers: { 'x-auth-token': token }
      });
      setConflicts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${env.REACT_APP_API_URL}/api/auth/users`, {
        headers: { 'x-auth-token': token }
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemEmails = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${env.REACT_APP_API_URL}/api/admin/system-emails`, {
        headers: { 'x-auth-token': token }
      });
      setSystemEmails(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    if (tabValue === 0) fetchLogs();
    if (tabValue === 1) fetchConflicts();
    if (tabValue === 2) fetchUsers();
    if (tabValue === 4) fetchSystemEmails();
  }, [tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to update user');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom component="div" sx={{ color: 'text.primary' }}>
        Admin Dashboard
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary">
          <Tab label="Audit Logs" />
          <Tab label="Conflicts" />
          <Tab label="Users" />
          <Tab label="Invites" />
          <Tab label="System Emails" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {loading ? <CircularProgress /> : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>User ID</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{log.userId}</TableCell>
                      <TableCell>
                        <Chip label={log.role} color={log.role === 'admin' ? 'secondary' : 'default'} size="small" />
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{JSON.stringify(log.details)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {loading ? <CircularProgress /> : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Email ID</TableCell>
                    <TableCell>Access Count</TableCell>
                    <TableCell>Last Access</TableCell>
                    <TableCell>Users Involved</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {conflicts.map((conflict, index) => (
                    <TableRow key={index}>
                      <TableCell>{conflict.emailId}</TableCell>
                      <TableCell>{conflict.accessCount}</TableCell>
                      <TableCell>{new Date(conflict.lastAccess).toLocaleString()}</TableCell>
                      <TableCell>{conflict.users.join(', ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {loading ? <CircularProgress /> : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Allowed Domains</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.role || 'user'}</TableCell>
                      <TableCell>
                        {user.allowedDomains ? user.allowedDomains.join(', ') : <Chip label="Global Default" size="small" />}
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => handleEditUser(user)}>
                          Edit Domains
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
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
          {loading ? <CircularProgress /> : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>To</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>Subject</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {systemEmails.map((email) => (
                    <TableRow key={email._id}>
                      <TableCell>{new Date(email.date).toLocaleString()}</TableCell>
                      <TableCell>{email.emailId}</TableCell>
                      <TableCell>{email.from.text}</TableCell>
                      <TableCell>{email.subject}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
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
    </Container>
  );
};

export default AdminDashboard;
