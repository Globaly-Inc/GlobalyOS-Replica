import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Check, ArrowRight } from "lucide-react";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";

interface ChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  currentPlan: string | null;
  currentBillingCycle: string | null;
  subscriptionId: string | null;
}

export function ChangePlanDialog({
  open,
  onOpenChange,
  organizationId,
  currentPlan,
  currentBillingCycle,
  subscriptionId,
}: ChangePlanDialogProps) {
  const queryClient = useQueryClient();
  const { logActivity } = useAdminActivityLog();
  const [selectedPlan, setSelectedPlan] = useState(currentPlan || "");
  const [billingCycle, setBillingCycle] = useState(currentBillingCycle || "monthly");

  // Fetch available plans
  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("monthly_price", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: async () => {
      if (!subscriptionId) {
        // Create new subscription
        const { error } = await supabase.from("subscriptions").insert({
          organization_id: organizationId,
          plan: selectedPlan,
          billing_cycle: billingCycle,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(
            Date.now() + (billingCycle === "annual" ? 365 : 30) * 24 * 60 * 60 * 1000
          ).toISOString(),
        });
        if (error) throw error;

        await logActivity({
          organizationId,
          actionType: "subscription_created",
          entityType: "subscription",
          metadata: { plan: selectedPlan, billing_cycle: billingCycle },
        });
      } else {
        // Update existing subscription
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan: selectedPlan,
            billing_cycle: billingCycle,
          })
          .eq("id", subscriptionId);
        if (error) throw error;

        await logActivity({
          organizationId,
          actionType: "subscription_updated",
          entityType: "subscription",
          entityId: subscriptionId,
          changes: {
            plan: { from: currentPlan, to: selectedPlan },
            billing_cycle: { from: currentBillingCycle, to: billingCycle },
          },
        });
      }
    },
    onSuccess: () => {
      toast.success("Plan changed successfully");
      queryClient.invalidateQueries({ queryKey: ["org-subscription-full", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["org-subscription", organizationId] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to change plan");
    },
  });

  const selectedPlanData = plans?.find((p) => p.name === selectedPlan);
  const currentPlanData = plans?.find((p) => p.name === currentPlan);

  const getPrice = (plan: typeof plans[0] | undefined) => {
    if (!plan) return 0;
    return billingCycle === "annual" ? plan.annual_price || plan.monthly_price * 12 : plan.monthly_price;
  };

  const isUpgrade = selectedPlanData && currentPlanData 
    ? getPrice(selectedPlanData) > getPrice(currentPlanData)
    : false;

  const isDowngrade = selectedPlanData && currentPlanData 
    ? getPrice(selectedPlanData) < getPrice(currentPlanData)
    : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Change Subscription Plan</DialogTitle>
          <DialogDescription>
            Select a new plan for this organization. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>

        {loadingPlans ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Plan Info */}
            {currentPlan && (
              <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="font-medium capitalize">{currentPlan}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">New Plan</p>
                  <p className="font-medium capitalize">
                    {selectedPlan || "Select a plan"}
                    {isUpgrade && <Badge className="ml-2 bg-emerald-100 text-emerald-700">Upgrade</Badge>}
                    {isDowngrade && <Badge className="ml-2 bg-amber-100 text-amber-700">Downgrade</Badge>}
                  </p>
                </div>
              </div>
            )}

            {/* Billing Cycle Selection */}
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual (Save ~17%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plan Selection */}
            <div className="space-y-2">
              <Label>Select Plan</Label>
              <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="space-y-3">
                {plans?.map((plan) => {
                  const price = billingCycle === "annual" 
                    ? (plan.annual_price || plan.monthly_price * 12) 
                    : plan.monthly_price;
                  const isCurrent = plan.name === currentPlan;

                  return (
                    <Card
                      key={plan.id}
                      className={`p-4 cursor-pointer transition-all ${
                        selectedPlan === plan.name
                          ? "ring-2 ring-primary border-primary"
                          : "hover:border-primary/50"
                      } ${isCurrent ? "bg-muted/30" : ""}`}
                      onClick={() => setSelectedPlan(plan.name)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value={plan.name} id={plan.id} className="mt-1" />
                          <div>
                            <div className="flex items-center gap-2">
                              <label htmlFor={plan.id} className="font-medium capitalize cursor-pointer">
                                {plan.name}
                              </label>
                              {isCurrent && (
                                <Badge variant="secondary" className="text-xs">Current</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {plan.description || `${plan.name} plan features`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ${price.toFixed(2)}
                            <span className="text-sm font-normal text-muted-foreground">
                              /{billingCycle === "annual" ? "year" : "month"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </RadioGroup>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => changePlanMutation.mutate()}
            disabled={
              !selectedPlan ||
              (selectedPlan === currentPlan && billingCycle === currentBillingCycle) ||
              changePlanMutation.isPending
            }
          >
            {changePlanMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Changing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirm Change
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
