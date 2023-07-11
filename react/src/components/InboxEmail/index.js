import React, { useEffect, useState } from "react";
import { Grid, Typography, Paper, Box, Chip, Tooltip, IconButton } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import ButtonSection from "../ButtonSection";
import TitleBar from "../TitleBar";
import InfoIcon from "@mui/icons-material/Info";
import { theme } from "../../theme";
import { darkTheme } from "../../theme/darkTheme";
import { ThemeContext } from "../../context/ThemeContext";
import { useContext } from "react";

const InboxEmail = () => {
  const navigate = useNavigate();
  const { emailId } = useParams();
  const { email_id } = useParams();
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
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/email/${emailId}/${email_id}`);
        setEmailData(response.data[0]);
        console.log(response.data[0]);
        setEmailAttachments(response.data[0].attachments);
        setEmailHeaders(response.data[0].headerLines);
      } catch (error) {
        console.error("Error fetching email data:", error);
      }
    };

    fetchEmailData();
  }, [email_id]);

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

  return (
    <>
      <TitleBar />
      <Grid container spacing={2} sx={{ height: "100%" }}>
        <ButtonSection />
        <Grid item xs={12} sm={1} sx={{ marginTop: isMobile ? "0vh" : "6vh" }}></Grid>
        <Grid item xs={12} sm={8} sx={{ marginTop: isMobile ? "0vh" : "6vh" }}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              margin: isMobile ? "6vh" : "0vh",
            }}
          >
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
              {emailData ? emailData.subject : "No Subject"}
            </Typography>
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
              <Typography variant="subtitle1">From: {emailData ? emailData.from.text : "No From"}</Typography>
              <Chip label={`To: ${emailData ? emailData.to.text : "No To"}`} />
            </Box>
            <Typography variant="body1" mb={2}>
              Date: {emailData ? new Date(emailData.date).toLocaleString() : "No Date"}
            </Typography>
            <Typography
              variant="body1"
              mb={2}
              sx={{
                justifyContent: "center",

                wordBreak: "break-all",
              }}
              dangerouslySetInnerHTML={{ __html: emailData ? emailData.textAsHtml : "No Message" }}
            />
            <Typography variant="body1">Attachments: {emailData ? emailAttachments.length : "No Attachments"}</Typography>
            {emailAttachments.map((attachment, i) => {
              return (
                <Box key={i} display="flex" alignItems="center" gap={2} mb={2}>
                  <Chip
                    label={attachment.filename}
                    onClick={() =>
                      // Navigate to the attachment URL in a new tab
                      window.open(`${process.env.REACT_APP_API_URL}/attachment/${attachment.directory}/${attachment.filename}`, "_blank")
                    }
                  />
                </Box>
              );
            })}

            <Tooltip
              title="Security Information"
              placement="top"
              // Pass the state value to the 'open' prop
              onClick={handleTooltip} // Handle click event
            >
              <IconButton aria-label="security">
                <InfoIcon />
              </IconButton>
            </Tooltip>
            <Box alignItems="center" id="securityInfo">
              {isTooltipOpen ? headers : null}
            </Box>
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
