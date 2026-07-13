import { Loader2 } from "lucide-react";
import { cx } from "../../utils/cx";

const Spinner = ({ className }) => <Loader2 aria-label="Loading" className={cx("h-5 w-5 animate-spin text-muted", className)} />;

export default Spinner;
