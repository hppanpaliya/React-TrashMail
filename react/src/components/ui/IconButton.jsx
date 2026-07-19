import { forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cx } from "../../utils/cx";

const TONES = {
  default: "text-muted hover:text-ink hover:bg-raised",
  danger: "text-muted hover:text-danger hover:bg-danger/10",
  accent: "text-accent hover:bg-accent-soft",
};

const SIZES = {
  sm: "h-8 w-8 rounded-lg [&>svg]:h-4 [&>svg]:w-4",
  md: "h-10 w-10 rounded-xl [&>svg]:h-[18px] [&>svg]:w-[18px]",
};

// Icon-only button. `label` is required and doubles as tooltip + aria-label.
const IconButton = forwardRef(({ label, tone = "default", size = "md", className, children, type = "button", ...props }, ref) => {
  const reduceMotion = useReducedMotion();

  if (import.meta.env.DEV && !label) {
    console.warn("IconButton: `label` is required for accessibility (aria-label).");
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      whileTap={reduceMotion || props.disabled ? undefined : { scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cx(
        "inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-150 focus-ring",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
        TONES[tone] || TONES.default,
        SIZES[size] || SIZES.md,
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
});

IconButton.displayName = "IconButton";

export default IconButton;
