import { cx } from "../../utils/cx";

const TONES = {
  neutral: "border-hairline text-muted bg-raised",
  accent: "border-accent/40 text-accent bg-accent-soft",
  warning: "border-warning/40 text-warning bg-warning-soft",
  danger: "border-danger/40 text-danger bg-danger/10",
  success: "border-success/40 text-success bg-success/10",
};

// Small pill. Renders a button when onClick is provided.
const Chip = ({ tone = "neutral", onClick, icon: Icon, className, children, title }) => {
  const classes = cx(
    "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
    TONES[tone] || TONES.neutral,
    onClick && "cursor-pointer transition-all duration-150 hover:border-accent/60 hover:text-ink focus-ring",
    className
  );

  const content = (
    <>
      {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate">{children}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title} className={classes}>
        {content}
      </button>
    );
  }

  return (
    <span title={title} className={classes}>
      {content}
    </span>
  );
};

export default Chip;
