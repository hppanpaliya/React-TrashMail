import { forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cx } from "../../utils/cx";

const VARIANTS = {
  primary: "bg-accent text-accent-ink font-semibold hover:brightness-105 shadow-card",
  outline: "border border-hairline-strong text-ink hover:bg-raised hover:border-accent/60",
  ghost: "text-muted hover:text-ink hover:bg-raised",
  danger: "bg-danger text-white font-semibold hover:brightness-110",
  dangerOutline: "border border-danger/50 text-danger hover:bg-danger/10",
};

const SIZES = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

// Accessible button with brand focus ring and spring micro-interaction.
const Button = forwardRef(({ variant = "outline", size = "md", className, children, type = "button", ...props }, ref) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={reduceMotion || props.disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cx(
        "inline-flex items-center justify-center select-none cursor-pointer transition-colors duration-150 focus-ring",
        "disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none",
        VARIANTS[variant] || VARIANTS.outline,
        SIZES[size] || SIZES.md,
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
});

Button.displayName = "Button";

export default Button;
