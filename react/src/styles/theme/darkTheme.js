import { createTheme } from "@mui/material/styles";

const darkTheme = createTheme({
  typography: {
    fontFamily: "Roboto, sans-serif",
  },
  palette: {
    primary: {
      main: "#90caf9", // Light blue, you can pick your own
      contrastText: "#fff",
    },
    secondary: {
      main: "#f48fb1", // Light pink, you can pick your own
      contrastText: "#fff",
    },
    text: {
      primary: "#ffffff",
      secondary: "#bbbbbb", // Light gray for secondary text
    },
    mode: "dark",
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
    error: {
      main: "#ff5252",
      contrastText: "#fff",
    },
  },
  components: {
    MuiBox: {
      styleOverrides: {
        root: {
          backgroundColor: "#1e1e1e",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "#1e1e1e",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiInputBase-root": {
            color: "#ffffff", // Primary text color
          },
          "& .MuiInputLabel-root": {
            color: "#bbbbbb", // Secondary text color
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#333333", // Border color
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: "#333333", // Button color
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#555555",
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: "#ffffff",
          "&.Mui-selected": {
            backgroundColor: "#333333",
            "&:hover": {
              backgroundColor: "#555555",
            },
          },
        },
      },
    },
  },
});

export default darkTheme;
