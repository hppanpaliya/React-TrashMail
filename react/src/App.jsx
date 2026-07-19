import { useCallback, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Main from "./components/pages/Main";
import Generate from "./components/pages/Generate";
import Inbox from "./components/Inbox";
import InboxEmail from "./components/pages/InboxEmail";
import InboxList from "./components/pages/InboxList";
import AllEmailList from "./components/pages/AllEmailList";
import Login from "./components/pages/Login";
import Signup from "./components/pages/Signup";
import AdminDashboard from "./components/pages/AdminDashboard";
import WatchView from "./components/pages/WatchView";
import AppShell from "./components/layout/AppShell";
import ErrorBoundary from "./components/ErrorBoundary";
import CommandPalette from "./components/common/CommandPalette";
import ShortcutsDialog from "./components/common/ShortcutsDialog";
import Spinner from "./components/ui/Spinner";
import useGlobalShortcuts from "./hooks/useGlobalShortcuts";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SnackbarProvider } from "./context/SnackbarContext";
import { ConfigProvider } from "./context/ConfigContext";

const CenteredLoader = () => (
  <div className="flex min-h-[50dvh] items-center justify-center">
    <Spinner className="h-6 w-6" />
  </div>
);

const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) return <CenteredLoader />;

  return token ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { token, user, loading } = useAuth();

  if (loading) return <CenteredLoader />;
  if (!token) return <Navigate to="/login" replace />;
  // Fail closed: null/unknown user is NOT an admin.
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  return children;
};

// Keep authenticated users out of the auth pages.
const PublicOnlyRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) return <CenteredLoader />;

  return token ? <Navigate to="/" replace /> : children;
};

// Location-keyed route transitions so page animations actually run.
const AnimatedRoutes = () => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Routes location={location}>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <Signup />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Main />
              </PrivateRoute>
            }
          />
          <Route
            path="/generate"
            element={
              <PrivateRoute>
                <Generate />
              </PrivateRoute>
            }
          />
          <Route
            path="/inbox"
            element={
              <PrivateRoute>
                <Inbox />
              </PrivateRoute>
            }
          />
          <Route
            path="/inbox/:emailId/:email_id"
            element={
              <PrivateRoute>
                <InboxEmail />
              </PrivateRoute>
            }
          />
          <Route
            path="/inbox/:emailId/"
            element={
              <PrivateRoute>
                <InboxList />
              </PrivateRoute>
            }
          />
          <Route
            path="/all"
            element={
              <PrivateRoute>
                <AllEmailList />
              </PrivateRoute>
            }
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const AppContent = () => {
  const { pathname } = useLocation();
  const { token } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);

  // Watch routes render bare: no app chrome, palette, or shortcuts.
  const isWatch = pathname === "/watch" || pathname.startsWith("/watch/");
  useGlobalShortcuts({ enabled: Boolean(token) && !isWatch, onOpenPalette: openPalette, onOpenHelp: openShortcuts });

  if (isWatch) {
    return (
      <Routes>
        <Route
          path="/watch"
          element={
            <PrivateRoute>
              <WatchView />
            </PrivateRoute>
          }
        />
        <Route
          path="/watch/:emailId"
          element={
            <PrivateRoute>
              <WatchView />
            </PrivateRoute>
          }
        />
      </Routes>
    );
  }

  return (
    <AppShell onOpenPalette={token ? openPalette : undefined}>
      <AnimatedRoutes />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onShowShortcuts={openShortcuts} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </AppShell>
  );
};

// Router sits outermost so every provider below may safely use router hooks.
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ConfigProvider>
          <ThemeProvider>
            <SnackbarProvider>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </SnackbarProvider>
          </ThemeProvider>
        </ConfigProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
