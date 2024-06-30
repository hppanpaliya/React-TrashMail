import React, { useEffect, useState, useContext } from "react";
import { Grid, Typography, Tooltip } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ButtonSection from "../ButtonSection";
import SingleEmailItem from "./SingleEmailItem";
import ConfirmModal from "../ConfirmModal";
import NoEmailDisplay from "./NoEmailDisplay";
import { ThemeContext } from "../../context/ThemeContext";
import { FileCopyOutlined } from "@mui/icons-material";
import { env } from "../../env";

const EmailList = () => {
  const { emailId } = useParams();
  const [emailData, setEmailData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState(null);
  const { darkMode } = useContext(ThemeContext);
  const staggerDuration = 0.05;

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

  useEffect(() => {
    let eventSource;

    const fetchInitialEmails = async () => {
      setLoading(true);
      try {
        window.localStorage.setItem("lastEmailId", emailId);
        const response = await axios.get(`${env.REACT_APP_API_URL}/api/emails-list/${emailId}`);
        setEmailData(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching initial email data:", error);
        setEmailData([]);
        setLoading(false);
      }
    };

    const setupSSE = () => {
      eventSource = new EventSource(`${env.REACT_APP_API_URL}/api/sse/${emailId}`);

      eventSource.onmessage = (event) => {
        const newEmail = JSON.parse(event.data);
        setEmailData((prevEmails) => [newEmail, ...prevEmails]);
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        eventSource.close();
        setTimeout(setupSSE, 5000); // Attempt to reconnect after 5 seconds
      };
    };

    fetchInitialEmails();
    setupSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [emailId]);

  const handleEmailClick = (email_Id) => {
    navigate(`/inbox/${emailId}/${email_Id}`);
  };

  const handleOpenModal = async () => {
    setOpenModal(true);
  };

  const handleDeleteEmail = async (email_Id) => {
    try {
      await axios.delete(`${env.REACT_APP_API_URL}/api/email/${emailId}/${email_Id}`);
      setEmailData((prevEmails) => prevEmails.filter((email) => email._id !== email_Id));
    } catch (error) {
      console.error("Error deleting email:", error);
    }
  };
  return (
    <>
      <Grid container spacing={2} sx={{ height: "100%" }}>
        <ButtonSection />
        <Grid item xs={12} sm={1} sx={{ marginTop: isMobile ? "0vh" : "6vh" }}></Grid>
        <Grid item xs={12} sm={8} sx={{ marginTop: isMobile ? "0vh" : "6vh" }}>
          <Tooltip title="Copy Email" placement="top">
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                color: darkMode ? "#fff" : "#000",
                "&:hover": {
                  cursor: "pointer",
                },
              }}
              onClick={() => navigator.clipboard.writeText(emailId)}
            >
              {emailId} <FileCopyOutlined sx={{ marginLeft: "1rem" }} onClick={() => navigator.clipboard.writeText(emailId)} />
            </Typography>
          </Tooltip>
          {emailData.length > 0 ? (
            emailData.map((email, index) => (
              <SingleEmailItem
                email={email}
                handleEmailClick={handleEmailClick}
                handleOpenModal={handleOpenModal}
                setEmailToDelete={setEmailToDelete}
                index={index}
                staggerDuration={staggerDuration}
                isMobile={isMobile}
                key={email._id}
              />
            ))
          ) : (
            <NoEmailDisplay loading={loading} isMobile={isMobile} />
          )}
          <ConfirmModal
            open={openModal}
            setOpen={setOpenModal}
            title="Delete Email"
            body="Are you sure you want to delete this email?"
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={() => {
              handleDeleteEmail(emailToDelete);
              setOpenModal(false);
            }}
            onCancel={() => setOpenModal(false)}
          />
        </Grid>
      </Grid>
    </>
  );
};

export default EmailList;
