import { cx } from "../../utils/cx";

// Loading placeholder block.
const Skeleton = ({ className }) => <div aria-hidden="true" className={cx("animate-pulse rounded-lg bg-ink/8 dark:bg-white/8", className)} />;

export default Skeleton;
