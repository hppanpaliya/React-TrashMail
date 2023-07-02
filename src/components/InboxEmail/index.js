import React from "react";
import ButtonSection from "../ButtonSection";
import TitleBar from "../TitleBar";
import { Grid, Box, Typography, TextField, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const InboxEmail = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  return (
    <>
      <TitleBar />
      <Grid container spacing={2} sx={{ height: "100%" }}>
        <ButtonSection />
        <Grid item xs={12} sm={10} sx={{ marginTop: "6vh" }}></Grid>
      </Grid>
    </>
  );
};

export default InboxEmail;
