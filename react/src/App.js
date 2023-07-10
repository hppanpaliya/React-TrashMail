import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Main from "./components/Main";
import Generate from "./components/Generate";
import Inbox from "./components/Inbox";
import InboxEmail from "./components/InboxEmail";
import EmailList from "./components/EmailList";
import AllEmailList from "./components/AllEmailList";
import theme from "./theme";
import darkTheme from "./theme/darkTheme.js";
import { ThemeProvider } from "@mui/material/styles";
import { GlobalStyles } from "@mui/material";
import { ThemeContext } from "./context/ThemeContext";
const App = () => {
  const [darkMode, setDarkMode] = React.useState(true);

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
            <Routes>
              {/* <Route path="/emails/:emailId"></Route> */}
              <Route path="/" element={<Main />} />
              <Route path="/emails" element={<Main />} />
              <Route path="/generate" element={<Generate />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/inbox/:emailId/:email_id" element={<InboxEmail />} />
              <Route path="/inbox/:emailId/" element={<EmailList />} />
              <Route path="/support" element={<Main />} />
              <Route path="/all" element={<AllEmailList />} />
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export default App;
