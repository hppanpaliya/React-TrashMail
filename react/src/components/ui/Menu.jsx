import { cloneElement, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cx } from "../../utils/cx";

// Dropdown menu anchored to a trigger element.
// Keyboard: ArrowUp/Down to move, Enter/Space to pick, Escape to close.
const Menu = ({ trigger, items = [], align = "right", className }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const menuId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => {
          const delta = event.key === "ArrowDown" ? 1 : -1;
          const next = (prev + delta + items.length) % items.length;
          listRef.current?.children[next]?.focus();
          return next;
        });
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, items.length]);

  const pick = (item) => {
    setOpen(false);
    item.onSelect?.();
  };

  return (
    <div ref={rootRef} className={cx("relative inline-flex", className)}>
      {cloneElement(trigger, {
        onClick: () => {
          setOpen((prev) => !prev);
          setActiveIndex(-1);
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": menuId,
      })}

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={menuId}
            role="menu"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cx(
              "absolute top-full z-40 mt-2 min-w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-hairline bg-overlay p-1.5 shadow-lift",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {items.map((item, index) => (
              <li
                key={item.key || index}
                role="menuitem"
                tabIndex={-1}
                onClick={() => pick(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    pick(item);
                  }
                }}
                className={cx(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink outline-none",
                  "hover:bg-raised focus:bg-raised",
                  activeIndex === index && "bg-raised",
                  item.tone === "danger" && "text-danger"
                )}
              >
                {item.icon && <item.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-faint" />}
                <span className="min-w-0 break-all">{item.label}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Menu;
