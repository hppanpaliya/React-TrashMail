import React, { useEffect, useState, useContext } from "react";
import ButtonSection from "../ButtonSection";
import { Grid, Box, TextField, Button, InputAdornment } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { FileCopyOutlined } from "@mui/icons-material";
import { ThemeContext } from "../../context/ThemeContext";
import { motion } from "framer-motion";

const Generate = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(window.localStorage.getItem("lastEmailId") || "");
  const [isMobile, setIsMobile] = useState(false);
  const [width, setWidth] = useState(window.innerWidth);
  const domains = JSON.parse(process.env.REACT_APP_DOMAINS);
  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
      setWidth(window.innerWidth);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const copyToClipboard = () => {
    if (email === "") {
      alert("Please enter an email address");
      return;
    }
    navigator.clipboard.writeText(email);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const generateRandomEmail = () => {
    let randomEmail = Math.random().toString(36).substring(5);
    randomEmail += "@myserver.pw";
    setEmail(randomEmail);
  };

  const handleInboxRedirect = () => {
    if (email === "") {
      alert("Please enter an email address");
      return;
    }
    const domainMatch = domains.some((domain) => email.endsWith(domain));
    if (domainMatch) {
      navigate("/inbox/" + email);
    } else {
      alert("Email address does not end with a valid domain. Valid domains are: " + domains.join(", "));
    }
  };

  const inputStyles = {
    marginRight: isMobile ? 0 : "2rem",
    width: isMobile ? width - 100 : "80%",
    marginBottom: isMobile ? "1rem" : 0,
  };

  const buttonStyles = {
    color: darkMode ? "#FFF" : "#000",
    borderColor: "#000",
    fontSize: "1rem",
    paddingTop: isMobile ? "1rem" : "1.35rem",
    paddingBottom: isMobile ? "1rem" : "1.35rem",
    paddingLeft: isMobile ? "1rem" : "3rem",
    paddingRight: isMobile ? "1rem" : "3rem",
    borderRadius: "10px",
    width: isMobile ? width - 100 : "70%",
    maxHeight: "3.6rem",
    textTransform: "capitalize",
    fontFamily: "Actor",
    fontWeight: "400",
    marginBottom: isMobile ? "1rem" : 0,
  };

  return (
    <>
      <Grid container spacing={2} sx={{ height: "100%" }}>
        <ButtonSection />
        <Grid item xs={12} sm={10} sx={{ marginTop: "6vh" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              marginLeft: isMobile ? "0" : "10%",
              marginTop: "5%",
              flexDirection: isMobile ? "column" : "row",
              alignContent: "center",
              textAlign: "center",
            }}
          >
            <Grid item xs={12} sm={5}>
              <motion.div initial={{ scale:0.5 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
                <TextField
                  label="Enter your email"
                  sx={inputStyles}
                  onChange={handleEmailChange}
                  value={email}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleInboxRedirect();
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button variant="text" onClick={copyToClipboard} sx={{ color: darkMode ? "#FFF" : "#000" }}>
                          <FileCopyOutlined />
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                />
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={3}>
              <motion.div initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="outlined" sx={buttonStyles} onClick={() => handleInboxRedirect()}>
                    Access Account
                  </Button>
                </motion.div>
              </motion.div>
            </Grid>
            <Grid item xs={12} sm={3}>
              <motion.div initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="outlined" sx={buttonStyles} onClick={generateRandomEmail}>
                    Random
                  </Button>
                </motion.div>
              </motion.div>
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default Generate;
