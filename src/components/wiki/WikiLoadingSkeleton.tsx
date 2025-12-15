import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface WikiLoadingSkeletonProps {
  type: "folder" | "page" | "sidebar";
  isMobile?: boolean;
}

export const WikiLoadingSkeleton = ({ type, isMobile = false }: WikiLoadingSkeletonProps) => {
  if (type === "sidebar") {
    return (
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2 pl-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-2 border-t">
          <Skeleton className="h-3 w-24" />
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-2 pl-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "folder") {
    return (
      <div className="h-full flex flex-col">
        {/* Header skeleton */}
        <div className={cn("border-b bg-card", isMobile ? "px-4 py-3" : "px-6 py-4")}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
            {!isMobile && (
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-8" />
              </div>
            )}
          </div>
        </div>
        
        {/* Grid skeleton */}
        <div className={cn("flex-1 overflow-y-auto", isMobile ? "p-4" : "p-6")}>
          <div className={cn(
            "grid gap-4",
            isMobile 
              ? "grid-cols-2" 
              : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          )}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="p-4 rounded-xl border bg-card">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-12 w-12 mb-3 rounded" />
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Page content skeleton
  return (
    <div className="h-full flex flex-col">
      {/* Header skeleton */}
      <div className="border-b bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-8 w-64 mb-3" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="py-2" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <div className="py-2" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
};
