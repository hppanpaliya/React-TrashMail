import React, { useContext } from "react";
import { Grid, Box, Typography } from "@mui/material";
import ButtonSection from "../../common/ButtonSection";
import { ThemeContext } from "../../../context/ThemeContext";
import { motion } from "framer-motion";
import useWindowResize from "../../../hooks/useWindowResize";

const Main = () => {
  const isMobile = useWindowResize();
  const { darkMode } = useContext(ThemeContext);


  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Grid container spacing={2} sx={{ height: "100%" }}>
        <ButtonSection />
        <Grid
          item
          xs={12}
          md={10}
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
                  fontSize: { xs: "1rem", sm: "1.1rem", md: "1.3rem" },
                  color: darkMode ? "#fff" : "#000",
                  opacity: "0.6",
                  px: { xs: 2, sm: 0 },
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
                  fontSize: { xs: "2rem", sm: "2.5rem", md: "46.5pt" },
                  fontFamily: "Abril Fatface",
                  color: darkMode ? "#fff" : "#000",
                  letterSpacing: { xs: "-0.5px", sm: "-1.24px" },
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  px: { xs: 2, sm: 0 },
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
                  fontSize: { xs: "0.9rem", sm: "1.1rem", md: "1.3rem" },
                  color: darkMode ? "#fff" : "#000",
                  opacity: "0.6",
                  maxWidth: isMobile ? "100%" : "36.5%",
                  px: { xs: 2, sm: 0 },
                  lineHeight: { xs: 1.4, sm: 1.5 },
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
