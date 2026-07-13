import { Link, useLocation, useNavigate } from "react-router-dom";
import { PenLine, Inbox, Mails, ShieldCheck, SunMedium, MoonStar, LogOut, Command } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import IconButton from "../ui/IconButton";
import { cx } from "../../utils/cx";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

// Faint giant brand watermark — a nod to the original design.
export const Watermark = () => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[-1] hidden overflow-hidden sm:block">
    <span className="absolute -bottom-20 -right-12 select-none font-display text-[13rem] font-semibold leading-none tracking-tighter text-gold opacity-[0.05] lg:text-[17rem]">
      TrashMail
    </span>
  </div>
);

const Wordmark = ({ className }) => (
  <Link to="/" className={cx("font-display text-2xl font-bold leading-none text-ink focus-ring rounded-md", className)}>
    TrashMail
  </Link>
);

const NAV_ITEMS = [
  { to: "/generate", label: "Generate", icon: PenLine },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/all", label: "All Mail", icon: Mails },
];

const useNav = () => {
  const { user } = useAuth();
  return user?.role === "admin" ? [...NAV_ITEMS, { to: "/admin", label: "Admin", icon: ShieldCheck }] : NAV_ITEMS;
};

const isActive = (pathname, to) => pathname === to || pathname.startsWith(to + "/");

const RailNavItem = ({ to, label, icon: Icon, active }) => (
  <Link
    to={to}
    aria-current={active ? "page" : undefined}
    className={cx(
      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 focus-ring",
      active ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-raised hover:text-ink"
    )}
  >
    <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
    {label}
  </Link>
);

const ThemeToggle = ({ size = "md" }) => {
  const { darkMode, toggleDarkMode } = useTheme();
  return (
    <IconButton label={darkMode ? "Switch to light mode" : "Switch to dark mode"} size={size} onClick={toggleDarkMode}>
      {darkMode ? <SunMedium /> : <MoonStar />}
    </IconButton>
  );
};

// App chrome: desktop nav rail + mobile sticky header and bottom tab bar.
// Renders minimal chrome (wordmark + theme toggle) when signed out.
const AppShell = ({ children, onOpenPalette }) => {
  const { token, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const nav = useNav();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!token) {
    return (
      <div className="min-h-dvh">
        <Watermark />
        <header className="flex h-14 items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <ThemeToggle />
        </header>
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <Watermark />

      {/* Desktop nav rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-hairline bg-raised/60 backdrop-blur-xl md:flex">
        <div className="px-5 pb-2 pt-5">
          <Wordmark />
        </div>
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3 pt-4">
          {nav.map((item) => (
            <RailNavItem key={item.to} {...item} active={isActive(pathname, item.to)} />
          ))}
        </nav>
        <div className="flex flex-col gap-1 px-3 pb-4">
          {onOpenPalette && (
            <button
              type="button"
              onClick={onOpenPalette}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition-colors duration-150 hover:bg-raised hover:text-ink focus-ring cursor-pointer"
            >
              <Command aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
              Commands
              <kbd className="ml-auto rounded-md border border-hairline bg-raised px-1.5 py-0.5 font-mono text-[11px] text-faint">
                {isMac ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>
          )}
          <div className="flex items-center justify-between px-1 pt-1">
            <ThemeToggle />
            <IconButton label="Sign out" onClick={handleLogout}>
              <LogOut />
            </IconButton>
          </div>
        </div>
      </aside>

      {/* Mobile sticky header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hairline bg-base/85 px-4 backdrop-blur-xl md:hidden">
        <Wordmark className="text-xl" />
        <div className="flex items-center gap-1">
          <ThemeToggle size="sm" />
          <IconButton label="Sign out" size="sm" onClick={handleLogout}>
            <LogOut />
          </IconButton>
        </div>
      </header>

      {/* Content column */}
      <main className="pb-24 md:pb-12 md:pl-56">
        <div className="mx-auto w-full max-w-3xl px-4 pt-4 sm:px-6 md:pt-8">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-base/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = isActive(pathname, to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-2 pt-1.5 pb-1 text-[11px] font-medium transition-colors duration-150 focus-ring",
                  active ? "text-accent" : "text-muted hover:text-ink"
                )}
              >
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppShell;
