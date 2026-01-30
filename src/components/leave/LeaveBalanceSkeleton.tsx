import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";

interface LeaveBalanceSkeletonProps {
  cardCount?: number;
}

/**
 * Skeleton loading state for leave balance cards
 * Displays placeholder content while balances are loading
 */
export const LeaveBalanceSkeleton = ({ cardCount = 3 }: LeaveBalanceSkeletonProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground/50" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div 
            key={i} 
            className="text-center p-3 rounded-lg bg-muted/30 border border-muted"
          >
            <Skeleton className="h-8 w-12 mx-auto mb-2" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
};
