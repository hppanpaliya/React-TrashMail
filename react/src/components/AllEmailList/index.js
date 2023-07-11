import React, { useEffect, useState } from "react";
import { Grid, Typography, Paper, Box, Chip, Tooltip, IconButton } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ButtonSection from "../ButtonSection";
import TitleBar from "../TitleBar";
import InfoIcon from "@mui/icons-material/Info";
import { useRef } from "react";

const AllEmailList = () => {
  const [emailData, setEmailData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

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

  const navigate = useNavigate();

  const pollingIntervalRef = useRef(null);


  useEffect(() => {
    const fetchEmailData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/all-emails`);
        setEmailData(response.data);
        console.log(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching email data:", error);
        setLoading(false);
      }
    };

    const startPolling = () => {
      // Fetch email data immediately
      fetchEmailData();

      // Start polling at the specified interval (e.g., every 5 seconds)
      pollingIntervalRef.current = setInterval(fetchEmailData, 5000);
    };

    const stopPolling = () => {
      // Clear the polling interval
      clearInterval(pollingIntervalRef.current);
    };

    // Start polling when the component mounts or when the emailId changes
    startPolling();

    // Clean up the polling interval when the component unmounts
    return () => {
      stopPolling();
    };
  }, []);

  const handleEmailClick = (email, email_Id) => {
    navigate(`/inbox/${email}/${email_Id}`);
  };

  const handleNoEmails = () => {
    if (emailData.length === 0) {
      return (
        <Box sx={{ textAlign: "center", marginTop: "10vh" }}>
          <Paper elevation={3} sx={{ p: 2, marginBottom: 2, margin: isMobile ? "2vh" : "" }}>
            <Typography variant="p" gutterBottom>
              No Email Found
            </Typography>
          </Paper>
        </Box>
      );
    }
  };

  return (
    <>

      <Grid container spacing={2} sx={{ height: "100%" }}>
        <ButtonSection />
        <Grid item xs={12} sm={1} sx={{ marginTop: isMobile ? "0vh" : "6vh" }}></Grid>
        <Grid item xs={12} sm={8} sx={{ marginTop: isMobile ? "0vh" : "6vh" }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
          ></Typography>
          {emailData.length > 0
            ? emailData.map((email) => (
                <Paper
                  elevation={3}
                  sx={{
                    p: 2,
                    marginBottom: 2,
                    margin: isMobile ? "2vh" : "",
                    cursor: "pointer",
                  }}
                  key={email._id}
                  onClick={() => handleEmailClick(email.to.value[0].address, email._id)}
                >
                  <Typography
                    variant="h5"
                    gutterBottom
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      wordBreak: "break-all",
                    }}
                  >
                    {email.subject}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        wordBreak: "break-all",
                      }}
                    >
                      From: {email.from.text}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Chip label={email.to.value[0].address} />
                  </Box>
                </Paper>
              ))
            : handleNoEmails()}
        </Grid>
      </Grid>
    </>
  );
};

export default AllEmailList;
