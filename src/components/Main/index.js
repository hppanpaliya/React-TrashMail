import React from "react";
import { Button, Grid, Box, Typography } from "@mui/material";
import ButtonSection from "../ButtonSection";
import TitleBar from "../TitleBar";
const Main = () => {
  return (
    <>
      <TitleBar />
      <Grid container spacing={2} sx={{ height: "100%" }}>
        <ButtonSection />
        <Grid item xs={12} sm={10} sx={{ marginTop: "6vh" }}>
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: "2%", marginTop: "5%" }}>
            <Typography variant="h2" sx={{ fontFamily: "Abhaya Libre SemiBold", fontSize: "1.3rem", color: "#000", opacity: "0.4" }}>
              The Ultimate Solution for Disposable Email Addresses
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: "2%", marginTop: "1%" }}>
            <Typography
              variant="h2"
              sx={{
                margin: "0",
                boxSizing: "border-box",
                fontSize: "46.5pt",
                fontFamily: "Abril Fatface",
                color: "black",
                letterSpacing: "-1.24px",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              Welcome
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: "2%", marginTop: "3%" }}>
            <Typography
              variant="h2"
              sx={{ fontFamily: "Abhaya Libre SemiBold", fontSize: "1.3rem", color: "#000", opacity: "0.4", maxWidth: "36.5%" }}
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
