import { useState, useEffect } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings2, Trash2, Plus, Loader2, AlertTriangle, History, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { useQueryClient } from "@tanstack/react-query";

interface LeaveType {
  id: string;
  name: string;
  category: string;
}

interface AssignedLeaveType {
  id: string;
  leave_type_id: string;
  leave_type_name: string;
  category: string;
  balance: number;
}

interface ManageLeaveTypesDialogProps {
  employeeId: string;
  onSuccess?: () => void;
}

interface DeleteConfirmation {
  leaveType: AssignedLeaveType;
  logCount: number;
  requestCount: number;
}

interface PreviousYearBalance {
  leave_type_id: string;
  leave_type_name: string;
  category: string;
  balance: number;
}

export const ManageLeaveTypesDialog = ({
  employeeId,
  onSuccess,
}: ManageLeaveTypesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assignedTypes, setAssignedTypes] = useState<AssignedLeaveType[]>([]);
  const [availableTypes, setAvailableTypes] = useState<LeaveType[]>([]);
  const [previousYearBalances, setPreviousYearBalances] = useState<PreviousYearBalance[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [initialBalance, setInitialBalance] = useState<string>("0");
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState(false);
  const [copyingFromPrevious, setCopyingFromPrevious] = useState(false);
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  useEffect(() => {
    if (open && currentOrg) {
      loadData();
    }
  }, [open, currentOrg?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAssignedTypes(), loadAllLeaveTypes(), loadPreviousYearBalances()]);
    } finally {
      setLoading(false);
    }
  };

  const loadPreviousYearBalances = async () => {
    if (!currentOrg) return;

    const { data, error } = await supabase
      .from("leave_type_balances")
      .select(`
        leave_type_id,
        balance,
        leave_type:leave_types!inner(
          id,
          name,
          category
        )
      `)
      .eq("employee_id", employeeId)
      .eq("organization_id", currentOrg.id)
      .eq("year", previousYear);

    if (error) {
      console.error("Error loading previous year balances:", error);
      return;
    }

    const mapped = (data || []).map((item: any) => ({
      leave_type_id: item.leave_type_id,
      leave_type_name: item.leave_type.name,
      category: item.leave_type.category,
      balance: item.balance,
    }));

    setPreviousYearBalances(mapped);
  };

  const loadAssignedTypes = async () => {
    if (!currentOrg) return;

    const { data, error } = await supabase
      .from("leave_type_balances")
      .select(`
        id,
        leave_type_id,
        balance,
        leave_type:leave_types!inner(
          id,
          name,
          category
        )
      `)
      .eq("employee_id", employeeId)
      .eq("organization_id", currentOrg.id)
      .eq("year", currentYear);

    if (error) {
      console.error("Error loading assigned types:", error);
      return;
    }

    const mapped = (data || []).map((item: any) => ({
      id: item.id,
      leave_type_id: item.leave_type_id,
      leave_type_name: item.leave_type.name,
      category: item.leave_type.category,
      balance: item.balance,
    }));

    setAssignedTypes(mapped);
  };

  const loadAllLeaveTypes = async () => {
    if (!currentOrg) return;

    const { data, error } = await supabase
      .from("leave_types")
      .select("id, name, category")
      .eq("organization_id", currentOrg.id)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error loading leave types:", error);
      return;
    }

    setAvailableTypes(data || []);
  };

  // Filter to show only unassigned leave types
  const unassignedTypes = availableTypes.filter(
    (lt) => !assignedTypes.some((at) => at.leave_type_id === lt.id)
  );

  const handleAddLeaveType = async () => {
    if (!selectedType || !currentOrg) return;

    setAddingType(true);
    try {
      const balance = parseFloat(initialBalance) || 0;
      const selectedLeaveType = availableTypes.find((lt) => lt.id === selectedType);

      if (!selectedLeaveType) throw new Error("Leave type not found");

      // Get current user for logging
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: currentEmployee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .maybeSingle();

      if (!currentEmployee) throw new Error("Employee not found");

      // Insert log only - trigger will create balance automatically
      const { error: logError } = await supabase.from("leave_balance_logs").insert({
        employee_id: employeeId,
        organization_id: currentOrg.id,
        leave_type: selectedLeaveType.name,
        leave_type_id: selectedType,
        change_amount: balance,
        previous_balance: 0,
        new_balance: balance,
        reason: "Leave type added to employee",
        created_by: currentEmployee.id,
        effective_date: new Date().toISOString().split("T")[0],
        action: "manual_adjustment",
        year: currentYear,
      });

      if (logError) throw logError;

      toast.success(`${selectedLeaveType.name} added successfully`);
      setSelectedType("");
      setInitialBalance("0");
      await loadAssignedTypes();
      invalidateQueries();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error adding leave type:", error);
      toast.error(error.message || "Failed to add leave type");
    } finally {
      setAddingType(false);
    }
  };

  const handleRemoveClick = async (leaveType: AssignedLeaveType) => {
    setDeletingId(leaveType.leave_type_id);

    try {
      // Count related records
      const [logResult, requestResult] = await Promise.all([
        supabase
          .from("leave_balance_logs")
          .select("id", { count: "exact", head: true })
          .eq("employee_id", employeeId)
          .eq("leave_type_id", leaveType.leave_type_id),
        supabase
          .from("leave_requests")
          .select("id", { count: "exact", head: true })
          .eq("employee_id", employeeId)
          .eq("leave_type_id", leaveType.leave_type_id),
      ]);

      setDeleteConfirmation({
        leaveType,
        logCount: logResult.count || 0,
        requestCount: requestResult.count || 0,
      });
    } catch (error) {
      console.error("Error counting related records:", error);
      toast.error("Failed to check related records");
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;

    setDeletingId(deleteConfirmation.leaveType.leave_type_id);
    try {
      const leaveTypeId = deleteConfirmation.leaveType.leave_type_id;

      // Delete in order: logs, requests, then balance
      await supabase
        .from("leave_balance_logs")
        .delete()
        .eq("employee_id", employeeId)
        .eq("leave_type_id", leaveTypeId);

      await supabase
        .from("leave_requests")
        .delete()
        .eq("employee_id", employeeId)
        .eq("leave_type_id", leaveTypeId);

      await supabase
        .from("leave_type_balances")
        .delete()
        .eq("employee_id", employeeId)
        .eq("leave_type_id", leaveTypeId);

      const totalDeleted = deleteConfirmation.logCount + deleteConfirmation.requestCount;
      toast.success(
        `${deleteConfirmation.leaveType.leave_type_name} removed` +
          (totalDeleted > 0 ? ` along with ${totalDeleted} related records` : "")
      );

      setDeleteConfirmation(null);
      await loadAssignedTypes();
      invalidateQueries();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error deleting leave type:", error);
      toast.error(error.message || "Failed to remove leave type");
    } finally {
      setDeletingId(null);
    }
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["leave-type-balances-profile", employeeId] });
    queryClient.invalidateQueries({ queryKey: ["leave-balances", employeeId] });
  };

  // Copy balances from previous year with carry-forward
  const handleCopyFromPreviousYear = async () => {
    if (!currentOrg || previousYearBalances.length === 0) return;

    setCopyingFromPrevious(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: currentEmployee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .maybeSingle();
        
      if (!currentEmployee) throw new Error("Employee not found");
      const creatorEmployeeId = currentEmployee.id;

      // Get leave type details for carry-forward rules
      const leaveTypeIds = previousYearBalances.map(b => b.leave_type_id);
      const { data: leaveTypes } = await supabase
        .from("leave_types")
        .select("id, name, default_days, carry_forward_mode")
        .in("id", leaveTypeIds)
        .eq("is_active", true);

      const leaveTypeMap = new Map((leaveTypes || []).map(lt => [lt.id, lt]));
      
      let created = 0;
      let skipped = 0;

      for (const prevBalance of previousYearBalances) {
        // Check if already exists for current year
        const alreadyExists = assignedTypes.some(at => at.leave_type_id === prevBalance.leave_type_id);
        if (alreadyExists) {
          skipped++;
          continue;
        }

        const leaveType = leaveTypeMap.get(prevBalance.leave_type_id);
        if (!leaveType) continue;

        // Calculate new balance with carry-forward
        const defaultDays = leaveType.default_days || 0;
        const mode = leaveType.carry_forward_mode || 'none';
        let carriedForward = 0;

        if (mode === 'all') {
          carriedForward = prevBalance.balance;
        } else if (mode === 'positive_only' && prevBalance.balance > 0) {
          carriedForward = prevBalance.balance;
        } else if (mode === 'negative_only' && prevBalance.balance < 0) {
          carriedForward = prevBalance.balance;
        }

        // Insert logs only - trigger will create balance automatically
        // Log 1: Year allocation (default days)
        const { error: allocationError } = await supabase.from("leave_balance_logs").insert({
          employee_id: employeeId,
          organization_id: currentOrg.id,
          leave_type: prevBalance.leave_type_name,
          leave_type_id: prevBalance.leave_type_id,
          change_amount: defaultDays,
          previous_balance: 0,
          new_balance: defaultDays,
          reason: `${currentYear} annual allocation`,
          created_by: creatorEmployeeId,
          effective_date: `${currentYear}-01-01`,
          action: "year_allocation",
          year: currentYear,
        });

        if (allocationError) {
          console.error("Error inserting allocation log:", allocationError);
          continue;
        }

        created++;

        // Log 2: Carry forward (if applicable)
        if (carriedForward !== 0) {
          await supabase.from("leave_balance_logs").insert({
            employee_id: employeeId,
            organization_id: currentOrg.id,
            leave_type: prevBalance.leave_type_name,
            leave_type_id: prevBalance.leave_type_id,
            change_amount: carriedForward,
            previous_balance: defaultDays,
            new_balance: defaultDays + carriedForward,
            reason: `Carried from ${previousYear}`,
            created_by: creatorEmployeeId,
            effective_date: `${currentYear}-01-01`,
            action: "carry_forward_in",
            year: currentYear,
          });
        }
      }

      if (created > 0) {
        toast.success(`Copied ${created} leave types from ${previousYear}${skipped > 0 ? ` (${skipped} already existed)` : ''}`);
        await loadAssignedTypes();
        invalidateQueries();
        onSuccess?.();
      } else if (skipped > 0) {
        toast.info(`All ${skipped} leave types already exist for ${currentYear}`);
      }
    } catch (error: any) {
      console.error("Error copying from previous year:", error);
      toast.error(error.message || "Failed to copy balances");
    } finally {
      setCopyingFromPrevious(false);
    }
  };

  // Check if there are previous year balances that can be copied
  const canCopyFromPrevious = previousYearBalances.some(
    prev => !assignedTypes.some(at => at.leave_type_id === prev.leave_type_id)
  );

  // Sort: paid first, then alphabetically
  const sortedAssignedTypes = [...assignedTypes].sort((a, b) => {
    if (a.category === "paid" && b.category !== "paid") return -1;
    if (a.category !== "paid" && b.category === "paid") return 1;
    return a.leave_type_name.localeCompare(b.leave_type_name);
  });

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="hidden sm:flex">
            <Settings2 className="h-4 w-4 mr-1" />
            Manage
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Leave Types</DialogTitle>
            <DialogDescription>
              Add or remove leave types for this employee. Removing a leave type will delete all
              related balance logs and leave requests.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Quick Actions - Show when no assigned types but previous year has data */}
            {!loading && sortedAssignedTypes.length === 0 && canCopyFromPrevious && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Quick Actions
                </div>
                <p className="text-xs text-muted-foreground">
                  This employee had {previousYearBalances.length} leave types in {previousYear}. 
                  You can quickly copy them with carry-forward rules applied.
                </p>
                <Button
                  size="sm"
                  onClick={handleCopyFromPreviousYear}
                  disabled={copyingFromPrevious}
                  className="gap-1.5"
                >
                  {copyingFromPrevious ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <History className="h-3.5 w-3.5" />
                  )}
                  Copy from {previousYear}
                </Button>
              </div>
            )}

            {/* Quick Copy Button - Show inline when some types exist but more can be copied */}
            {!loading && sortedAssignedTypes.length > 0 && canCopyFromPrevious && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-muted/30">
                <div className="text-xs text-muted-foreground">
                  <History className="h-3.5 w-3.5 inline mr-1.5" />
                  {previousYearBalances.filter(p => !assignedTypes.some(a => a.leave_type_id === p.leave_type_id)).length} more leave types from {previousYear}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyFromPreviousYear}
                  disabled={copyingFromPrevious}
                  className="h-7 text-xs gap-1"
                >
                  {copyingFromPrevious ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  Copy Remaining
                </Button>
              </div>
            )}

            {/* Current Leave Types */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Current Leave Types ({currentYear})</Label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : sortedAssignedTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No leave types assigned for {currentYear}
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedAssignedTypes.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">{item.leave_type_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant="outline"
                              className={
                                item.category === "paid"
                                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                              }
                            >
                              {item.category}
                            </Badge>
                            <span
                              className={`text-xs font-medium ${
                                item.balance < 0 ? "text-destructive" : "text-muted-foreground"
                              }`}
                            >
                              Balance: {item.balance < 0 ? `(${Math.abs(item.balance)})` : item.balance}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveClick(item)}
                        disabled={deletingId === item.leave_type_id}
                      >
                        {deletingId === item.leave_type_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Leave Type */}
            {unassignedTypes.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium">Add Leave Type</Label>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Leave Type</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedTypes.map((lt) => (
                          <SelectItem key={lt.id} value={lt.id}>
                            {lt.name} ({lt.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Initial Balance</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                    />
                  </div>
                  <Button
                    size="default"
                    onClick={handleAddLeaveType}
                    disabled={!selectedType || addingType}
                  >
                    {addingType ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deleteConfirmation}
        onOpenChange={(open) => !open && setDeleteConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Leave Type
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to remove{" "}
                <strong>{deleteConfirmation?.leaveType.leave_type_name}</strong> from this employee?
              </p>
              {(deleteConfirmation?.logCount || 0) > 0 || (deleteConfirmation?.requestCount || 0) > 0 ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    This will also delete:
                  </p>
                  <ul className="text-sm text-destructive/80 list-disc list-inside">
                    {(deleteConfirmation?.logCount || 0) > 0 && (
                      <li>{deleteConfirmation?.logCount} balance adjustment log(s)</li>
                    )}
                    {(deleteConfirmation?.requestCount || 0) > 0 && (
                      <li>{deleteConfirmation?.requestCount} leave request(s)</li>
                    )}
                  </ul>
                </div>
              ) : null}
              <p className="text-sm font-medium text-destructive">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={!!deletingId}
            >
              {deletingId ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete Leave Type & Records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
