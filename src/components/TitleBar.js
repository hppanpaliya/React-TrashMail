import React from "react";
import { Link } from "react-router-dom";
import { Box, Button, Typography, Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
const TitleBar = () => {
  const navigate = useNavigate();
  return (
    <>
      <p
        style={{
          display: "flex",
          position: "absolute",
          left: "35.7%",
          top: "51%",
          opacity: "0.2",
          justifyContent: "flex-start",
          textAlign: "left",
          margin: "0",
          boxSizing: "border-box",
          fontSize: "187.5pt",
          fontFamily: "Abhaya Libre SemiBold",
          fontWeight: "400",
          color: "#ecca7b",
          letterSpacing: "-5px",
          textOverflow: "ellipsis",
          overflow: "hidden",
        }}
      >
        TrashMail
      </p>
      <Grid item xs={12} sm={2}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 3,
            marginLeft: "2%",
            marginTop: "2%",
          }}
        >
          <Typography
            varient="h1"
            sx={{
              color: "#000",
              fontSize: "2rem",
              fontFamily: "Abhaya Libre",
              fontWeight: 700,
              lineHeight: "1.125rem",
            }}
            onClick={() => navigate("/")}
          >
            TrashMail
          </Typography>

          {/* <Typography variant="h5">
            <Button onClick={() => navigate("/admin")}>
              <PersonIcon />
            </Button>
          </Typography> */}
        </Box>
      </Grid>
    </>
  );
};

export default TitleBar;
