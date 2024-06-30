import React, { useEffect, useState, useContext } from "react";
import { Grid, Typography, Paper, Box, Chip, Tooltip, IconButton } from "@mui/material";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Letter } from "react-letter";
import ButtonSection from "../ButtonSection";
import InfoIcon from "@mui/icons-material/Info";
import { ThemeContext } from "../../context/ThemeContext";
import { motion } from "framer-motion";
import { env } from "../../env";

const InboxEmail = () => {
  const { emailId, email_id } = useParams();
  const [emailData, setEmailData] = useState();
  const [emailAttachments, setEmailAttachments] = useState([]);
  const [emailHeaders, setEmailHeaders] = useState([]);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { darkMode } = useContext(ThemeContext);

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

  let headers;

  useEffect(() => {
    const fetchEmailData = async () => {
      try {
        const response = await axios.get(`${env.REACT_APP_API_URL}/api/email/${emailId}/${email_id}`);
        setEmailData(response.data[0]);
        console.log(response.data[0]);
        setEmailAttachments(response.data[0].attachments);
        setEmailHeaders(response.data[0].headerLines);
      } catch (error) {
        console.error("Error fetching email data:", error);
      }
    };

    fetchEmailData();
  }, [email_id, emailId]);

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
        <Grid item xs={12} sm={1} sx={{ marginTop: isMobile ? "0vh" : "6vh" }}></Grid>
        <Grid item xs={12} sm={8} sx={{ marginTop: isMobile ? "0vh" : "6vh" }}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              margin: isMobile ? "6vh" : "0vh",
              marginBottom: 2,
            }}
          >
            <motion.div variants={containerVariants} initial="initial" animate="animate">
              <motion.div variants={childVariants}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    wordBreak: "break-all",
                  }}
                >
                  {emailData?.subject || "No Subject"}
                </Typography>
              </motion.div>
              <motion.div variants={childVariants}>
                <Box
                  display="flex"
                  alignItems="center"
                  gap={2}
                  mb={2}
                  sx={{
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    wordBreak: "break-all",
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                  }}
                >
                  <Typography variant="subtitle1">From: {emailData?.from.text || "No From"}</Typography>
                  <Tooltip title="Click to copy to clipboard" placement="top">
                    <Chip
                      label={`To: ${emailData?.to.text || "No To"}`}
                      onClick={() => emailData?.to.text && navigator.clipboard.writeText(emailData.to.text)}
                    />
                  </Tooltip>
                </Box>
              </motion.div>
              <motion.div variants={childVariants}>
                <Typography variant="body1" mb={2}>
                  Date: {emailData?.date ? new Date(emailData.date).toLocaleString() : "No Date"}
                </Typography>
              </motion.div>
              <motion.div variants={childVariants}>
                <Box sx={{ maxWidth: "100%", overflowX: "auto" }}>
                  <Letter html={emailData?.html || "<p>No Message</p>"} text={emailData?.text || "No Message"} />
                </Box>
              </motion.div>
              <motion.div variants={childVariants}>
                <Typography variant="body1">Attachments: {emailData ? emailAttachments.length : "No Attachments"}</Typography>
              </motion.div>
              <motion.div variants={childVariants}>
                {emailAttachments.map((attachment, i) => {
                  return (
                    <Box key={i} display="flex" alignItems="center" gap={2} mb={2}>
                      <Chip
                        label={attachment.filename}
                        onClick={() => window.open(`${env.REACT_APP_API_URL}/api/attachment/${attachment.directory}/${attachment.filename}`, "_blank")}
                      />
                    </Box>
                  );
                })}
              </motion.div>
              <motion.div variants={childVariants}>
                <Tooltip title="Security Information" placement="top" onClick={handleTooltip}>
                  <IconButton aria-label="security">
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              </motion.div>
              <motion.div variants={childVariants}>
                <Box alignItems="center" id="securityInfo">
                  {isTooltipOpen ? headers : null}
                </Box>
              </motion.div>
            </motion.div>
          </Paper>
        </Grid>
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
