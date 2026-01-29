import { Skeleton } from "@/components/ui/skeleton";

interface UnreadMessageSkeletonProps {
  count?: number;
}

export const UnreadMessageSkeleton = ({ count = 5 }: UnreadMessageSkeletonProps) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border bg-background"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-32 mt-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
