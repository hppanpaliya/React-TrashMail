import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useSnackbar } from "../context/SnackbarContext";
import { useConfig } from "../context/ConfigContext";
import { env } from "../env";
import { copyText } from "../utils/clipboard";
import { randomUsername } from "../utils/random";
import { parseDomains } from "../utils/domains";
import { currentInboxFromPath } from "../components/common/CommandPalette";

const isTyping = (target) =>
  target instanceof HTMLElement &&
  (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);

// Global keyboard shortcuts: ⌘K palette plus single keys (/, c, n, d, ?)
// that only fire when the user isn't typing and no modal traps focus.
const useGlobalShortcuts = ({ enabled, onOpenPalette, onOpenHelp }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toggleDarkMode } = useTheme();
  const { domains: configDomains } = useConfig();
  const showSnackbar = useSnackbar();

  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenPalette();
        return;
      }

      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      // A dialog is open — let it own the keyboard.
      if (document.querySelector('[role="dialog"]')) return;

      switch (event.key) {
        case "/": {
          const search = document.querySelector("[data-search-input]");
          if (search) {
            event.preventDefault();
            search.focus();
          }
          break;
        }
        case "c":
        case "C": {
          const address = currentInboxFromPath(pathname);
          if (address) {
            copyText(address).then((ok) => showSnackbar(ok ? "Copied!" : "Could not copy address", ok ? "success" : "error"));
          }
          break;
        }
        case "n":
        case "N": {
          const domains = configDomains || parseDomains(env.REACT_APP_DOMAINS);
          const domain = domains[Math.floor(Math.random() * domains.length)];
          navigate(`/inbox/${randomUsername(10)}@${domain}`);
          break;
        }
        case "d":
        case "D":
          toggleDarkMode();
          break;
        case "?":
          onOpenHelp();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, pathname, configDomains, navigate, toggleDarkMode, showSnackbar, onOpenPalette, onOpenHelp]);
};

export default useGlobalShortcuts;
