import React, { useContext } from "react";
import { Box, Typography, Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";

import { ThemeContext } from "../../context/ThemeContext";
import useWindowResize from "../../hooks/useWindowResize";

const TitleBar = () => {
  const navigate = useNavigate();

  const isMobile = useWindowResize();
  const { darkMode } = useContext(ThemeContext);



  

  return (
    <>
      <p
        style={{
          display: "flex",
          position: "absolute",
          right: "10%",
          top: isMobile ? "85%" : "51%",
          opacity: "0.2",
          justifyContent: "flex-start",
          textAlign: "left",
          margin: "0",
          boxSizing: "border-box",
          fontSize: isMobile ? "4rem" : "15.625rem",
          fontFamily: "Abhaya Libre SemiBold",
          fontWeight: "400",
          color: "#ecca7b",
          letterSpacing: "-5px",
          textOverflow: "ellipsis",
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: "-1",
        }}
        aria-hidden="true"
      >
        TrashMail
      </p>

      <Grid item xs={12} md={2}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 3,
            marginLeft: "2%",
            marginTop: "0%",
          }}
        >
          <Typography
            variant="h1"
            sx={{
              color: darkMode ? "#FFF" : "#000",
              fontSize: isMobile ? "1.9rem" : "2rem",
              fontFamily: "Abhaya Libre",
              fontWeight: 700,
              lineHeight: "1.125rem",
            }}
            onClick={() => navigate("/")}
          >
            TrashMail
          </Typography>
        </Box>
      </Grid>
    </>
  );
};

export default TitleBar;
