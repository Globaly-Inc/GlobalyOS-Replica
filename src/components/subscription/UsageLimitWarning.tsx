import { AlertTriangle, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UsageLimitWarningProps {
  feature: string;
  featureName?: string;
  currentUsage: number;
  limit: number;
  unit?: string;
  percentage: number;
  isWarning: boolean;
  isExceeded: boolean;
  showUpgradeButton?: boolean;
}

export function UsageLimitWarning({
  feature,
  featureName,
  currentUsage,
  limit,
  unit,
  percentage,
  isWarning,
  isExceeded,
  showUpgradeButton = true,
}: UsageLimitWarningProps) {
  const navigate = useNavigate();

  if (!isWarning && !isExceeded) return null;

  const displayName = featureName || feature.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <Alert
      variant={isExceeded ? "destructive" : "default"}
      className={cn(!isExceeded && "border-warning bg-warning/10")}
    >
      <AlertTriangle className={cn("h-4 w-4", isExceeded ? "text-destructive" : "text-warning")} />
      <AlertTitle className="flex items-center justify-between">
        <span>
          {isExceeded ? `${displayName} Limit Reached` : `${displayName} Usage Warning`}
        </span>
        {showUpgradeButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/settings?tab=billing")}
            className="ml-2"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Upgrade
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p className="text-sm">
          {isExceeded
            ? `You've used all ${limit} ${unit || "units"} of your monthly ${displayName.toLowerCase()} allowance.`
            : `You've used ${Math.round(percentage)}% of your monthly ${displayName.toLowerCase()} allowance.`}
        </p>
        <div className="flex items-center gap-3">
          <Progress
            value={percentage}
            className={cn(
              "h-2",
              isExceeded ? "[&>div]:bg-destructive" : "[&>div]:bg-warning"
            )}
          />
          <span className="text-xs font-medium whitespace-nowrap">
            {currentUsage} / {limit} {unit}
          </span>
        </div>
      </AlertDescription>
    </Alert>
  );
}
