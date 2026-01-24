import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import { useOrganization } from "@/hooks/useOrganization";

interface LeaveAdjustment {
  id: string;
  leave_type: string;
  change_amount: number;
  reason: string | null;
  effective_date: string | null;
  previous_balance: number;
  new_balance: number;
}

interface EditLeaveAdjustmentDialogProps {
  adjustment: LeaveAdjustment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  employeeId?: string;
}

export const EditLeaveAdjustmentDialog = ({
  adjustment,
  open,
  onOpenChange,
  onSuccess,
  employeeId
}: EditLeaveAdjustmentDialogProps) => {
  const { currentOrg } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>();

  useEffect(() => {
    if (adjustment && open) {
      setAmount(adjustment.change_amount.toString());
      setReason(adjustment.reason || "");
      setEffectiveDate(adjustment.effective_date ? new Date(adjustment.effective_date) : new Date());
    }
  }, [adjustment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustment) return;

    const changeAmount = parseFloat(amount);
    if (isNaN(changeAmount) || changeAmount === 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      // Get current user's employee ID for audit trail
      const { data: { user } } = await supabase.auth.getUser();
      const { data: currentEmployee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user?.id)
        .eq("organization_id", currentOrg?.id)
        .maybeSingle();

      // Update the leave_balance_logs entry
      const { error: logError } = await supabase
        .from("leave_balance_logs")
        .update({
          change_amount: changeAmount,
          reason: reason || null,
          effective_date: effectiveDate ? format(effectiveDate, "yyyy-MM-dd") : null,
          updated_by: currentEmployee?.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", adjustment.id);

      if (logError) throw logError;

      // If balance changed, recalculate from all logs for this leave type
      const balanceDiff = changeAmount - adjustment.change_amount;
      if (balanceDiff !== 0 && employeeId) {
        // Get the office_leave_type_id from office_leave_types table
        const { data: employee } = await supabase
          .from("employees")
          .select("office_id")
          .eq("id", employeeId)
          .single();

        if (employee?.office_id) {
          const { data: leaveTypeData } = await supabase
            .from("office_leave_types")
            .select("id")
            .eq("office_id", employee.office_id)
            .eq("name", adjustment.leave_type)
            .single();

          if (leaveTypeData) {
            const currentYear = new Date().getFullYear();
            
            // Recalculate balance from ALL logs for this employee/leave_type/year
            const { data: allLogs } = await supabase
              .from("leave_balance_logs")
              .select("change_amount")
              .eq("employee_id", employeeId)
              .eq("office_leave_type_id", leaveTypeData.id)
              .eq("year", currentYear);

            const totalBalance = allLogs?.reduce((sum, log) => sum + (log.change_amount || 0), 0) || 0;

            // Update or insert the balance
            const { data: existingBalance } = await supabase
              .from("leave_type_balances")
              .select("id")
              .eq("employee_id", employeeId)
              .eq("office_leave_type_id", leaveTypeData.id)
              .eq("year", currentYear)
              .maybeSingle();

            if (existingBalance) {
              await supabase
                .from("leave_type_balances")
                .update({ balance: totalBalance, updated_at: new Date().toISOString() })
                .eq("id", existingBalance.id);
            }
          }
        }
      }

      // Send notification to employee about the edit
      if (employeeId && currentEmployee) {
        const { data: employeeData } = await supabase
          .from("employees")
          .select("user_id")
          .eq("id", employeeId)
          .single();

        if (employeeData?.user_id) {
          await supabase.from("notifications").insert({
            user_id: employeeData.user_id,
            organization_id: currentOrg?.id,
            type: "leave_adjustment_edited",
            title: "Leave Adjustment Updated",
            message: `Your ${adjustment.leave_type} balance adjustment was updated by HR/Admin`,
            reference_type: "leave_balance_log",
            reference_id: adjustment.id,
            actor_id: currentEmployee.id
          });
        }
      }

      toast.success("Leave adjustment updated successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      showErrorToast(error, "Failed to update leave adjustment", {
        componentName: "EditLeaveAdjustmentDialog",
        actionAttempted: "Update leave adjustment",
        errorType: "database",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Leave Adjustment</DialogTitle>
            <DialogDescription>
              Modify the leave balance adjustment for {adjustment?.leave_type}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Leave Type</Label>
              <Input value={adjustment?.leave_type || ""} disabled className="bg-muted" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Days to Add/Deduct *</Label>
              <Input
                id="amount"
                type="number"
                step="0.5"
                placeholder="e.g., 5 or -2"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use positive numbers to add, negative to deduct
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Effective Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !effectiveDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {effectiveDate ? format(effectiveDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={effectiveDate}
                    onSelect={setEffectiveDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Annual leave allocation, Carry forward"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};