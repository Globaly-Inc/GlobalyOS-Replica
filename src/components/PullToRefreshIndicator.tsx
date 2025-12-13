import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  isPastThreshold: boolean;
  threshold?: number;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  isPastThreshold,
  threshold = 80,
}: PullToRefreshIndicatorProps) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center transition-all duration-200 md:hidden"
      style={{
        top: `calc(env(safe-area-inset-top, 0px) + ${Math.max(pullDistance - 20, 0)}px)`,
        opacity: progress,
      }}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-lg border border-border",
          isPastThreshold && "bg-primary/10"
        )}
      >
        <RefreshCw
          className={cn(
            "h-5 w-5 text-primary transition-transform",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
          }}
        />
      </div>
    </div>
  );
};
