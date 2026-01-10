import Generate from "../pages/Generate";
import { useEffect, useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";

const Inbox = () => {
  const [lastEmail, setLastEmail] = useState();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    setLastEmail(localStorage.getItem("lastEmailId"));
  }, []);

  useEffect(() => {
    if (lastEmail) {
      console.log(lastEmail);
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
