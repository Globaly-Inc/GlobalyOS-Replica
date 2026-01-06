import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, differenceInDays, addDays } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  RefreshCw,
  XCircle,
  CheckCircle,
  Clock,
  CreditCard,
  Receipt,
  Loader2,
  Plus,
} from "lucide-react";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";

interface PaymentMethod {
  id: string;
  card_brand: string | null;
  card_last4: string | null;
  is_default: boolean;
}

interface DunningSectionProps {
  organizationId: string;
  subscription: {
    id: string;
    status: string;
    dunning_started_at: string | null;
    dunning_ends_at: string | null;
    dunning_attempts: number | null;
    last_dunning_attempt_at: string | null;
    plan: string;
  };
}

export function DunningSection({ organizationId, subscription }: DunningSectionProps) {
  const queryClient = useQueryClient();
  const { logActivity } = useAdminActivityLog();
  const [extendDays] = useState(3);

  const dunningStarted = subscription.dunning_started_at 
    ? new Date(subscription.dunning_started_at) 
    : null;
  const dunningEnds = subscription.dunning_ends_at 
    ? new Date(subscription.dunning_ends_at) 
    : null;
  const daysElapsed = dunningStarted 
    ? differenceInDays(new Date(), dunningStarted) 
    : 0;
  const daysRemaining = dunningEnds 
    ? Math.max(0, differenceInDays(dunningEnds, new Date())) 
    : 0;
  const totalDays = dunningStarted && dunningEnds 
    ? differenceInDays(dunningEnds, dunningStarted) 
    : 7;
  const progressPercent = Math.min((daysElapsed / totalDays) * 100, 100);

  // Fetch outstanding invoice
  const { data: outstandingInvoice } = useQuery({
    queryKey: ["outstanding-invoice", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", organizationId)
        .in("status", ["pending", "overdue"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch payment method using raw query since types not regenerated yet
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

  // Retry payment mutation
  const retryPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentMethod) {
        throw new Error("No payment method configured");
      }

      // Call edge function to retry payment
      const { data, error } = await supabase.functions.invoke("charge-payment-method", {
        body: {
          organizationId,
          paymentMethodId: paymentMethod.id,
          invoiceId: outstandingInvoice?.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Payment failed");

      // Log the attempt
      await supabase
        .from("dunning_logs" as "employees")
        .insert({
          organization_id: organizationId,
          subscription_id: subscription.id,
          invoice_id: outstandingInvoice?.id,
          attempt_number: (subscription.dunning_attempts || 0) + 1,
          action: "payment_attempt",
          result: "success",
        } as never);

      // Update subscription to active
      await supabase.from("subscriptions").update({
        status: "active",
        dunning_started_at: null,
        dunning_ends_at: null,
        dunning_attempts: 0,
        last_dunning_attempt_at: null,
      }).eq("id", subscription.id);

      await logActivity({
        organizationId,
        actionType: "subscription_updated",
        entityType: "subscription",
        entityId: subscription.id,
        changes: { status: { from: "past_due", to: "active" } },
        metadata: { action: "manual_payment_retry", success: true },
      });
    },
    onSuccess: () => {
      toast.success("Payment successful! Subscription activated.");
      queryClient.invalidateQueries({ queryKey: ["org-subscription-full", organizationId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Payment failed. Please try again.");
      // Log failed attempt
      supabase
        .from("dunning_logs" as "employees")
        .insert({
          organization_id: organizationId,
          subscription_id: subscription.id,
          invoice_id: outstandingInvoice?.id,
          attempt_number: (subscription.dunning_attempts || 0) + 1,
          action: "payment_attempt",
          result: "failed",
          error_message: error.message,
        } as never);
    },
  });

  // Extend dunning mutation
  const extendDunningMutation = useMutation({
    mutationFn: async () => {
      const newDunningEnd = addDays(dunningEnds || new Date(), extendDays);

      const { error } = await supabase
        .from("subscriptions")
        .update({
          dunning_ends_at: newDunningEnd.toISOString(),
        })
        .eq("id", subscription.id);

      if (error) throw error;

      await supabase
        .from("dunning_logs" as "employees")
        .insert({
          organization_id: organizationId,
          subscription_id: subscription.id,
          attempt_number: 0,
          action: "dunning_extended",
          result: "success",
        } as never);

      await logActivity({
        organizationId,
        actionType: "subscription_updated",
        entityType: "subscription",
        entityId: subscription.id,
        metadata: { 
          action: "dunning_extended", 
          extended_by_days: extendDays,
          new_dunning_end: newDunningEnd.toISOString(),
        },
      });
    },
    onSuccess: () => {
      toast.success(`Dunning period extended by ${extendDays} days`);
      queryClient.invalidateQueries({ queryKey: ["org-subscription-full", organizationId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to extend dunning period");
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          dunning_started_at: null,
          dunning_ends_at: null,
        })
        .eq("id", subscription.id);

      if (error) throw error;

      await supabase
        .from("dunning_logs" as "employees")
        .insert({
          organization_id: organizationId,
          subscription_id: subscription.id,
          attempt_number: subscription.dunning_attempts || 0,
          action: "canceled",
          result: "manual_cancellation",
        } as never);

      await logActivity({
        organizationId,
        actionType: "subscription_canceled",
        entityType: "subscription",
        entityId: subscription.id,
        changes: { status: { from: "past_due", to: "canceled" } },
        metadata: { reason: "manual_cancellation_during_dunning" },
      });
    },
    onSuccess: () => {
      toast.success("Subscription canceled");
      queryClient.invalidateQueries({ queryKey: ["org-subscription-full", organizationId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel subscription");
    },
  });

  // Mark as paid (manual) mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      // Update invoice to paid
      if (outstandingInvoice) {
        await supabase.from("invoices").update({
          status: "paid",
          paid_at: new Date().toISOString(),
        }).eq("id", outstandingInvoice.id);
      }

      // Record payment
      await supabase.from("payments").insert({
        organization_id: organizationId,
        invoice_id: outstandingInvoice?.id,
        amount: outstandingInvoice?.amount || 0,
        payment_method: "manual",
        status: "completed",
      });

      // Update subscription to active
      const { error } = await supabase.from("subscriptions").update({
        status: "active",
        dunning_started_at: null,
        dunning_ends_at: null,
        dunning_attempts: 0,
        last_dunning_attempt_at: null,
      }).eq("id", subscription.id);

      if (error) throw error;

      await logActivity({
        organizationId,
        actionType: "payment_recorded",
        entityType: "payment",
        metadata: { 
          invoice_id: outstandingInvoice?.id,
          amount: outstandingInvoice?.amount,
          method: "manual",
        },
      });
    },
    onSuccess: () => {
      toast.success("Payment recorded. Subscription activated.");
      queryClient.invalidateQueries({ queryKey: ["org-subscription-full", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["outstanding-invoice", organizationId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  return (
    <Card className="border-amber-300 bg-amber-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-amber-900">Dunning Period</CardTitle>
            <CardDescription className="text-amber-700">
              Payment failed - subscription will be canceled if not resolved
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-amber-700">
              {daysElapsed} of {totalDays} days elapsed
            </span>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              {daysRemaining} days remaining
            </Badge>
          </div>
          <Progress 
            value={progressPercent} 
            className="h-2 [&>div]:bg-amber-500" 
          />
        </div>

        {/* Details Grid */}
        <div className="grid gap-3 sm:grid-cols-2 p-4 bg-background rounded-lg border">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Started:</span>
            <span className="font-medium">
              {dunningStarted ? format(dunningStarted, "MMM d, yyyy") : "-"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Ends:</span>
            <span className="font-medium">
              {dunningEnds ? format(dunningEnds, "MMM d, yyyy") : "-"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Attempts:</span>
            <span className="font-medium">{subscription.dunning_attempts || 0} / 3</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Payment Method:</span>
            {paymentMethod ? (
              <span className="font-medium capitalize">
                {paymentMethod.card_brand} ****{paymentMethod.card_last4}
              </span>
            ) : (
              <Badge variant="destructive" className="text-xs">Not configured</Badge>
            )}
          </div>
        </div>

        {/* Outstanding Invoice */}
        {outstandingInvoice && (
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">
                  Outstanding Invoice: {outstandingInvoice.invoice_number}
                </p>
                <p className="text-sm text-red-700">
                  {formatAmount(outstandingInvoice.amount, outstandingInvoice.currency)}
                </p>
              </div>
            </div>
            <Badge variant="destructive">{outstandingInvoice.status}</Badge>
          </div>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => retryPaymentMutation.mutate()}
            disabled={retryPaymentMutation.isPending || !paymentMethod}
          >
            {retryPaymentMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Retry Payment
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => markAsPaidMutation.mutate()}
            disabled={markAsPaidMutation.isPending}
          >
            {markAsPaidMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Mark as Paid
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => extendDunningMutation.mutate()}
            disabled={extendDunningMutation.isPending}
          >
            {extendDunningMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Extend +{extendDays} Days
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Now
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will immediately cancel the subscription. The organization will lose access to paid features. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => cancelSubscriptionMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Cancel Subscription
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
