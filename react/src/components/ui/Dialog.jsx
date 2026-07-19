import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import IconButton from "./IconButton";
import { cx } from "../../utils/cx";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Accessible modal dialog: portal, backdrop + Escape close, focus trap.
const Dialog = ({ open, onClose, title, children, maxWidth = "max-w-md", hideClose = false }) => {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);
  const reduceMotion = useReducedMotion();
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    // Focus the first focusable element in the panel (or the panel itself).
    const timer = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelector("input, select, textarea, button:not([data-dialog-close])");
      (focusable || panel).focus();
    }, 30);

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      // Trap: keep Tab/Shift+Tab cycling inside the panel (WCAG 2.1.2/2.4.3).
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === panel);
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      if (previouslyFocused.current?.focus) previouslyFocused.current.focus();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: reduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reduceMotion ? 1 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cx("relative w-full rounded-2xl border border-hairline bg-overlay shadow-lift outline-none", maxWidth)}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-1">
                {title ? (
                  <h2 id={titleId} className="text-base font-semibold text-ink leading-6 pt-1">
                    {title}
                  </h2>
                ) : (
                  <span />
                )}
                {!hideClose && (
                  <IconButton label="Close" size="sm" onClick={onClose} data-dialog-close className="-mr-1.5">
                    <X />
                  </IconButton>
                )}
              </div>
            )}
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Dialog;
