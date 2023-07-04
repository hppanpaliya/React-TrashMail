import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Main from "./components/Main";
import Generate from "./components/Generate";
import Inbox from "./components/Inbox";
import InboxEmail from "./components/InboxEmail";
import EmailList from "./components/EmailList";

const App = () => {
  return (
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
        </Routes>
      </div>
    </Router>
  );
};

export default App;
