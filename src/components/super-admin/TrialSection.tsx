import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { Clock, CreditCard, Pencil } from "lucide-react";
import { EditTrialDialog } from "./EditTrialDialog";

interface PaymentMethod {
  id: string;
  card_brand: string | null;
  card_last4: string | null;
  is_default: boolean;
}

interface TrialSectionProps {
  organizationId: string;
  subscription: {
    id: string;
    trial_ends_at: string | null;
    trial_started_at?: string | null;
    current_period_start?: string | null;
  };
}

export function TrialSection({ organizationId, subscription }: TrialSectionProps) {
  const [editTrialOpen, setEditTrialOpen] = useState(false);

  // Fetch payment method using type assertion since types not regenerated yet
  const { data: paymentMethod } = useQuery({
    queryKey: ["payment-method", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_payment_methods" as "employees")
        .select("id, card_brand, card_last4, is_default")
        .eq("organization_id" as "id", organizationId)
        .eq("is_default" as "id", "true")
        .maybeSingle();
      if (error) return null;
      return data as unknown as PaymentMethod | null;
    },
  });

  if (!subscription.trial_ends_at) return null;

  const trialEnd = new Date(subscription.trial_ends_at);
  const trialStart = subscription.trial_started_at 
    ? new Date(subscription.trial_started_at)
    : subscription.current_period_start 
      ? new Date(subscription.current_period_start)
      : null;
  const daysRemaining = differenceInDays(trialEnd, new Date());

  const getDaysRemainingBadge = () => {
    if (daysRemaining <= 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysRemaining <= 3) {
      return <Badge variant="destructive">{daysRemaining} days left</Badge>;
    } else if (daysRemaining <= 7) {
      return <Badge variant="secondary">{daysRemaining} days left</Badge>;
    }
    return <Badge variant="outline">{daysRemaining} days left</Badge>;
  };

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              <span className="font-medium">Trial:</span>{" "}
              {trialStart ? format(trialStart, "dd MMM") + " - " : ""}
              {format(trialEnd, "dd MMM yyyy")}
            </span>
            {getDaysRemainingBadge()}
          </div>
          
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            {paymentMethod ? (
              <span className="text-sm capitalize">
                {paymentMethod.card_brand} ****{paymentMethod.card_last4}
              </span>
            ) : (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs">
                No payment method
              </Badge>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditTrialOpen(true)}
          className="text-blue-700 border-blue-300 hover:bg-blue-100"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit Trial
        </Button>
      </div>

      <EditTrialDialog
        open={editTrialOpen}
        onOpenChange={setEditTrialOpen}
        organizationId={organizationId}
        subscriptionId={subscription.id}
        currentTrialEnd={trialEnd}
        trialStarted={trialStart || undefined}
      />
    </>
  );
}
