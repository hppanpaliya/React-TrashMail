import React from "react";
import ButtonSection from "../ButtonSection";
import TitleBar from "../TitleBar";
import { Grid, Box, Typography, TextField, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FileCopyOutlined } from "@mui/icons-material";
import { InputAdornment } from "@mui/material";

const Generate = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [width, setWidth] = useState(window.innerWidth);

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

  const inputStyles = {
    marginRight: isMobile ? 0 : "2rem",
    width: isMobile ? width - 100 : "80%",
    marginBottom: isMobile ? "1rem" : 0,
  };

  const buttonStyles = {
    color: "#000",
    borderColor: "#000",
    fontSize: "1rem",
    paddingTop: isMobile ? "1rem" : "1.35rem",
    paddingBottom: isMobile ? "1rem" : "1.35rem",
    paddingLeft: isMobile ? "1rem" : "3rem",
    paddingRight: isMobile ? "1rem" : "3rem",
    borderRadius: "10px",
    width: isMobile ? width - 100 : "70%",
    height: isMobile ? "10rem" : "70%",
    maxHeight: "3.6rem",
    textTransform: "capitalize",
    fontFamily: "Actor",
    fontWeight: "400",
    wordWrap: "break-word",
    marginBottom: isMobile ? "1rem" : 0,

    "&:hover": {
      backgroundColor: "#000",
      color: "#FFF",
    },
  };

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
            marginTop: "6vh",
          }}
        >
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
              <TextField
                label="Enter your email"
                sx={inputStyles}
                onChange={handleEmailChange}
                value={email}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    navigate("/inbox/" + email);
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="text"
                        onClick={copyToClipboard}
                        sx={{
                          color: "#000",
                        }}
                      >
                        <FileCopyOutlined />
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button variant="outlined" sx={buttonStyles} onClick={() => (email ? navigate("/inbox/" + email) : null)}>
                Access Account
              </Button>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button variant="outlined" sx={buttonStyles} onClick={generateRandomEmail}>
                Random
              </Button>
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default Generate;
