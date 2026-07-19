import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";

// Theme state: persisted in localStorage ("darkMode"), defaulting to the
// system preference. The `dark` class on <html> drives all CSS tokens.
export const ThemeContext = createContext({ darkMode: true, setDarkMode: () => {}, toggleDarkMode: () => {} });

const getInitialDarkMode = () => {
  try {
    const stored = localStorage.getItem("darkMode");
    if (stored != null) return stored === "true";
  } catch {
    // storage unavailable — fall through to system preference
  }
  return typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)").matches : true;
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkModeState] = useState(getInitialDarkMode);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", darkMode ? "#0a0a0a" : "#fafafa");
  }, [darkMode]);

  const setDarkMode = useCallback((value) => {
    setDarkModeState(value);
    try {
      localStorage.setItem("darkMode", value.toString());
    } catch {
      // non-fatal
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkModeState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("darkMode", next.toString());
      } catch {
        // non-fatal
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ darkMode, setDarkMode, toggleDarkMode }), [darkMode, setDarkMode, toggleDarkMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
