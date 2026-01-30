import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, Check, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useLeaveRealtime } from "@/services/useLeaveRealtime";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { format, parseISO } from "date-fns";
import { OrgLink } from "./OrgLink";
import { ApproveLeaveDialog } from "./dialogs/ApproveLeaveDialog";
import { cn } from "@/lib/utils";

interface LeaveBalance {
  leaveTypeName: string;
  currentBalance: number;
  maxNegative: number;
  availableBalance: number;
}

interface PendingLeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  half_day_type: 'full' | 'first_half' | 'second_half';
  reason: string | null;
  isHRBackup?: boolean;
  managerName?: string;
  balance?: LeaveBalance;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

interface OwnPendingRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  half_day_type: 'full' | 'first_half' | 'second_half';
  reason: string | null;
}

interface PendingLeaveApprovalsProps {
  onApprovalChange?: () => void;
}

export const PendingLeaveApprovals = ({ onApprovalChange }: PendingLeaveApprovalsProps) => {
  const [pendingRequests, setPendingRequests] = useState<PendingLeaveRequest[]>([]);
  const [ownPendingRequests, setOwnPendingRequests] = useState<OwnPendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isManagerOnLeave, setIsManagerOnLeave] = useState(false);
  const [showAsHR, setShowAsHR] = useState(false);
  
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    request: PendingLeaveRequest | null;
  }>({ open: false, request: null });
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    request: PendingLeaveRequest | null;
  }>({ open: false, request: null });
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    request: OwnPendingRequest | null;
  }>({ open: false, request: null });
  const { currentOrg } = useOrganization();
  const { isHR, isAdmin } = useUserRole();
  const isAdminOrHR = isAdmin || isHR;
  

  // Subscribe to real-time leave updates for immediate refresh
  useLeaveRealtime();


  useEffect(() => {
    if (currentOrg) {
      loadPendingRequests();

      // Set up realtime subscription for leave_requests
      const channel = supabase
        .channel('pending-leave-requests')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leave_requests',
            filter: `organization_id=eq.${currentOrg.id}`,
          },
          () => {
            loadPendingRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentOrg?.id]);

  // Batch fetch balances with office-aware leave type resolution
  const fetchBalancesBatchOfficeAware = async (
    requests: Array<{ employeeId: string; officeId: string | null; leaveType: string }>,
    requestYear: number
  ): Promise<Map<string, LeaveBalance>> => {
    if (!currentOrg || requests.length === 0) return new Map();
    
    // Get unique office IDs (filter out nulls)
    const officeIds = [...new Set(requests.map(r => r.officeId).filter(Boolean))] as string[];
    
    if (officeIds.length === 0) return new Map();

    // Fetch all office_leave_types for these offices in one query
    const { data: officeLeaveTypes } = await supabase
      .from("office_leave_types")
      .select("id, name, max_negative_days, office_id")
      .in("office_id", officeIds)
      .eq("is_active", true);

    // Build map: "officeId:leaveTypeName" -> leave type info
    const officeLeaveTypesMap = new Map<string, { id: string; name: string; max_negative_days: number; office_id: string }>();
    (officeLeaveTypes || []).forEach(lt => {
      officeLeaveTypesMap.set(`${lt.office_id}:${lt.name.toLowerCase()}`, lt);
    });

    // Get all office_leave_type_ids we need
    const leaveTypeIds = requests
      .map(r => r.officeId ? officeLeaveTypesMap.get(`${r.officeId}:${r.leaveType.toLowerCase()}`)?.id : null)
      .filter(Boolean) as string[];

    if (leaveTypeIds.length === 0) return new Map();

    // Fetch balances using correct office_leave_type_ids
    const { data: balances } = await supabase
      .from("leave_type_balances")
      .select("employee_id, office_leave_type_id, balance")
      .in("employee_id", [...new Set(requests.map(r => r.employeeId))])
      .in("office_leave_type_id", [...new Set(leaveTypeIds)])
      .eq("year", requestYear);

    // Build result map
    const balanceMap = new Map<string, LeaveBalance>();
    requests.forEach(req => {
      if (!req.officeId) return;
      
      const leaveType = officeLeaveTypesMap.get(`${req.officeId}:${req.leaveType.toLowerCase()}`);
      if (!leaveType) return;

      const balance = (balances || []).find(
        (b: any) => b.employee_id === req.employeeId && b.office_leave_type_id === leaveType.id
      );

      const currentBalance = balance?.balance || 0;
      const maxNegative = leaveType.max_negative_days || 0;

      balanceMap.set(`${req.employeeId}:${req.leaveType.toLowerCase()}`, {
        leaveTypeName: leaveType.name,
        currentBalance,
        maxNegative,
        availableBalance: currentBalance + maxNegative,
      });
    });

    return balanceMap;
  };

  const loadPendingRequests = async () => {
    if (!currentOrg) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get current employee
    const { data: currentEmployee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", currentOrg.id)
      .maybeSingle();

    if (!currentEmployee) {
      setLoading(false);
      return;
    }

    // Load user's own pending requests
    const { data: ownRequests } = await supabase
      .from("leave_requests")
      .select("id, leave_type, start_date, end_date, days_count, half_day_type, reason")
      .eq("employee_id", currentEmployee.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    setOwnPendingRequests((ownRequests || []) as OwnPendingRequest[]);

    const today = format(new Date(), "yyyy-MM-dd");

    // Check if current user (as manager) is on leave today
    const { data: managerLeave } = await supabase
      .from("leave_requests")
      .select("id")
      .eq("employee_id", currentEmployee.id)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today)
      .maybeSingle();

    setIsManagerOnLeave(!!managerLeave);

    // If manager is on leave and user is not HR/Admin, don't show approval requests
    if (managerLeave && !isAdminOrHR) {
      setPendingRequests([]);
      setLoading(false);
      return;
    }

    // Get pending requests - either as manager or HR
    let requests: PendingLeaveRequest[] = [];
    let hrBackupRequests: PendingLeaveRequest[] = [];

    // As manager, get direct reports' pending requests FIRST (include office_id)
    const { data: directReportRequests } = await supabase
      .from("leave_requests")
      .select(`
        id,
        leave_type,
        start_date,
        end_date,
        days_count,
        half_day_type,
        reason,
        employee:employees!leave_requests_employee_id_fkey(
          id,
          manager_id,
          office_id,
          profiles!inner(
            full_name,
            avatar_url
          )
        )
      `)
      .eq("organization_id", currentOrg.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    // Filter to only direct reports (where current user is the manager)
    const managerRequests = (directReportRequests || []).filter((req: any) => 
      req.employee?.manager_id === currentEmployee.id
    );

    // Get the year from first request (all requests in batch should be from same year context)
    const requestYear = managerRequests.length > 0 
      ? new Date(managerRequests[0].start_date).getFullYear() 
      : new Date().getFullYear();

    // Build request info with office_id for batch fetching
    const managerRequestsInfo = managerRequests.map((req: any) => ({
      employeeId: req.employee.id,
      officeId: req.employee.office_id,
      leaveType: req.leave_type,
    }));

    // Batch fetch balances for manager requests using office-aware function
    const balanceMap = await fetchBalancesBatchOfficeAware(managerRequestsInfo, requestYear);

    // Build requests with balances
    for (const req of managerRequests) {
      const balance = balanceMap.get(`${req.employee.id}:${req.leave_type.toLowerCase()}`);
      requests.push({
        ...req,
        balance,
      } as PendingLeaveRequest);
    }

    // If user is Admin or HR, also check for requests where manager is on leave
    if (isAdminOrHR) {
      const { data: allPending } = await supabase
        .from("leave_requests")
        .select(`
          id,
          leave_type,
          start_date,
          end_date,
          days_count,
          half_day_type,
          reason,
          employee:employees!leave_requests_employee_id_fkey(
            id,
            manager_id,
            office_id,
            profiles!inner(
              full_name,
              avatar_url
            )
          )
        `)
        .eq("organization_id", currentOrg.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (allPending) {
        const existingIds = new Set(requests.map(r => r.id));
        
        // Filter out already-handled requests and own requests
        const additionalRequests = allPending.filter((req: any) => 
          !existingIds.has(req.id) && req.employee?.id !== currentEmployee.id
        );

        // Get all manager IDs to check if they're on leave
        const managerIds = [...new Set(additionalRequests
          .map((req: any) => req.employee?.manager_id)
          .filter(Boolean))] as string[];

        // Batch check which managers are on leave
        const { data: managersOnLeave } = await supabase
          .from("leave_requests")
          .select("employee_id")
          .in("employee_id", managerIds)
          .eq("status", "approved")
          .lte("start_date", today)
          .gte("end_date", today);

        const managersOnLeaveSet = new Set((managersOnLeave || []).map(m => m.employee_id));

        // Batch fetch manager names
        const { data: managerProfiles } = await supabase
          .from("employees")
          .select("id, profiles!inner(full_name)")
          .in("id", managerIds);

        const managerNamesMap = new Map(
          (managerProfiles || []).map((m: any) => [m.id, m.profiles?.full_name || "Manager"])
        );

        // Get the year from first additional request
        const additionalRequestYear = additionalRequests.length > 0 
          ? new Date(additionalRequests[0].start_date).getFullYear() 
          : new Date().getFullYear();

        // Build request info with office_id for batch fetching
        const additionalRequestsInfo = additionalRequests.map((req: any) => ({
          employeeId: req.employee.id,
          officeId: req.employee.office_id,
          leaveType: req.leave_type,
        }));

        // Batch fetch balances for additional requests using office-aware function
        const additionalBalanceMap = await fetchBalancesBatchOfficeAware(additionalRequestsInfo, additionalRequestYear);

        for (const req of additionalRequests) {
          const emp = req.employee as any;
          const balance = additionalBalanceMap.get(`${emp.id}:${req.leave_type.toLowerCase()}`);
          
          if (emp.manager_id) {
            // Check if their manager is on leave
            if (managersOnLeaveSet.has(emp.manager_id)) {
              const managerName = managerNamesMap.get(emp.manager_id) || "Manager";
              
              const backupReq = {
                ...req,
                isHRBackup: true,
                managerName,
                balance,
              } as PendingLeaveRequest;
              
              hrBackupRequests.push(backupReq);
              requests.push(backupReq);
            }
          } else {
            // No manager assigned - HR/Admin should handle
            const backupReq = {
              ...req,
              isHRBackup: true,
              managerName: "No manager assigned",
              balance,
            } as PendingLeaveRequest;
            
            hrBackupRequests.push(backupReq);
            requests.push(backupReq);
          }
        }
      }
    }

    // Only show "Manager Unavailable" badge if there are HR backup requests
    setShowAsHR(hrBackupRequests.length > 0);
    setPendingRequests(requests);
    setLoading(false);
  };

  const handleApproval = async (requestId: string, approved: boolean, newLeaveType?: string) => {
    setProcessing(requestId);
    
    // Optimistic UI update - remove from list immediately
    const previousRequests = [...pendingRequests];
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPendingRequests(previousRequests); // Rollback
      setProcessing(null);
      return;
    }

    // Get the leave request details first
    const { data: leaveRequest } = await supabase
      .from("leave_requests")
      .select("employee_id, leave_type, days_count")
      .eq("id", requestId)
      .single();

    // Get current employee and their profile for reviewer name
    const { data: currentEmployee } = await supabase
      .from("employees")
      .select(`
        id,
        profiles!inner(full_name)
      `)
      .eq("user_id", user.id)
      .eq("organization_id", currentOrg?.id)
      .maybeSingle();

    // Build update object
    const updateData: any = {
      status: approved ? "approved" : "rejected",
      reviewed_by: currentEmployee?.id,
      reviewed_at: new Date().toISOString(),
    };

    // If converting to different leave type, update both leave_type and leave_type_id
    if (approved && newLeaveType && newLeaveType !== leaveRequest?.leave_type) {
      // Try office_leave_types first based on employee's office
      const { data: empOffice } = await supabase
        .from("employees")
        .select("office_id")
        .eq("id", leaveRequest?.employee_id)
        .maybeSingle();

      let newLeaveTypeData = null;

      if (empOffice?.office_id) {
        const { data: officeType } = await supabase
          .from("office_leave_types")
          .select("id")
          .eq("office_id", empOffice.office_id)
          .ilike("name", newLeaveType)
          .eq("is_active", true)
          .maybeSingle();
        newLeaveTypeData = officeType;
      }

      if (newLeaveTypeData) {
        updateData.leave_type = newLeaveType;
        updateData.office_leave_type_id = newLeaveTypeData.id;
      } else {
        toast.error(`Could not find leave type: ${newLeaveType}`);
        setPendingRequests(previousRequests); // Rollback
        setProcessing(null);
        return;
      }
    }

    const { error } = await supabase
      .from("leave_requests")
      .update(updateData)
      .eq("id", requestId);

    if (error) {
      toast.error(getErrorMessage(error, "Failed to update leave request"));
      console.error("Update leave status error:", error);
      setPendingRequests(previousRequests); // Rollback on error
    } else {
      const action = approved 
        ? (newLeaveType && newLeaveType !== leaveRequest?.leave_type 
            ? `approved as ${newLeaveType}` 
            : "approved")
        : "rejected";
      toast.success(`Leave request ${action}`);
      
      // Fire-and-forget notification - don't await, let it run in background
      const reviewerName = (currentEmployee as any)?.profiles?.full_name || "Manager";
      supabase.functions.invoke("notify-leave-decision", {
        body: {
          request_id: requestId,
          decision: approved ? "approved" : "rejected",
          reviewer_name: reviewerName,
        },
      }).catch(err => console.error("Failed to send notification:", err));
      
      // No need to reload - optimistic update already done, realtime will sync if needed
      onApprovalChange?.();
    }

    setProcessing(null);
    setApproveDialog({ open: false, request: null });
    setRejectDialog({ open: false, request: null });
  };

  const handleCancelRequest = async (requestId: string) => {
    setProcessing(requestId);

    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      toast.error(getErrorMessage(error, "Failed to cancel leave request"));
      console.error("Cancel leave request error:", error);
    } else {
      toast.success("Leave request cancelled");
      loadPendingRequests();
      onApprovalChange?.();
    }

    setProcessing(null);
    setCancelDialog({ open: false, request: null });
  };

  const openApproveDialog = (request: PendingLeaveRequest) => {
    setApproveDialog({ open: true, request });
  };

  const openRejectDialog = (request: PendingLeaveRequest) => {
    setRejectDialog({ open: true, request });
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vacation: "Vacation",
      sick: "Sick Leave",
      pto: "PTO",
      unpaid: "Unpaid Leave",
    };
    return labels[type] || type;
  };

  const hasInsufficientBalance = (request: PendingLeaveRequest) => {
    if (!request.balance) return false;
    const projectedBalance = request.balance.currentBalance - request.days_count;
    return projectedBalance < -request.balance.maxNegative;
  };

  if (loading) {
    return <CardSkeleton className="border-amber-200 bg-amber-50/50" lines={2} />;
  }

  if (pendingRequests.length === 0 && ownPendingRequests.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="p-6 border-amber-200 bg-amber-50/50">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Clock className="h-5 w-5 text-amber-600" />
          Pending Leave Requests
          {showAsHR && pendingRequests.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Manager Unavailable
            </Badge>
          )}
        </h3>
        <div className="space-y-4">
          {/* User's Own Pending Requests */}
          {ownPendingRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-lg bg-background p-4 shadow-sm border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline">
                      {getLeaveTypeLabel(request.leave_type)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Your Request
                    </Badge>
                    <span className="text-muted-foreground">
                      {format(parseISO(request.start_date), "MMM d")} - {format(parseISO(request.end_date), "MMM d")}
                    </span>
                    <span className="text-muted-foreground">
                      ({request.days_count} {request.days_count === 1 ? "day" : "days"})
                    </span>
                  </div>
                  {request.reason && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {request.reason}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setCancelDialog({ open: true, request })}
                  disabled={processing === request.id}
                >
                  <X className="mr-1 h-3 w-3" />
                  Cancel Request
                </Button>
              </div>
            </div>
          ))}

          {pendingRequests.map((request) => {
            const insufficientBalance = hasInsufficientBalance(request);
            
            return (
              <div
                key={request.id}
                className={cn(
                  "rounded-lg bg-background p-4 shadow-sm border transition-all",
                  insufficientBalance && "border-amber-300 bg-amber-50/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <OrgLink to={`/team/${request.employee.id}`}>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.employee.profiles.avatar_url || undefined} />
                      <AvatarFallback>
                        {request.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                  </OrgLink>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <OrgLink 
                        to={`/team/${request.employee.id}`}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {request.employee.profiles.full_name}
                      </OrgLink>
                      {request.isHRBackup && (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                          {request.managerName === "No manager assigned" 
                            ? "No manager" 
                            : `${request.managerName} on leave`}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {getLeaveTypeLabel(request.leave_type)}
                      </Badge>
                      {request.half_day_type !== 'full' && (
                        <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                          {request.half_day_type === 'first_half' ? '1st Half' : '2nd Half'}
                        </Badge>
                      )}
                      <span>
                        {format(parseISO(request.start_date), "MMM d")} - {format(parseISO(request.end_date), "MMM d")}
                      </span>
                      <span>({request.days_count} {request.days_count === 1 ? "day" : "days"})</span>
                    </div>
                    
                    {/* Balance Display */}
                    {request.balance && (
                      <div className="mt-2 flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs cursor-help",
                                  insufficientBalance 
                                    ? "bg-destructive/10 text-destructive border-destructive/30" 
                                    : request.balance.currentBalance <= 0 
                                      ? "bg-amber-100 text-amber-700 border-amber-200"
                                      : "bg-green-50 text-green-700 border-green-200"
                                )}
                              >
                                {insufficientBalance && (
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                )}
                                Balance: {request.balance.currentBalance} days
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <div className="space-y-1 text-xs">
                                <p><span className="font-medium">Current:</span> {request.balance.currentBalance} days</p>
                                <p><span className="font-medium">Max negative allowed:</span> {request.balance.maxNegative} days</p>
                                <p><span className="font-medium">After approval:</span> {request.balance.currentBalance - request.days_count} days</p>
                                {insufficientBalance && (
                                  <p className="text-destructive font-medium mt-1">
                                    Exceeds allowed negative balance!
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                    
                    {request.reason && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {request.reason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant={insufficientBalance ? "outline" : "default"}
                    className={cn(
                      "flex-1",
                      insufficientBalance && "border-amber-300 text-amber-700 hover:bg-amber-50"
                    )}
                    onClick={() => openApproveDialog(request)}
                    disabled={processing === request.id}
                  >
                    <Check className="mr-1 h-3 w-3" />
                    {insufficientBalance ? "Review & Approve" : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openRejectDialog(request)}
                    disabled={processing === request.id}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Approve Dialog with Balance and Leave Type Conversion */}
      <ApproveLeaveDialog
        open={approveDialog.open}
        onOpenChange={(open) => !open && setApproveDialog({ open: false, request: null })}
        request={approveDialog.request}
        onApprove={(requestId, newLeaveType) => handleApproval(requestId, true, newLeaveType)}
        processing={!!processing}
      />

      {/* Reject Confirmation Dialog */}
      <AlertDialog 
        open={rejectDialog.open} 
        onOpenChange={(open) => !open && setRejectDialog({ open: false, request: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Leave Request?</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectDialog.request && (
                <>
                  Are you sure you want to reject{" "}
                  <span className="font-medium">{rejectDialog.request.employee.profiles.full_name}'s</span>{" "}
                  {getLeaveTypeLabel(rejectDialog.request.leave_type).toLowerCase()} request for{" "}
                  {rejectDialog.request.days_count} {rejectDialog.request.days_count === 1 ? "day" : "days"} (
                  {format(parseISO(rejectDialog.request.start_date), "MMM d")} -{" "}
                  {format(parseISO(rejectDialog.request.end_date), "MMM d")})?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectDialog.request && handleApproval(rejectDialog.request.id, false)}
              disabled={!!processing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing ? "Processing..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Request Confirmation Dialog */}
      <AlertDialog 
        open={cancelDialog.open} 
        onOpenChange={(open) => !open && setCancelDialog({ open: false, request: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Leave Request?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelDialog.request && (
                <>
                  Are you sure you want to cancel your{" "}
                  {getLeaveTypeLabel(cancelDialog.request.leave_type).toLowerCase()} request for{" "}
                  {cancelDialog.request.days_count} {cancelDialog.request.days_count === 1 ? "day" : "days"} (
                  {format(parseISO(cancelDialog.request.start_date), "MMM d")} -{" "}
                  {format(parseISO(cancelDialog.request.end_date), "MMM d")})?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processing}>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelDialog.request && handleCancelRequest(cancelDialog.request.id)}
              disabled={!!processing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing ? "Cancelling..." : "Cancel Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
