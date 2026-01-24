import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Check, ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  currentBalance: number;
  maxNegative: number;
  availableBalance: number;
}

interface ApproveLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: {
    id: string;
    leave_type: string;
    days_count: number;
    start_date?: string;
    employee: {
      id: string;
      profiles: {
        full_name: string;
      };
    };
  } | null;
  onApprove: (requestId: string, newLeaveType?: string) => void;
  processing: boolean;
}

export const ApproveLeaveDialog = ({
  open,
  onOpenChange,
  request,
  onApprove,
  processing,
}: ApproveLeaveDialogProps) => {
  const { currentOrg } = useOrganization();
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>("");
  const [useAlternativeType, setUseAlternativeType] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedLeaveType("");
      setUseAlternativeType(false);
    }
  }, [open]);

  // Calculate the year from the leave request's start_date
  const requestYear = request?.start_date 
    ? new Date(request.start_date).getFullYear() 
    : new Date().getFullYear();

  // Fetch employee's leave balances (office-aware with legacy fallback)
  const { data: balances = [], isLoading: balancesLoading } = useQuery({
    queryKey: ["employee-leave-balances-for-approval", request?.employee?.id, currentOrg?.id, requestYear],
    queryFn: async () => {
      if (!request?.employee?.id || !currentOrg?.id) return [];
      
      // Get employee's office
      const { data: employee } = await supabase
        .from("employees")
        .select("office_id")
        .eq("id", request.employee.id)
        .single();

      const results: LeaveBalance[] = [];

      // Try office_leave_types first (new model)
      if (employee?.office_id) {
        const { data: officeLeaveTypes } = await supabase
          .from("office_leave_types")
          .select("id, name, max_negative_days")
          .eq("office_id", employee.office_id)
          .eq("is_active", true);

        if (officeLeaveTypes && officeLeaveTypes.length > 0) {
          // Get balances with office_leave_type_id
          const { data: balanceData } = await supabase
            .from("leave_type_balances")
            .select("office_leave_type_id, balance")
            .eq("employee_id", request.employee.id)
            .eq("year", requestYear)
            .not("office_leave_type_id", "is", null);

          const balanceMap = new Map(
            balanceData?.map(b => [b.office_leave_type_id, b.balance]) || []
          );

          for (const lt of officeLeaveTypes) {
            results.push({
              leaveTypeId: lt.id,
              leaveTypeName: lt.name,
              currentBalance: balanceMap.get(lt.id) || 0,
              maxNegative: lt.max_negative_days || 0,
              availableBalance: (balanceMap.get(lt.id) || 0) + (lt.max_negative_days || 0),
            });
          }

          if (results.length > 0) return results;
        }
      }

      // Fallback to legacy leave_types - but return empty since leave_type_id is removed
      // All balances should now use office_leave_types
      return [];
    },
    enabled: !!request?.employee?.id && !!currentOrg?.id && open,
  });

  // Find current leave type balance
  const currentLeaveTypeBalance = balances.find(
    b => b.leaveTypeName.toLowerCase() === request?.leave_type?.toLowerCase()
  );

  // Check if current leave type has insufficient balance
  const hasInsufficientBalance = currentLeaveTypeBalance
    ? (currentLeaveTypeBalance.currentBalance - (request?.days_count || 0)) < -currentLeaveTypeBalance.maxNegative
    : false;

  // Find alternative leave types with sufficient balance
  const alternativeLeaveTypes = balances.filter(b => {
    if (b.leaveTypeName.toLowerCase() === request?.leave_type?.toLowerCase()) return false;
    const projectedBalance = b.currentBalance - (request?.days_count || 0);
    return projectedBalance >= -b.maxNegative;
  });

  // Pre-select Unpaid Leave if available and has balance
  useEffect(() => {
    if (hasInsufficientBalance && alternativeLeaveTypes.length > 0 && !selectedLeaveType) {
      const unpaidLeave = alternativeLeaveTypes.find(
        lt => lt.leaveTypeName.toLowerCase().includes("unpaid")
      );
      if (unpaidLeave) {
        setSelectedLeaveType(unpaidLeave.leaveTypeName);
      } else {
        setSelectedLeaveType(alternativeLeaveTypes[0].leaveTypeName);
      }
    }
  }, [hasInsufficientBalance, alternativeLeaveTypes, selectedLeaveType]);

  const handleApprove = () => {
    if (!request) return;
    
    if (useAlternativeType && selectedLeaveType) {
      onApprove(request.id, selectedLeaveType);
    } else {
      onApprove(request.id);
    }
  };

  if (!request) return null;

  const projectedBalance = currentLeaveTypeBalance
    ? currentLeaveTypeBalance.currentBalance - request.days_count
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Approve Leave Request
          </DialogTitle>
          <DialogDescription>
            Review {request.employee.profiles.full_name}'s leave request before approving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Leave Type Balance */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{request.leave_type}</span>
              <Badge variant="outline">{request.days_count} {request.days_count === 1 ? "day" : "days"} requested</Badge>
            </div>

            {balancesLoading ? (
              <div className="text-sm text-muted-foreground">Loading balance...</div>
            ) : currentLeaveTypeBalance ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span className={cn(
                    "font-medium",
                    currentLeaveTypeBalance.currentBalance <= 0 ? "text-destructive" : "text-foreground"
                  )}>
                    {currentLeaveTypeBalance.currentBalance} days
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Max Negative Allowed</span>
                  <span className="font-medium">{currentLeaveTypeBalance.maxNegative} days</span>
                </div>
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Balance After Approval</span>
                  <span className={cn(
                    "font-medium",
                    projectedBalance < -currentLeaveTypeBalance.maxNegative ? "text-destructive" : 
                    projectedBalance < 0 ? "text-amber-600" : "text-green-600"
                  )}>
                    {projectedBalance} days
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Balance information unavailable</div>
            )}

            {/* Insufficient Balance Warning */}
            {hasInsufficientBalance && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Insufficient Balance</p>
                  <p className="text-destructive/80">
                    Approving this request would exceed the maximum negative balance limit of {currentLeaveTypeBalance?.maxNegative} days.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Alternative Leave Type Option */}
          {hasInsufficientBalance && alternativeLeaveTypes.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Convert to Alternative Leave Type</p>
                  <p className="text-xs text-muted-foreground">
                    You can approve this request by converting it to a different leave type that has sufficient balance.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useAlternative"
                  checked={useAlternativeType}
                  onChange={(e) => setUseAlternativeType(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="useAlternative" className="text-sm cursor-pointer">
                  Convert to alternative leave type
                </Label>
              </div>

              {useAlternativeType && (
                <div className="space-y-2">
                  <Label className="text-sm">Select Leave Type</Label>
                  <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {alternativeLeaveTypes.map((lt) => (
                        <SelectItem key={lt.leaveTypeId} value={lt.leaveTypeName}>
                          <div className="flex items-center justify-between w-full gap-3">
                            <span>{lt.leaveTypeName}</span>
                            <span className="text-xs text-muted-foreground">
                              ({lt.availableBalance} days available)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedLeaveType && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Badge variant="outline">{request.leave_type}</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {selectedLeaveType}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No alternatives available */}
          {hasInsufficientBalance && alternativeLeaveTypes.length === 0 && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">No Alternative Available</p>
                <p className="text-amber-700">
                  There are no other leave types with sufficient balance to convert this request. 
                  You may still approve if you have override permissions.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={processing || (hasInsufficientBalance && !useAlternativeType && alternativeLeaveTypes.length > 0)}
            className={cn(
              hasInsufficientBalance && !useAlternativeType && "bg-amber-600 hover:bg-amber-700"
            )}
          >
            <Check className="mr-1 h-4 w-4" />
            {processing ? "Processing..." : 
              useAlternativeType && selectedLeaveType 
                ? `Approve as ${selectedLeaveType}` 
                : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
