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
import { Settings2, Trash2, Plus, Loader2, AlertTriangle } from "lucide-react";
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

export const ManageLeaveTypesDialog = ({
  employeeId,
  onSuccess,
}: ManageLeaveTypesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assignedTypes, setAssignedTypes] = useState<AssignedLeaveType[]>([]);
  const [availableTypes, setAvailableTypes] = useState<LeaveType[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [initialBalance, setInitialBalance] = useState<string>("0");
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState(false);
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (open && currentOrg) {
      loadData();
    }
  }, [open, currentOrg?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAssignedTypes(), loadAllLeaveTypes()]);
    } finally {
      setLoading(false);
    }
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

      // Insert leave_type_balance
      const { error: insertError } = await supabase
        .from("leave_type_balances")
        .insert({
          employee_id: employeeId,
          leave_type_id: selectedType,
          organization_id: currentOrg.id,
          year: currentYear,
          balance: balance,
        });

      if (insertError) throw insertError;

      // Log the addition
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: currentEmployee } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", user.id)
          .eq("organization_id", currentOrg.id)
          .maybeSingle();

        if (currentEmployee) {
          await supabase.from("leave_balance_logs").insert({
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
          });
        }
      }

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
            {/* Current Leave Types */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Current Leave Types</Label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : sortedAssignedTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No leave types assigned
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
