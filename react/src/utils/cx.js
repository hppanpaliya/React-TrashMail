// Tiny classnames join: cx("a", cond && "b", other)
export const cx = (...parts) => parts.filter(Boolean).join(" ");
