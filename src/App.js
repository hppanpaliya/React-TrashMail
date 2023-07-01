import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import EmailList from "./components/EmailList";
import Main from "./components/Main";
import Generate from "./components/Generate";

const App = () => {
  return (
    <Router>
      <EmailList />

      <div className="App">
        <Routes>
          {/* <Route path="/emails/:emailId"></Route> */}
          <Route path="/" element={<Main />} />
          <Route path="/emails" element={<Main />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/index" element={<Main />} />
          <Route path="/support" element={<Main />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
