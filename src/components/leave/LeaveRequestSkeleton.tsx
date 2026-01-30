import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface LeaveRequestSkeletonProps {
  count?: number;
}

/**
 * Skeleton loading state for leave request cards
 * Displays placeholder content while requests are loading
 */
export const LeaveRequestSkeleton = ({ count = 2 }: LeaveRequestSkeletonProps) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            {/* Header with status */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            
            {/* Date range */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-12" />
            </div>
            
            {/* Reason (optional) */}
            <Skeleton className="h-8 w-full rounded" />
            
            {/* Cancel button (for pending) */}
            <Skeleton className="h-8 w-full rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
