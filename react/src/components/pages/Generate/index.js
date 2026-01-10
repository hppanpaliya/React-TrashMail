import React, { useEffect, useState, useContext } from "react";
import ButtonSection from "../../common/ButtonSection";
import { Grid, Box, TextField, Button, InputAdornment, Select, MenuItem, FormControl, InputLabel, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { FileCopyOutlined } from "@mui/icons-material";
import { ThemeContext } from "../../../context/ThemeContext";
import { motion } from "framer-motion";
import { env } from "../../../env";

const parseDomains = (envVar) => {
  if (!envVar) return ["example.com"];

  let domains = [];

  try {
    const parsed = JSON.parse(envVar);
    if (Array.isArray(parsed)) {
      domains = parsed.flatMap((item) => (typeof item === "string" ? item.split(",").map((d) => d.trim()) : []));
    } else {
      domains = [String(parsed)];
    }
  } catch (e) {
    domains = envVar.split(",").map((d) => d.trim());
  }

  return domains
    .map((d) => {
      return d.replace(/[\[\]"']/g, "").trim();
    })
    .filter((d) => d.length > 0);
};

const Generate = () => {
  const navigate = useNavigate();
  const domains = parseDomains(env.REACT_APP_DOMAINS);

  const getInitialState = () => {
    const lastEmail = window.localStorage.getItem("lastEmailId");
    if (lastEmail && lastEmail.includes("@")) {
      const parts = lastEmail.split("@");
      const domain = parts.pop();
      const user = parts.join("@");
      if (domains.includes(domain)) {
        return { user, domain };
      }
    }
    return { user: "", domain: domains[0] };
  };

  const [emailDetails, setEmailDetails] = useState(getInitialState());
  const [isMobile, setIsMobile] = useState(false);

  const { darkMode } = useContext(ThemeContext);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const copyToClipboard = () => {
    const fullEmail = `${emailDetails.user}@${emailDetails.domain}`;
    if (!emailDetails.user) {
      alert("Please enter a username");
      return;
    }
    navigator.clipboard.writeText(fullEmail);
  };

  const handleUserChange = (e) => {
    // Prevent entering '@' in the username field
    const sanitizedUser = e.target.value.replace(/@/g, "");
    setEmailDetails({ ...emailDetails, user: sanitizedUser });
  };

  const handleDomainChange = (e) => {
    setEmailDetails({ ...emailDetails, domain: e.target.value });
  };

  const generateRandomEmail = () => {
    let randomUser = Math.random().toString(36).substring(5);
    let chosenDomain = domains[Math.floor(Math.random() * domains.length)];
    setEmailDetails({ user: randomUser, domain: chosenDomain });
  };

  const handleInboxRedirect = () => {
    if (!emailDetails.user) {
      alert("Please enter a username");
      return;
    }
    const fullEmail = `${emailDetails.user}@${emailDetails.domain}`;
    navigate("/inbox/" + fullEmail);
  };

  const inputContainerStyles = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: isMobile ? "column" : "row",
    gap: "0.5rem",
    width: "100%",
    marginBottom: isMobile ? "1rem" : 0,
  };

  const textFieldStyles = {
    width: isMobile ? "100%" : "auto",
    flex: isMobile ? "none" : 1,
  };

  const selectStyles = {
    width: isMobile ? "100%" : "auto",
    minWidth: isMobile ? "100%" : "200px",
    textAlign: "left",
  };

  const buttonStyles = {
    color: darkMode ? "#FFF" : "#000",
    borderColor: "#000",
    fontSize: { xs: "0.875rem", sm: "1rem" },
    padding: "0.75rem 1.5rem",
    borderRadius: "10px",
    width: "100%",
    textTransform: "capitalize",
    fontFamily: "Actor",
    fontWeight: "400",
    height: "100%",
  };

  return (
    <>
      <Grid container spacing={2} sx={{ height: "100%" }}>
        <ButtonSection />
        <Grid item xs={12} md={10} sx={{ marginTop: { xs: "2vh", sm: "6vh" } }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginTop: { xs: "2%", sm: "5%" },
              gap: 4,
              boxSizing: "border-box", // Ensure padding doesn't increase width
              px: { xs: 2, sm: 2, md: 0 },
            }}
          >
            {/* Input Section */}
            <Box sx={{ width: isMobile ? "100%" : "60%", maxWidth: "800px" }}>
              <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
                <Box sx={inputContainerStyles}>
                  <TextField
                    label="Username"
                    sx={textFieldStyles}
                    onChange={handleUserChange}
                    value={emailDetails.user}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleInboxRedirect();
                      }
                    }}
                  />
                  <Typography variant="h6" sx={{ color: darkMode ? "#FFF" : "#000" }}>
                    @
                  </Typography>
                  <FormControl sx={selectStyles}>
                    <InputLabel id="domain-select-label">Domain</InputLabel>
                    <Select
                      labelId="domain-select-label"
                      value={emailDetails.domain}
                      label="Domain"
                      onChange={handleDomainChange}
                      sx={{ color: darkMode ? "#FFF" : "#000" }}
                    >
                      {domains.map((domain) => (
                        <MenuItem key={domain} value={domain}>
                          {domain}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </motion.div>
            </Box>
            
            {/* Button Section */}
            <Box sx={{ width: isMobile ? "100%" : "60%", maxWidth: "800px" }}>
              <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 2, width: "100%" }}>
                {/* Access Account Button */}
                <Box sx={{ flex: 1 }}>
                   <motion.div initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outlined" sx={buttonStyles} onClick={() => handleInboxRedirect()}>
                        Access Account
                      </Button>
                    </motion.div>
                  </motion.div>
                </Box>

                {/* Random & Copy Buttons Container */}
                <Box sx={{ flex: 1, display: "flex", gap: 2 }}>
                   <Box sx={{ flex: 1 }}>
                      <motion.div initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button variant="outlined" sx={buttonStyles} onClick={generateRandomEmail}>
                            Random
                          </Button>
                        </motion.div>
                      </motion.div>
                   </Box>
                   <Box sx={{ flex: 1 }}>
                      <motion.div initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button variant="outlined" sx={buttonStyles} onClick={copyToClipboard}>
                            Copy
                          </Button>
                        </motion.div>
                      </motion.div>
                   </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default Generate;
