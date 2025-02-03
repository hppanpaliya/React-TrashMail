import React from "react";
import { Button, Grid, Box } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { useContext } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import useWindowResize from "../../hooks/useWindowResize";

const ButtonSection = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  const darkModeToggle = () => {
    const modeToggle = !darkMode;
    localStorage.setItem("darkMode", modeToggle.toString());
    setDarkMode(modeToggle);
  };

  const buttonStyles = {
    borderColor: "#000",
    fontSize: "1.3rem",
    paddingTop: "1.35rem",
    paddingBottom: "1.35rem",
    paddingLeft: "2rem",
    paddingRight: "2rem",
    borderRadius: "10px",
    width: "70%",
    height: "70%",
    textTransform: "capitalize",
    fontFamily: "Actor",
    fontWeight: "400",
    wordWrap: "break-word",
  };

  const buttonStylesMobile = {
    borderColor: "#000",
    fontSize: "1.3rem",
    paddingTop: "1.35rem",
    paddingBottom: "1.35rem",
    paddingLeft: "2rem",
    paddingRight: "2rem",
    borderRadius: "10px",
    width: "70%",
    height: "70%",
    textTransform: "capitalize",
    fontFamily: "Actor",
    fontWeight: "400",
    wordWrap: "break-word",
    alignItems: "center",
    justifyContent: "center",
  };

  const location = useLocation();
  // const [activePage, setActivePage] = useState("");

  // useEffect(() => {
  //   setActivePage(location.pathname);
  // }, [location]);

  const isActivePage = (path) => {
    const { pathname } = location;

    const isActive = pathname === path || pathname.startsWith(path + "/");
    return isActive
      ? {
          backgroundColor: "#000",
          color: "#FFF",
          "&:hover": {
            backgroundColor: "#FFF",
            color: "#000",
          },
        }
      : {};
  };

  const isMobile = useWindowResize();

  return (
    <Grid
      item
      md={2}
      sx={{
        marginTop: isMobile ? "0vh" : "12vh",
        display: isMobile ? "flex" : "initial",
        flexDirection: isMobile ? "row" : "column",
        justifyContent: isMobile ? "center" : "initial",
        alignItems: isMobile ? "center" : "initial",
        width: isMobile ? "100%" : "initial",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "12vh",
          width: isMobile ? "33%" : "100%",
        }}
      >
        <Button
          variant="outlined"
          sx={isMobile ? { ...buttonStylesMobile, ...isActivePage("/generate") } : { ...buttonStyles, ...isActivePage("/generate") }}
          component={Link}
          to="/generate"
        >
          Generate
        </Button>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "12vh",
          width: isMobile ? "33%" : "100%",
        }}
      >
        <Button
          variant="outlined"
          sx={isMobile ? { ...buttonStylesMobile, ...isActivePage("/inbox") } : { ...buttonStyles, ...isActivePage("/inbox") }}
          component={Link}
          to="/inbox"
        >
          Inbox
        </Button>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "12vh",
          width: isMobile ? "33%" : "100%",
        }}
      >
        <Button
          variant="outlined"
          sx={isMobile ? { ...buttonStylesMobile, ...isActivePage("/support") } : { ...buttonStyles, ...isActivePage("/support") }}
          // component={Link}
          // to="/support"
          onClick={darkModeToggle}
        >
          {darkMode ? "Light" : "Dark"}
        </Button>
      </Box>
    </Grid>
  );
};

export default ButtonSection;
