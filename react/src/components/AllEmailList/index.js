import React, { useEffect, useState } from "react";
import { Grid, Typography, Paper, Box, Chip, Tooltip, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ButtonSection from "../ButtonSection";
import { useRef } from "react";
import FiberNewOutlinedIcon from "@mui/icons-material/FiberNewOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import ConfirmModal from "../ConfirmModal";
import { env } from "../../env";

const AllEmailList = () => {
  const [emailData, setEmailData] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [reload, setReload] = useState(false);

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
        const response = await axios.get(`${env.REACT_APP_API_URL}/all-emails`);
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
  }, [reload]);

  const handleEmailClick = (email, email_Id) => {
    navigate(`/inbox/${email}/${email_Id}`);
  };

  const handleOpenModal = async () => {
    setOpenModal(true);
  };

  const handleDeleteEmail = async () => {
    try {
      await axios.delete(`${env.REACT_APP_API_URL}/email/${emailToDelete[1]}/${emailToDelete[0]}`);
      // Refresh the email list after successful deletion
      setReload(!reload);
    } catch (error) {
      console.error("Error deleting email:", error);
    }
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
                    <Tooltip title="New">
                      <IconButton
                        aria-label="new"
                        size="small"
                        sx={{
                          alignSelf: "flex-end",
                          justifySelf: "flex-end",
                          marginLeft: "auto",
                        }}
                      >
                        {!email.readStatus ? <FiberNewOutlinedIcon /> : null}
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete">
                      <IconButton
                        aria-label="delete"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmailToDelete([email._id, email.to.value[0].address]);
                          handleOpenModal();
                        }}
                        sx={{
                          alignSelf: "flex-end",
                          justifySelf: "flex-end",
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
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
                    <Typography
                      variant="subtitle1"
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        wordBreak: "break-all",
                      }}
                    >
                      Date: {new Date(email.date).toLocaleString() + " EST"}
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
      <ConfirmModal
        open={openModal}
        setOpen={setOpenModal}
        title="Delete Email"
        body="Are you sure you want to delete this email?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          handleDeleteEmail();
          setOpenModal(false);
        }}
        onCancel={() => setOpenModal(false)}
      />
    </>
  );
};

export default AllEmailList;
