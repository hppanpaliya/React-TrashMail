import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  InputAdornment,
  IconButton
} from '@mui/material';
import { motion } from 'framer-motion';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signup, user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to home if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await signup(username, password, inviteCode);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper 
            elevation={6} 
            sx={{ 
              p: 4, 
              width: '100%', 
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'secondary.main', mb: 2 }}>
                <PersonAddIcon sx={{ color: 'white', fontSize: 30 }} />
              </Box>
              <Typography component="h1" variant="h5" fontWeight="bold">
                Create Account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Join TrashMail with your invite code
              </Typography>
            </Box>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
              </motion.div>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  sx: { borderRadius: 2 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="inviteCode"
                label="Invite Code"
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="secondary"
                size="large"
                sx={{ mt: 3, mb: 2, borderRadius: 2, py: 1.5, fontSize: '1rem' }}
              >
                Sign Up
              </Button>
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                    Already have an account? Sign In
                  </Typography>
                </Link>
              </Box>
            </Box>
          </Paper>
        </Box>
      </motion.div>
    </Container>
  );
};

export default Signup;
