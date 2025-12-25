import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#000",
      contrastText: "#fff",
    },
    secondary: {
      main: "#000",
      contrastText: "#fff",
    },
    text: {
      primary: "#000",
      secondary: "#666",
    },
    mode: "light",
  },
});

export default theme;
