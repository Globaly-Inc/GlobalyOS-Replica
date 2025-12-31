import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonProps {
  className?: string;
  lines?: number;
}

export const CardSkeleton = ({ className, lines = 3 }: CardSkeletonProps) => {
  return (
    <div className={cn("rounded-lg border bg-card p-4 shadow-sm", className)}>
      <Skeleton className="h-5 w-32 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
