import { useId } from "react";
import { cx } from "../../utils/cx";

// Accessible toggle switch. Deliberately NOT wrapped in a <label htmlFor>:
// a label associated with the button forwards clicks to it, so one physical
// click would toggle twice and appear to do nothing.
const Switch = ({ checked, onChange, label, id, className }) => {
  const autoId = useId();
  const switchId = id || autoId;
  const labelId = label ? `${switchId}-label` : undefined;

  const toggle = () => {
    if (typeof onChange === "function") onChange(!checked);
  };

  return (
    <span className={cx("flex items-center gap-3 select-none", className)}>
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        onClick={toggle}
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
      {label && (
        <span id={labelId} onClick={toggle} className="text-sm text-ink cursor-pointer">
          {label}
        </span>
      )}
    </span>
  );
};

export default Switch;
