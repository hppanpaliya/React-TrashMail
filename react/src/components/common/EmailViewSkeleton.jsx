import Skeleton from "../ui/Skeleton";

// Placeholder shown while a single email is loading.
const EmailViewSkeleton = () => (
  <div aria-busy="true" aria-label="Loading email" className="p-5">
    <Skeleton className="h-7 w-2/3" />
    <Skeleton className="mt-3 h-4 w-2/5" />
    <Skeleton className="mt-2 h-4 w-1/3" />
    <Skeleton className="mt-2 h-4 w-1/4" />
    <div className="my-5 h-px bg-hairline" />
    <Skeleton className="h-60 w-full rounded-xl" />
  </div>
);

export default EmailViewSkeleton;
