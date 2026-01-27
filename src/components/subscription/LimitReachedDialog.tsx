import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LimitReachedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  featureName?: string;
  currentUsage: number;
  limit: number;
  unit?: string;
}

export function LimitReachedDialog({
  open,
  onOpenChange,
  feature,
  featureName,
  currentUsage,
  limit,
  unit = "uses",
}: LimitReachedDialogProps) {
  const navigate = useNavigate();

  const displayName = featureName || feature.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/settings?tab=billing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">
            {displayName} Limit Reached
          </DialogTitle>
          <DialogDescription className="text-center">
            You've used all {limit} {unit} of your monthly {displayName.toLowerCase()} allowance.
            Upgrade your plan to continue using this feature.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Monthly Usage</span>
            <span className="font-medium">
              {currentUsage} / {limit} {unit}
            </span>
          </div>
          <Progress value={100} className="h-2 [&>div]:bg-destructive" />
          <p className="text-xs text-muted-foreground text-center">
            Your limit resets at the start of each billing period
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleUpgrade} className="w-full">
            <TrendingUp className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
