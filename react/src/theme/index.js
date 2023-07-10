import { createTheme } from "@mui/material/styles";
import { teal, green } from "@mui/material/colors";

const theme = createTheme({
  palette: {
    primary: {
      main: "#000",
      contrastText: "#000",
    },
    secondary: {
      main: "#000",
      contrastText: "#000",
    },
    text: {
      primary: "#000",
      secondary: "#000",
    },
    mode: "light",
  },
});

export default theme;
