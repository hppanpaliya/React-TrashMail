import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Main from "./components/pages/Main";
import Generate from "./components/pages/Generate";
import Inbox from "./components/Inbox";
import InboxEmail from "./components/pages/InboxEmail";
import AllEmailList from "./components/pages/AllEmailList";
import Login from "./components/pages/Login";
import Signup from "./components/pages/Signup";
import AdminDashboard from "./components/pages/AdminDashboard";
import theme from "./styles/theme";
import darkTheme from "./styles/theme/darkTheme.js";
import { ThemeProvider } from "@mui/material/styles";
import { GlobalStyles } from "@mui/material";
import { ThemeContext } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import TitleBar from "./components/common/TitleBar";
import { AnimatePresence } from "framer-motion";
import InboxList from "./components/pages/InboxList";

const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return token ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { token, user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!token) return <Navigate to="/login" />;
  
  if (user && user.role !== 'admin') {
    return <Navigate to="/" />;
  }
  
  return children;
};

const AppContent = () => {
  const [darkMode, setDarkMode] = React.useState(false);

  useEffect(() => {
    const storedDarkMode = localStorage.getItem("darkMode");
    console.log("local storage", storedDarkMode);

    let isDarkMode;
    if (storedDarkMode != null) {
      // Convert the value to a boolean
      isDarkMode = storedDarkMode === "true";
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
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route 
                  path="/admin" 
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  } 
                />
                <Route path="/" element={<PrivateRoute><Main /></PrivateRoute>} />
                <Route path="/generate" element={<PrivateRoute><Generate /></PrivateRoute>} />
                <Route path="/inbox" element={<PrivateRoute><Inbox /></PrivateRoute>} />
                <Route path="/inbox/:emailId/:email_id" element={<PrivateRoute><InboxEmail /></PrivateRoute>} />
                <Route path="/inbox/:emailId/" element={<PrivateRoute><InboxList /></PrivateRoute>} />
                <Route path="/all" element={<PrivateRoute><AllEmailList /></PrivateRoute>} />
              </Routes>
            </AnimatePresence>
          </div>
        </Router>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
