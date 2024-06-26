import React, { useEffect, useState, useRef, useContext } from "react";
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
  const [reload, setReload] = useState(false);
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

  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const fetchEmailData = async () => {
      try {
        window.localStorage.setItem("lastEmailId", emailId);
        const response = await axios.get(`${env.REACT_APP_API_URL}/emails-list/${emailId}`);
        setEmailData(response.data);
        console.log(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching email data:", error);
        setEmailData([]);
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
  }, [emailId, reload]);

  const handleEmailClick = (email_Id) => {
    navigate(`/inbox/${emailId}/${email_Id}`);
  };

  const handleOpenModal = async () => {
    setOpenModal(true);
  };

  const handleDeleteEmail = async (email_Id) => {
    try {
      await axios.delete(`${env.REACT_APP_API_URL}/email/${emailId}/${email_Id}`);
      // Refresh the email list after successful deletion
      setReload(!reload);
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
