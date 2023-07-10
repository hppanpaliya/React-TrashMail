import React from "react";
import { Button, Grid, Box, Typography } from "@mui/material";
import ButtonSection from "../ButtonSection";
import TitleBar from "../TitleBar";
import { useEffect, useState } from "react";
import { theme } from "../../theme";
import { darkTheme } from "../../theme/darkTheme";
import { ThemeContext } from "../../context/ThemeContext";
import { useContext } from "react";

const Main = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <TitleBar />
      <Grid container spacing={2} sx={{ height: "100%" }}>
        <ButtonSection />
        <Grid
          item
          xs={12}
          sm={10}
          sx={{
            marginTop: isMobile ? "1vh" : "6vh",
            paddingLeft: "2%",
            textAlign: isMobile ? "center" : "left",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",

              marginTop: "5%",
            }}
          >
            <Typography
              variant="h2"
              sx={{
                fontFamily: "Abhaya Libre SemiBold",
                fontSize: "1.3rem",
                color: darkMode ? "#fff" : "#000",
                opacity: "0.6",
              }}
            >
              The Ultimate Solution for Disposable Email Addresses
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", marginTop: "1%" }}>
            <Typography
              variant="h2"
              sx={{
                margin: "0",
                boxSizing: "border-box",
                fontSize: isMobile ? "2.5rem" : "46.5pt",
                fontFamily: "Abril Fatface",
                color: darkMode ? "#fff" : "#000",
                letterSpacing: "-1.24px",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              Welcome
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", marginTop: "3%" }}>
            <Typography
              variant="h2"
              sx={{
                fontFamily: "Abhaya Libre SemiBold",
                fontSize: "1.3rem",
                color: darkMode ? "#fff" : "#000",
                opacity: "0.6",
                maxWidth: isMobile ? "100%" : "36.5%",
              }}
            >
              TrashMail is your go-to platform for creating temporary and disposable email addresses. With our cutting-edge technology, you can easily
              protect your privacy and avoid spam in a hassle-free manner.
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default Main;
