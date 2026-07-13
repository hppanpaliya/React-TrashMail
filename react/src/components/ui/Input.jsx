import { forwardRef, useId } from "react";
import { cx } from "../../utils/cx";

// Text input with optional label, leading icon and trailing slot.
const Input = forwardRef(({ label, icon: Icon, trailing, className, inputClassName, id, ...props }, ref) => {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && <Icon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />}
        <input
          ref={ref}
          id={inputId}
          className={cx(
            "h-10 w-full rounded-xl border border-hairline bg-raised px-3 text-sm text-ink placeholder:text-faint",
            "transition-colors duration-150 focus-ring focus:border-accent/50",
            Icon && "pl-9",
            trailing && "pr-10",
            inputClassName
          )}
          {...props}
        />
        {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
    </div>
  );
});

Input.displayName = "Input";

export default Input;
