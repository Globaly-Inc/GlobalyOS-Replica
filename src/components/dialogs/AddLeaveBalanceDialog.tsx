import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

interface AddLeaveBalanceDialogProps {
  employeeId: string;
  currentBalance: {
    vacation_days: number;
    sick_days: number;
    pto_days: number;
  } | null;
  onSuccess: () => void;
}

export const AddLeaveBalanceDialog = ({
  employeeId,
  currentBalance,
  onSuccess,
}: AddLeaveBalanceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaveType, setLeaveType] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const { currentOrg } = useOrganization();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveType || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const changeAmount = parseFloat(amount);
    if (isNaN(changeAmount) || changeAmount === 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);

    try {
      // Get current user's employee ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: currentEmployee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg?.id)
        .maybeSingle();

      if (!currentEmployee) throw new Error("Employee not found");

      const currentYear = new Date().getFullYear();
      
      // Get the field name for the leave type
      const fieldMap: Record<string, string> = {
        vacation: "vacation_days",
        sick: "sick_days",
        pto: "pto_days",
      };
      const field = fieldMap[leaveType];
      
      // Calculate previous and new balance
      const previousBalance = currentBalance
        ? (currentBalance as any)[field] || 0
        : 0;
      const newBalance = previousBalance + changeAmount;

      // First, upsert the leave balance
      const { error: balanceError } = await supabase
        .from("leave_balances")
        .upsert(
          {
            employee_id: employeeId,
            organization_id: currentOrg?.id,
            year: currentYear,
            [field]: newBalance,
          },
          {
            onConflict: "employee_id,year",
          }
        );

      if (balanceError) {
        // If upsert fails, try update
        const { error: updateError } = await supabase
          .from("leave_balances")
          .update({ [field]: newBalance })
          .eq("employee_id", employeeId)
          .eq("year", currentYear);

        if (updateError) {
          // If update fails, try insert
          const { error: insertError } = await supabase
            .from("leave_balances")
            .insert({
              employee_id: employeeId,
              organization_id: currentOrg?.id,
              year: currentYear,
              [field]: newBalance,
            });

          if (insertError) throw insertError;
        }
      }

      // Create the log entry
      const { error: logError } = await supabase
        .from("leave_balance_logs")
        .insert({
          employee_id: employeeId,
          organization_id: currentOrg?.id,
          leave_type: leaveType,
          change_amount: changeAmount,
          previous_balance: previousBalance,
          new_balance: newBalance,
          reason: reason || null,
          created_by: currentEmployee.id,
        });

      if (logError) throw logError;

      toast.success("Leave balance updated successfully");
      setOpen(false);
      setLeaveType("");
      setAmount("");
      setReason("");
      onSuccess();
    } catch (error: any) {
      console.error("Error updating leave balance:", error);
      toast.error(error.message || "Failed to update leave balance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Leave
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Leave Balance</DialogTitle>
            <DialogDescription>
              Add or deduct leave days from the employee's balance. Use negative
              numbers to deduct.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="leave-type">Leave Type *</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger id="leave-type">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation Days</SelectItem>
                  <SelectItem value="sick">Sick Days</SelectItem>
                  <SelectItem value="pto">PTO Days</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Annual leave allocation, Carry forward from last year"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
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
