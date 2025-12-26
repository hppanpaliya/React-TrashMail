import React, { useEffect, useState, useContext } from "react";
import { Grid, Typography, Paper, Box, Chip, Tooltip, IconButton, Button, ButtonGroup, Divider } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Letter } from "react-letter";
import ButtonSection from "../../common/ButtonSection";
import InfoIcon from "@mui/icons-material/Info";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ConfirmModal from "../../common/ConfirmModal";
import { ThemeContext } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { motion } from "framer-motion";
import { env } from "../../../env";
import useWindowResize from "../../../hooks/useWindowResize";

const InboxEmail = () => {
  const { emailId, email_id } = useParams();
  const [emailData, setEmailData] = useState();
  const [emailAttachments, setEmailAttachments] = useState([]);
  const [emailHeaders, setEmailHeaders] = useState([]);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [viewMode, setViewMode] = useState("html"); // 'html', 'text', 'original'
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const isMobile = useWindowResize();
  const { darkMode } = useContext(ThemeContext);
  const { token } = useAuth();
  const navigate = useNavigate();


  let headers;

  useEffect(() => {
    const fetchEmailData = async () => {
      try {
        const response = await axios.get(`${env.REACT_APP_API_URL}/api/email/${emailId}/${email_id}`, {
          headers: { 'x-auth-token': token }
        });
        setEmailData(response.data[0]);
        console.log(response.data[0]);
        setEmailAttachments(response.data[0].attachments);
        setEmailHeaders(response.data[0].headerLines);
      } catch (error) {
        console.error("Error fetching email data:", error);
      }
    };

    if (token) {
      fetchEmailData();
    }
  }, [email_id, emailId, token]);

  if (emailHeaders) {
    headers = emailHeaders.map((header, i) => {
      return (
        <Typography
          variant="body2"
          key={i}
          sx={{
            wordBreak: "break-all",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <strong style={{ whiteSpace: "nowrap" }}>
            {header.line.split(":")[0]}
            {" :  "}
          </strong>
          {header.line.split(":")[1]}
        </Typography>
      );
    });
  } else {
    headers = <Typography variant="body2">No Headers</Typography>;
  }
  const handleTooltip = () => {
    setIsTooltipOpen(!isTooltipOpen);
  };

  const handleDeleteEmail = async () => {
    try {
      await axios.delete(`${env.REACT_APP_API_URL}/api/email/${emailId}/${email_id}`, {
        headers: { 'x-auth-token': token }
      });
      navigate(`/inbox/${emailId}`);
    } catch (error) {
      console.error("Error deleting email:", error);
    }
  };

  console.log(emailData);

  const containerVariants = {
    initial: {
      opacity: 0,
    },
    animate: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.2,
      },
    },
  };

  const childVariants = {
    initial: {
      opacity: 0,
      y: -20,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <>
      <Grid container spacing={2} sx={{ height: "100%" }}>
        <ButtonSection />
        <Grid item xs={12} md={1} sx={{ marginTop: isMobile ? "0vh" : "6vh" }}></Grid>
        <Grid item xs={12} md={8} sx={{ marginTop: isMobile ? "0vh" : "6vh" }}>
          <Paper
            elevation={3}
            sx={{
              margin: isMobile ? "6vh 2vh 2vh 2vh" : "0vh 0vh 2vh 0vh",
              overflow: "hidden",
            }}
          >
            <motion.div variants={containerVariants} initial="initial" animate="animate">
              {/* Header Section with Back Button */}
              <motion.div variants={childVariants}>
                <Box sx={{ p: 2, pb: 0 }}>
                  <IconButton 
                    onClick={() => navigate(`/inbox/${emailId}`)}
                    sx={{ mb: 1 }}
                    size="small"
                  >
                    <ArrowBackIcon />
                  </IconButton>
                </Box>
              </motion.div>

              {/* Subject */}
              <motion.div variants={childVariants}>
                <Box sx={{ px: { xs: 2, sm: 2 }, pt: 1 }}>
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    sx={{
                      fontWeight: 600,
                      wordBreak: "break-word",
                      mb: 2,
                      fontSize: { xs: "1.1rem", sm: "1.25rem", md: "1.5rem" },
                    }}
                  >
                    {emailData?.subject || "No Subject"}
                  </Typography>
                </Box>
              </motion.div>

              {/* Email Metadata */}
              <motion.div variants={childVariants}>
                <Box sx={{ px: { xs: 2, sm: 2 }, pb: 2 }}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: { xs: "0.8rem", sm: "0.875rem" }, wordBreak: "break-word" }}>
                      <strong>From:</strong> {emailData?.from.text || "No From"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: { xs: "0.8rem", sm: "0.875rem" }, wordBreak: "break-word" }}>
                      <strong>To:</strong> {emailData?.to.text || "No To"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                      <strong>Date:</strong> {emailData?.date ? new Date(emailData.date).toLocaleString() : "No Date"}
                    </Typography>
                  </Box>
                </Box>
              </motion.div>

              <Divider />

              {/* Action Toolbar */}
              <motion.div variants={childVariants}>
                <Box 
                  sx={{ 
                    px: { xs: 1, sm: 2 }, 
                    py: 1.5,
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "stretch" : "center",
                    gap: isMobile ? 1.5 : 2,
                    bgcolor: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"
                  }}
                >
                  {/* View Mode Buttons */}
                  <ButtonGroup 
                    variant="outlined" 
                    size={isMobile ? "small" : "medium"}
                    fullWidth={isMobile}
                    sx={{ flexShrink: 0 }}
                  >
                    <Button 
                      variant={viewMode === "html" ? "contained" : "outlined"} 
                      onClick={() => setViewMode("html")}
                    >
                      HTML
                    </Button>
                    <Button 
                      variant={viewMode === "text" ? "contained" : "outlined"} 
                      onClick={() => setViewMode("text")}
                      disabled={!emailData?.text}
                    >
                      Text
                    </Button>
                    {emailData?.htmlOriginal && (
                      <Button 
                        variant={viewMode === "original" ? "contained" : "outlined"} 
                        onClick={() => setViewMode("original")}
                        color="warning"
                      >
                        Original
                      </Button>
                    )}
                  </ButtonGroup>

                  {/* Action Buttons */}
                  <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                    <Tooltip title="Security Information">
                      <IconButton 
                        onClick={handleTooltip}
                        size={isMobile ? "small" : "medium"}
                        color={isTooltipOpen ? "primary" : "default"}
                      >
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                    <Button 
                      variant="outlined" 
                      color="error" 
                      size={isMobile ? "small" : "medium"}
                      startIcon={<DeleteIcon />}
                      onClick={() => setOpenDeleteModal(true)}
                      fullWidth={isMobile}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              </motion.div>

              <Divider />


              {/* Security Headers (Collapsible) */}
              {isTooltipOpen && (
                <motion.div variants={childVariants}>
                  <Box sx={{ px: 2, py: 2, bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Email Headers
                    </Typography>
                    <Box sx={{ maxHeight: "200px", overflow: "auto" }}>
                      {headers}
                    </Box>
                  </Box>
                  <Divider />
                </motion.div>
              )}

              {/* Email Content */}
              <motion.div variants={childVariants}>
                <Box sx={{ p: { xs: 1.5, sm: 2 }, minHeight: "200px" }}>
                  {viewMode === "text" ? (
                    <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", maxHeight: "600px", overflow: "auto", borderRadius: 1 }}>
                      <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word", fontFamily: "monospace", margin: 0, fontSize: isMobile ? "12px" : "14px" }}>
                        {emailData?.text || "No Text Content"}
                      </pre>
                    </Paper>
                  ) : (
                    <Box sx={{ maxWidth: "100%", overflowX: "auto" }}>
                      <Letter 
                        html={
                          viewMode === "original" 
                            ? (emailData?.htmlOriginal || emailData?.html) 
                            : (emailData?.html || "<p>No Message</p>")
                        } 
                        text={emailData?.text || "No Message"} 
                      />
                    </Box>
                  )}
                </Box>
              </motion.div>

              {/* Attachments Section */}
              {emailAttachments && emailAttachments.length > 0 && (
                <>
                  <Divider />
                  <motion.div variants={childVariants}>
                    <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 1, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                        <AttachFileIcon fontSize="small" />
                        Attachments ({emailAttachments.length})
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {emailAttachments.map((attachment, i) => (
                          <Chip
                            key={i}
                            label={attachment.filename}
                            onClick={() =>
                              window.open(`${env.REACT_APP_API_URL}/api/attachment/${attachment.directory}/${attachment.filename}`, "_blank")
                            }
                            icon={<AttachFileIcon />}
                            clickable
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: { xs: "0.75rem", sm: "0.8125rem" } }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </motion.div>
                </>
              )}
            </motion.div>
          </Paper>
        </Grid>
        <ConfirmModal
          open={openDeleteModal}
          setOpen={setOpenDeleteModal}
          title="Delete Email"
          body="Are you sure you want to delete this email?"
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            handleDeleteEmail();
            setOpenDeleteModal(false);
          }}
          onCancel={() => setOpenDeleteModal(false)}
        />
        <style>
          {`
          a {
            color: ${darkMode ? "#fff" : ""};
            font-weight: bold;
          }
        `}
        </style>
      </Grid>
    </>
  );
};

export default InboxEmail;
