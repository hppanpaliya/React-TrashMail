import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Main from "./components/pages/Main";
import Generate from "./components/pages/Generate";
import Inbox from "./components/Inbox";
import InboxEmail from "./components/pages/InboxEmail";
import AllEmailList from "./components/pages/AllEmailList";
import theme from "./styles/theme";
import darkTheme from "./styles/theme/darkTheme.js";
import { ThemeProvider } from "@mui/material/styles";
import { GlobalStyles } from "@mui/material";
import { ThemeContext } from "./context/ThemeContext";
import TitleBar from "./components/common/TitleBar";
import { AnimatePresence } from "framer-motion";
import InboxList from "./components/pages/InboxList";
const App = () => {
  const [darkMode, setDarkMode] = React.useState(false);

  useEffect(() => {
    let isDarkMode = localStorage.getItem("darkMode");
    console.log("local storage", isDarkMode);

    if (isDarkMode != null) {
      // Convert the value to a boolean
      isDarkMode = isDarkMode === "true";
      setDarkMode(isDarkMode);
      console.log("local storage", isDarkMode);
    } else {
      isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(isDarkMode);
      console.log("system theme", isDarkMode);
      localStorage.setItem("darkMode", isDarkMode.toString());
    }
    console.log(isDarkMode);
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <ThemeProvider theme={darkMode ? darkTheme : theme}>
        <GlobalStyles
          styles={{
            body: {
              backgroundColor: darkMode ? darkTheme.palette.background.default : theme.palette.background.default,
            },
          }}
        />
        <Router>
          <div className="App">
            <TitleBar />
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Main />} />
                <Route path="/generate" element={<Generate />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/inbox/:emailId/:email_id" element={<InboxEmail />} />
                <Route path="/inbox/:emailId/" element={<InboxList />} />
                <Route path="/all" element={<AllEmailList />} />
              </Routes>
            </AnimatePresence>
          </div>
        </Router>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export default App;
