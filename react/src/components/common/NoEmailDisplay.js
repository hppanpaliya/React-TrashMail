import { Paper, Typography, Box } from "@mui/material";

const NoEmailDisplay = ({ loading }) => {
  return (
    <Box sx={{ textAlign: "center", marginTop: { xs: "5vh", sm: "10vh" }, px: { xs: 2, sm: 0 } }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 2 }, marginBottom: 2, mx: { xs: 1, sm: 0 } }}>
        <Typography variant="body1" gutterBottom sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
          {loading ? "Loading..." : "No Email Found"}
        </Typography>
      </Paper>
    </Box>
  );
};

export default NoEmailDisplay;
