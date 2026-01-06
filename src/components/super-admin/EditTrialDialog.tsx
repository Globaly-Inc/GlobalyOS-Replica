import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInDays, addDays } from "date-fns";
import { toast } from "sonner";
import { CalendarIcon, Clock, Loader2, Plus, Minus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";

interface EditTrialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  subscriptionId: string;
  currentTrialEnd: Date;
  trialStarted?: Date;
}

export function EditTrialDialog({
  open,
  onOpenChange,
  organizationId,
  subscriptionId,
  currentTrialEnd,
  trialStarted,
}: EditTrialDialogProps) {
  const queryClient = useQueryClient();
  const { logActivity } = useAdminActivityLog();
  const [newTrialEnd, setNewTrialEnd] = useState<Date>(currentTrialEnd);
  const [reason, setReason] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const daysRemaining = differenceInDays(currentTrialEnd, new Date());
  const newDaysRemaining = differenceInDays(newTrialEnd, new Date());
  const extensionDays = differenceInDays(newTrialEnd, currentTrialEnd);

  const extendTrialMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update subscription
      const { error: subError } = await supabase
        .from("subscriptions")
        .update({
          trial_ends_at: newTrialEnd.toISOString(),
          current_period_end: newTrialEnd.toISOString(),
          trial_extended_at: new Date().toISOString(),
          trial_extended_by: user.id,
          trial_extension_reason: reason || null,
          original_trial_ends_at: currentTrialEnd.toISOString(),
        })
        .eq("id", subscriptionId);

      if (subError) throw subError;

      // Update organization trial_ends_at
      const { error: orgError } = await supabase
        .from("organizations")
        .update({
          trial_ends_at: newTrialEnd.toISOString(),
        })
        .eq("id", organizationId);

      if (orgError) throw orgError;

      // Log the extension using type assertion since types not regenerated yet
      const { error: logError } = await supabase
        .from("trial_extension_logs" as "employees")
        .insert({
          organization_id: organizationId,
          subscription_id: subscriptionId,
          previous_trial_end: currentTrialEnd.toISOString(),
          new_trial_end: newTrialEnd.toISOString(),
          extended_by: user.id,
          reason: reason || null,
        } as never);

      if (logError) throw logError;

      // Log activity
      await logActivity({
        organizationId,
        actionType: "trial_extended",
        entityType: "subscription",
        entityId: subscriptionId,
        changes: {
          trial_ends_at: {
            from: currentTrialEnd.toISOString(),
            to: newTrialEnd.toISOString(),
          },
        },
        metadata: { 
          reason, 
          extension_days: extensionDays,
          previous_days_remaining: daysRemaining,
          new_days_remaining: newDaysRemaining,
        },
      });
    },
    onSuccess: () => {
      toast.success(`Trial extended by ${extensionDays} days`);
      queryClient.invalidateQueries({ queryKey: ["org-subscription-full", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["subscription-timeline", organizationId] });
      onOpenChange(false);
      setReason("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to extend trial");
    },
  });

  const handleQuickExtend = (days: number) => {
    setNewTrialEnd(addDays(currentTrialEnd, days));
  };

  const handleSubmit = () => {
    if (newTrialEnd <= new Date()) {
      toast.error("New trial end date must be in the future");
      return;
    }
    extendTrialMutation.mutate();
  };

  const resetToOriginal = () => {
    setNewTrialEnd(currentTrialEnd);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Edit Trial Period
          </DialogTitle>
          <DialogDescription>
            Extend or modify the trial end date for this organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Trial Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Trial Ends</span>
              <span className="font-medium">{format(currentTrialEnd, "PPP")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Days Remaining</span>
              <Badge variant={daysRemaining <= 3 ? "destructive" : daysRemaining <= 7 ? "secondary" : "outline"}>
                {daysRemaining > 0 ? `${daysRemaining} days` : daysRemaining === 0 ? "Ends today" : "Expired"}
              </Badge>
            </div>
            {trialStarted && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trial Started</span>
                <span className="text-sm">{format(trialStarted, "PPP")}</span>
              </div>
            )}
          </div>

          {/* New Trial End Date */}
          <div className="space-y-3">
            <Label>New Trial End Date</Label>
            <div className="flex gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !newTrialEnd && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newTrialEnd ? format(newTrialEnd, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newTrialEnd}
                    onSelect={(date) => {
                      if (date) {
                        setNewTrialEnd(date);
                        setCalendarOpen(false);
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" onClick={resetToOriginal}>
                <Minus className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Extension Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickExtend(7)}
              >
                <Plus className="h-3 w-3 mr-1" />
                7 days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickExtend(14)}
              >
                <Plus className="h-3 w-3 mr-1" />
                14 days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickExtend(30)}
              >
                <Plus className="h-3 w-3 mr-1" />
                30 days
              </Button>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Extension (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Customer requested more time for evaluation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {extensionDays !== 0 && (
            <div className={cn(
              "p-4 rounded-lg flex items-start gap-3",
              extensionDays > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"
            )}>
              <AlertCircle className={cn(
                "h-5 w-5 mt-0.5",
                extensionDays > 0 ? "text-emerald-600" : "text-amber-600"
              )} />
              <div>
                <p className={cn(
                  "font-medium",
                  extensionDays > 0 ? "text-emerald-700" : "text-amber-700"
                )}>
                  {extensionDays > 0 
                    ? `Trial will be extended by ${extensionDays} days`
                    : `Trial will be shortened by ${Math.abs(extensionDays)} days`
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  New end date: {format(newTrialEnd, "PPP")} ({newDaysRemaining} days remaining)
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={extendTrialMutation.isPending || extensionDays === 0}
          >
            {extendTrialMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
