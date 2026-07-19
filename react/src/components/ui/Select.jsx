import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "../../utils/cx";

// Styled native <select>: keyboard/screen-reader behavior for free.
const Select = forwardRef(({ label, options = [], className, selectClassName, id, children, ...props }, ref) => {
  const autoId = useId();
  const selectId = id || autoId;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={selectId} className="text-[13px] font-medium text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cx(
            "h-10 w-full appearance-none rounded-xl border border-hairline bg-raised pl-3 pr-9 text-sm text-ink",
            "cursor-pointer transition-colors duration-150 focus-ring focus:border-accent/50",
            "[&>option]:bg-overlay [&>option]:text-ink",
            selectClassName
          )}
          {...props}
        >
          {children ||
            options.map((opt, i) => (
              <option key={`${i}-${opt.value ?? ""}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      </div>
    </div>
  );
});

Select.displayName = "Select";

export default Select;
