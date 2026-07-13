import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cx } from "../utils/cx";

const SnackbarContext = createContext(() => {});

const SEVERITIES = {
  success: { icon: CheckCircle2, classes: "border-success/40 text-success" },
  error: { icon: AlertCircle, classes: "border-danger/40 text-danger" },
  warning: { icon: AlertTriangle, classes: "border-warning/40 text-warning" },
  info: { icon: Info, classes: "border-info/40 text-info" },
};

export const SnackbarProvider = ({ children }) => {
  const [snack, setSnack] = useState(null);
  const timerRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnack({ message, severity, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!snack) return undefined;
    timerRef.current = setTimeout(() => setSnack(null), 3000);
    return () => clearTimeout(timerRef.current);
  }, [snack]);

  const { icon: Icon, classes } = SEVERITIES[snack?.severity] || SEVERITIES.info;

  return (
    <SnackbarContext.Provider value={showSnackbar}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:pb-6">
          <AnimatePresence>
            {snack && (
              <motion.div
                key={snack.key}
                role="status"
                aria-live="polite"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className={cx(
                  "pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border bg-overlay py-2.5 pl-3.5 pr-2 shadow-lift",
                  classes
                )}
              >
                <Icon aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
                <p className="min-w-0 break-words text-sm font-medium text-ink">{snack.message}</p>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setSnack(null)}
                  className="ml-1 rounded-md p-1 text-faint transition-colors hover:bg-raised hover:text-ink focus-ring cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </SnackbarContext.Provider>
  );
};

// Returns showSnackbar(message, severity)
export const useSnackbar = () => useContext(SnackbarContext);
