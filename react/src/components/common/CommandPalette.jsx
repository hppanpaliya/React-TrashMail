import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PenLine, Inbox, Mails, ShieldCheck, Copy, Shuffle, History, SunMedium, MoonStar, Watch, LogOut, Search, Keyboard } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useSnackbar } from "../../context/SnackbarContext";
import { useConfig } from "../../context/ConfigContext";
import { env } from "../../env";
import { cx } from "../../utils/cx";
import { fuzzyScore } from "../../utils/fuzzy";
import { copyText } from "../../utils/clipboard";
import { randomUsername } from "../../utils/random";
import { parseDomains } from "../../utils/domains";
import { getRecentInboxes } from "../../utils/recentInboxes";
import { inboxPath, watchPath } from "../../utils/routes";

// Address of the inbox currently on screen, if any.
export const currentInboxFromPath = (pathname) => {
  const match = pathname.match(/^\/(?:inbox|watch)\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

// ⌘K command palette: fuzzy-filtered actions, fully keyboard-navigable.
const CommandPalette = ({ open, onClose, onShowShortcuts }) => {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { domains: configDomains } = useConfig();
  const showSnackbar = useSnackbar();

  const currentAddress = currentInboxFromPath(pathname);

  const actions = useMemo(() => {
    if (!open) return [];

    const domains = configDomains || parseDomains(env.REACT_APP_DOMAINS);
    const items = [
      { id: "nav-generate", label: "Go to Generate", icon: PenLine, run: () => navigate("/generate") },
      { id: "nav-inbox", label: "Go to Inbox", icon: Inbox, run: () => navigate("/inbox") },
      { id: "nav-all", label: "Go to All Mail", icon: Mails, run: () => navigate("/all") },
    ];

    if (user?.role === "admin") {
      items.push({ id: "nav-admin", label: "Go to Admin", icon: ShieldCheck, run: () => navigate("/admin") });
    }

    if (currentAddress) {
      items.push({
        id: "copy-address",
        label: `Copy ${currentAddress}`,
        hint: "C",
        icon: Copy,
        run: async () => {
          const ok = await copyText(currentAddress);
          showSnackbar(ok ? "Copied!" : "Could not copy address", ok ? "success" : "error");
        },
      });
    }

    // No action when no domains are configured — it could only navigate to
    // a broken @undefined address.
    if (domains.length > 0) {
      items.push({
        id: "random-address",
        label: "New random address",
        hint: "N",
        icon: Shuffle,
        run: () => {
          const domain = domains[Math.floor(Math.random() * domains.length)];
          navigate(inboxPath(`${randomUsername(10)}@${domain}`));
        },
      });
    }

    for (const address of getRecentInboxes()
      .filter((item) => item !== currentAddress)
      .slice(0, 5)) {
      items.push({
        id: `recent-${address}`,
        label: `Open ${address}`,
        icon: History,
        run: () => navigate(inboxPath(address)),
      });
    }

    items.push(
      {
        id: "toggle-theme",
        label: darkMode ? "Switch to light mode" : "Switch to dark mode",
        hint: "D",
        icon: darkMode ? SunMedium : MoonStar,
        run: toggleDarkMode,
      },
      {
        id: "watch-mode",
        label: "Open watch view",
        icon: Watch,
        run: () => navigate(currentAddress ? watchPath(currentAddress) : "/watch"),
      },
      { id: "shortcuts", label: "Keyboard shortcuts", hint: "?", icon: Keyboard, run: onShowShortcuts },
      {
        id: "sign-out",
        label: "Sign out",
        icon: LogOut,
        run: () => {
          logout();
          navigate("/login");
        },
      }
    );

    return items;
  }, [open, user, currentAddress, configDomains, darkMode, toggleDarkMode, navigate, showSnackbar, logout, onShowShortcuts]);

  const results = useMemo(() => {
    return actions
      .map((action) => ({ action, score: fuzzyScore(query.trim(), action.label) }))
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.action);
  }, [actions, query]);

  // Reset state each time the palette opens; clamp selection as results change.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const activeElement = listRef.current?.querySelector('[data-active="true"]');
    activeElement?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results]);

  const runAction = (action) => {
    onClose();
    action.run();
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (results[activeIndex]) runAction(results[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12dvh]"
          initial={{ opacity: reduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reduceMotion ? 1 : 0 }}
          transition={{ duration: 0.12 }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-hairline bg-overlay shadow-lift"
          >
            <div className="relative border-b border-hairline">
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <input
                autoFocus
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-palette-list"
                aria-activedescendant={results[activeIndex] ? `palette-${results[activeIndex].id}` : undefined}
                aria-label="Search commands"
                placeholder="Type a command…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                className="h-12 w-full bg-transparent pl-11 pr-4 text-sm text-ink placeholder:text-faint outline-none"
              />
            </div>

            <ul id="command-palette-list" ref={listRef} role="listbox" aria-label="Commands" className="max-h-[45dvh] overflow-y-auto p-1.5">
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matching commands</li>}
              {results.map((action, index) => {
                const Icon = action.icon;
                const active = index === activeIndex;
                return (
                  <li
                    key={action.id}
                    id={`palette-${action.id}`}
                    role="option"
                    aria-selected={active}
                    data-active={active || undefined}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => runAction(action)}
                    className={cx(
                      "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-100",
                      active ? "bg-accent-soft text-accent" : "text-muted"
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{action.label}</span>
                    {action.hint && (
                      <kbd className="rounded-md border border-hairline bg-raised px-1.5 py-0.5 font-mono text-[11px] text-faint">{action.hint}</kbd>
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CommandPalette;
