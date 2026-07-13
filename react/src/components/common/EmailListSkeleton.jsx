import Skeleton from "../ui/Skeleton";

// Placeholder cards shown while an email list is loading.
const EmailListSkeleton = ({ count = 6 }) => (
  <div aria-busy="true" aria-label="Loading emails" className="flex flex-col gap-2.5">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="glass rounded-2xl p-4">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="mt-2 h-3.5 w-2/5" />
        <Skeleton className="mt-2 h-3 w-1/5" />
      </div>
    ))}
  </div>
);

export default EmailListSkeleton;
