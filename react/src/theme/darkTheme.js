import { createTheme } from "@mui/material/styles";

const darkTheme = createTheme({
  typography: {
    fontFamily: "Roboto, sans-serif",
  },
  palette: {
    primary: {
      main: "#fff",
      contrastText: "#fff",
    },
    secondary: {
      main: "#fff",
      contrastText: "#fff",
    },
    text: {
      primary: "#fff",
      secondary: "#fff",
    },
    mode: "dark",
    background: {
      default: "#121212",
      paper: "#1e1e1e",
      box: "#1e1e1e",
    },
    error: {
      main: "#ff0000",
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
          backgroundColor: "#1e1e1e",
          "&.Mui-focused": {
            color: "#fff",
          },
        },
        input: {
          color: "#fff",
        },
        inputLabel: {
          color: "#fff",
        },

        notchedOutline: {
          borderColor: "#fff",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: "#1e1e1e",
          color: "#fff",

          "&:hover": {
            backgroundColor: "#1f1f1f",
            color: "#fff",
          },
          "&:active": {
            backgroundColor: "#000",
            color: "#fff",
          },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: {},
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          // color: "#6D83B2",
          // "&.Mui-selected": {
          //   backgroundColor: "#9BC1BC",
          //   color: "#fff",
          //   "&:hover": {
          //     backgroundColor: "#8EB3B0",
          //   },
          // },
        },
      },
    },
  },
});

export default darkTheme;
