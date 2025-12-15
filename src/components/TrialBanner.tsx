import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Clock, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO } from "date-fns";

interface TrialInfo {
  isOnTrial: boolean;
  daysRemaining: number;
  trialEndsAt: string | null;
  plan: string;
}

const TrialBanner = () => {
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!currentOrg?.id) return;

    const fetchTrialInfo = async () => {
      const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select("status, plan, trial_ends_at")
        .eq("organization_id", currentOrg.id)
        .limit(1);

      if (error) {
        console.error("Error fetching trial info:", error);
        return;
      }

      const subscription = subscriptions?.[0];
      if (subscription) {
        const isOnTrial = subscription.status === "trialing";
        const trialEndsAt = subscription.trial_ends_at;
        let daysRemaining = 0;

        if (isOnTrial && trialEndsAt) {
          daysRemaining = Math.max(0, differenceInDays(parseISO(trialEndsAt), new Date()));
        }

        setTrialInfo({
          isOnTrial,
          daysRemaining,
          trialEndsAt,
          plan: subscription.plan,
        });
      } else {
        setTrialInfo(null);
      }
    };

    fetchTrialInfo();
  }, [currentOrg?.id]);

  if (!trialInfo?.isOnTrial || dismissed) return null;

  const isUrgent = trialInfo.daysRemaining <= 2;

  return (
    <div
      className={`w-full border-b ${
        isUrgent
          ? "bg-destructive/10 border-destructive/20"
          : "bg-primary/5 border-primary/10"
      }`}
    >
      <div className="container flex items-center justify-between px-4 md:px-8 py-2 text-sm">
        <div className="flex items-center gap-2">
          {isUrgent ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <Clock className="h-4 w-4 text-primary" />
          )}
          <span className={isUrgent ? "text-destructive" : "text-foreground"}>
            {trialInfo.daysRemaining === 0 ? (
              "Your trial ends today!"
            ) : trialInfo.daysRemaining === 1 ? (
              "Your trial ends tomorrow!"
            ) : (
              <>
                <span className="font-medium">{trialInfo.daysRemaining} days</span> left in your trial
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isUrgent ? "destructive" : "default"}
            className="h-7 text-xs gap-1"
            onClick={() => navigate("/settings?tab=billing")}
          >
            <Sparkles className="h-3 w-3" />
            Upgrade Now
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrialBanner;
