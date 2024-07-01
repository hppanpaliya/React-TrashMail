import React, { useEffect, useState, useContext } from "react";
import { Grid, Box, Typography } from "@mui/material";
import ButtonSection from "../../common/ButtonSection";
import { ThemeContext } from "../../../context/ThemeContext";
import { motion } from "framer-motion";

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
          <motion.div initial={{ y: 50 }} animate={{ y: 0 }}>
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
          </motion.div>

          <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }}>
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
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
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
                TrashMail is your go-to platform for creating temporary and disposable email addresses. With our cutting-edge technology, you can
                easily protect your privacy and avoid spam in a hassle-free manner.
              </Typography>
            </Box>
          </motion.div>
        </Grid>
      </Grid>
    </motion.div>
  );
};

export default Main;
