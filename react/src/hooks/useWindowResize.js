import { useState, useEffect } from "react";

const getIsMobile = (breakpoint) => typeof window !== "undefined" && window.innerWidth <= breakpoint;

const useWindowResize = (breakpoint = 899) => {
  // Lazy initializer avoids a one-frame desktop-layout flash on mobile.
  const [isMobile, setIsMobile] = useState(() => getIsMobile(breakpoint));

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
};

export default useWindowResize;
