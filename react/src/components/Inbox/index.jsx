import Generate from "../pages/Generate";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Inbox = () => {
  // Lazy initializer reads storage before first render, so there is no flash
  // of the Generate fallback and no need for a layout effect.
  const [lastEmail] = useState(() => localStorage.getItem("lastEmailId"));
  const navigate = useNavigate();

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
