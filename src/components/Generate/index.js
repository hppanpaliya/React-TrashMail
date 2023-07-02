import React from "react";
import ButtonSection from "../ButtonSection";
import TitleBar from "../TitleBar";
import { Grid, Box, Typography, TextField, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Generate = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };
  const generateRandomEmail = () => {
    let randomEmail = Math.random().toString(36).substring(5);
    randomEmail += "@myserver.pw";
    setEmail(randomEmail);
  };

  const inputStyles = {
    marginRight: "2rem",
    width: "80%",
  };

  const buttonStyles = {
    color: "#000",
    borderColor: "#000",
    fontSize: "1rem",
    paddingTop: "1.35rem",
    paddingBottom: "1.35rem",
    paddingLeft: "3rem",
    paddingRight: "3rem",
    borderRadius: "10px",
    width: "70%",
    height: "70%",
    maxHeight: "3.6rem",
    textTransform: "capitalize",
    fontFamily: "Actor",
    fontWeight: "400",
    wordWrap: "break-word",

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
        <Grid item xs={12} sm={10} sx={{ marginTop: "6vh" }}>
          <Box sx={{ display: "flex", alignItems: "center", marginLeft: "10%", marginTop: "5%" }}>
            <Grid item xs={12} sm={5}>
              <TextField label="Enter your email" sx={inputStyles} onChange={handleEmailChange} value={email} />
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
