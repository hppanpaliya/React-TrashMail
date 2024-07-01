import React from "react";
import Generate from "../pages/Generate";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Inbox = () => {
  const [lastEmail, setLastEmail] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    setLastEmail(localStorage.getItem("lastEmailId"));
    console.log(lastEmail);
  }, [lastEmail]);

  useEffect(() => {
    if (lastEmail) {
      navigate(`/inbox/${lastEmail}`, { replace: true }); // By using "replace" to effectively delete '/inbox' from the history stack
    }
  }, [lastEmail, navigate]);

  return (
    <div>
      <Generate />
    </div>
  );
};

export default Inbox;
