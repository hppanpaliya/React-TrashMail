import Skeleton from "../../ui/Skeleton";

// Compact overview metric: label, big tabular number, icon, optional sub-line.
const StatCard = ({ label, value, sub, icon: Icon, loading }) => (
  <div className="glass rounded-2xl p-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-faint">{label}</p>
      {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-faint" />}
    </div>
    {loading ? (
      <Skeleton className="mt-2 h-7 w-16" />
    ) : (
      <p className="tabular-nums mt-1 text-2xl font-semibold text-ink">{value}</p>
    )}
    {sub && !loading && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
  </div>
);

export default StatCard;
