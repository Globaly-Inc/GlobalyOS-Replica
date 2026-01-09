import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

interface LeaveType {
  id: string;
  name: string;
  category: string;
}

interface AddLeaveBalanceDialogProps {
  employeeId: string;
  onSuccess?: () => void;
}

export const AddLeaveBalanceDialog = ({
  employeeId,
  onSuccess
}: AddLeaveBalanceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaveType, setLeaveType] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (open && currentOrg) {
      loadLeaveTypes();
      setEffectiveDate(new Date());
    }
  }, [open, currentOrg?.id]);

  const loadLeaveTypes = async () => {
    if (!currentOrg) return;
    const { data, error } = await supabase
      .from("leave_types")
      .select("id, name, category")
      .eq("organization_id", currentOrg.id)
      .eq("is_active", true)
      .order("name");
    if (!error && data) {
      setLeaveTypes(data);
    }
  };

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

      const selectedLeaveType = leaveTypes.find(lt => lt.id === leaveType);
      if (!selectedLeaveType) throw new Error("Leave type not found");

      // Get current balance to calculate new_balance for the log
      const { data: existingBalance } = await supabase
        .from("leave_type_balances")
        .select("id, balance")
        .eq("employee_id", employeeId)
        .eq("leave_type_id", leaveType)
        .eq("year", currentYear)
        .maybeSingle();
      
      const previousBalance = existingBalance?.balance || 0;
      const newBalance = previousBalance + changeAmount;

      // Only insert the log - the sync_balance_from_log trigger will handle the balance update
      const { error: logError } = await supabase
        .from("leave_balance_logs")
        .insert({
          employee_id: employeeId,
          organization_id: currentOrg?.id,
          leave_type: selectedLeaveType.name,
          leave_type_id: leaveType,
          change_amount: changeAmount,
          previous_balance: previousBalance,
          new_balance: newBalance,
          reason: reason || null,
          created_by: currentEmployee.id,
          effective_date: format(effectiveDate, "yyyy-MM-dd"),
          action: "manual_adjustment",
          year: currentYear
        });
      if (logError) throw logError;
      toast.success("Leave balance updated successfully");
      setOpen(false);
      setLeaveType("");
      setAmount("");
      setReason("");
      onSuccess?.();
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
        <Button size="sm" variant="outline" className="hidden sm:flex">
          <Plus className="h-4 w-4 mr-1" />
          Adjust Leave Balance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adjust Leave Balance</DialogTitle>
            <DialogDescription>
              Add or deduct leave days from the employee's balance. Use negative numbers to deduct.
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
                  {leaveTypes.length === 0 ? (
                    <SelectItem value="none" disabled>No leave types configured</SelectItem>
                  ) : (
                    leaveTypes.map(lt => (
                      <SelectItem key={lt.id} value={lt.id}>
                        {lt.name} ({lt.category})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {leaveTypes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Configure leave types in Settings → Leave
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Days to Add/Deduct *</Label>
              <Input
                id="amount"
                type="number"
                step="0.5"
                placeholder="e.g., 5 or -2"
                value={amount}
                onChange={e => setAmount(e.target.value)}
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
                    onSelect={(date) => date && setEffectiveDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                When this adjustment should be recorded
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Annual leave allocation, Carry forward from last year"
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || leaveTypes.length === 0}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};