import { createContext, useCallback, useContext, useLayoutEffect, useState } from "react";

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
    if (meta) meta.setAttribute("content", darkMode ? "#0b0c0f" : "#f6f5f2");
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

  return <ThemeContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
