import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

const NoEmailDisplay = ({ loading, isMobile }) => {
  return (
    <Box sx={{ textAlign: 'center', marginTop: '10vh' }}>
      <Paper elevation={3} sx={{ p: 2, marginBottom: 2, margin: isMobile ? '2vh' : '' }}>
        <Typography variant="p" gutterBottom>
          {loading ? 'Loading...' : 'No Email Found'}
        </Typography>
      </Paper>
    </Box>
  );
};

export default NoEmailDisplay;
