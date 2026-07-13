import { cx } from "../../utils/cx";

// Accessible toggle switch.
const Switch = ({ checked, onChange, label, id, className }) => (
  <label htmlFor={id} className={cx("flex cursor-pointer items-center gap-3 select-none", className)}>
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 focus-ring cursor-pointer",
        checked ? "border-accent bg-accent" : "border-hairline-strong bg-raised"
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 rounded-full shadow transition-all duration-200",
          checked ? "left-[calc(100%-1.25rem)] bg-accent-ink" : "left-0.5 bg-faint"
        )}
      />
    </button>
    {label && <span className="text-sm text-ink">{label}</span>}
  </label>
);

export default Switch;
