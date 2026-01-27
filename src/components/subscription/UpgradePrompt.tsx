import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradePromptProps {
  feature?: string;
  message?: string;
  variant?: "inline" | "card" | "banner";
  showButton?: boolean;
}

export function UpgradePrompt({
  feature,
  message,
  variant = "card",
  showButton = true,
}: UpgradePromptProps) {
  const navigate = useNavigate();

  const defaultMessage = feature
    ? `Upgrade your plan to unlock ${feature}`
    : "Upgrade your plan to unlock more features";

  const handleUpgrade = () => {
    navigate("/settings?tab=billing");
  };

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>{message || defaultMessage}</span>
        {showButton && (
          <Button variant="link" size="sm" className="p-0 h-auto" onClick={handleUpgrade}>
            Upgrade <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{message || defaultMessage}</span>
        </div>
        {showButton && (
          <Button size="sm" onClick={handleUpgrade}>
            Upgrade Now
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Upgrade Required</h3>
          <p className="text-sm text-muted-foreground">{message || defaultMessage}</p>
        </div>
        {showButton && (
          <Button onClick={handleUpgrade} className="w-full">
            View Plans
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
