import React, { useState, useEffect } from "react";
import { Button, Grid, Box, Typography } from "@mui/material";
import { Link, useLocation } from "react-router-dom";

const ButtonSection = () => {
  const buttonStyles = {
    color: "#000",
    borderColor: "#000",
    fontSize: "1.3rem",
    paddingTop: "1.35rem",
    paddingBottom: "1.35rem",
    paddingLeft: "3rem",
    paddingRight: "3rem",
    borderRadius: "10px",
    width: "70%",
    height: "70%",
    textTransform: "capitalize",
    fontFamily: "Actor",
    fontWeight: "400",
    wordWrap: "break-word",
  };

  const location = useLocation();
  const [activePage, setActivePage] = useState("");

  useEffect(() => {
    setActivePage(location.pathname);
  }, [location]);

  const isActivePage = (path) => {
    const isActive = activePage === path;
    return isActive
      ? {
          backgroundColor: "#000",
          color: "#FFF",
          "&:hover": {
            backgroundColor: "#FFF",
            color: "#000",
          },
        }
      : {};
  };

  return (
    <Grid item xs={0} sm={2} sx={{ marginTop: "6vh" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "12vh",
        }}
      >
        <Button variant="outlined" sx={{ ...buttonStyles, ...isActivePage("/generate") }} component={Link} to="/generate">
          Generate
        </Button>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "12vh",
        }}
      >
        <Button variant="outlined" sx={{ ...buttonStyles, ...isActivePage("/index") }} component={Link} to="/index">
          Index
        </Button>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "12vh",
        }}
      >
        <Button variant="outlined" sx={{ ...buttonStyles, ...isActivePage("/support") }} component={Link} to="/support">
          Support
        </Button>
      </Box>
    </Grid>
  );
};

export default ButtonSection;
