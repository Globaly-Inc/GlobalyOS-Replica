import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Clock, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { format, parseISO } from "date-fns";
import { OrgLink } from "./OrgLink";

interface PendingLeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  isHRBackup?: boolean;
  managerName?: string;
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
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    request: PendingLeaveRequest | null;
    action: "approve" | "reject";
  }>({ open: false, request: null, action: "approve" });
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    request: OwnPendingRequest | null;
  }>({ open: false, request: null });
  const { currentOrg } = useOrganization();
  const { isHR, isAdmin } = useUserRole();
  const isAdminOrHR = isAdmin || isHR;

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
      .select("id, leave_type, start_date, end_date, days_count, reason")
      .eq("employee_id", currentEmployee.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    setOwnPendingRequests(ownRequests || []);

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

    // As manager, get direct reports' pending requests FIRST
    const { data: directReportRequests } = await supabase
      .from("leave_requests")
      .select(`
        id,
        leave_type,
        start_date,
        end_date,
        days_count,
        reason,
        employee:employees!leave_requests_employee_id_fkey(
          id,
          manager_id,
          profiles!inner(
            full_name,
            avatar_url
          )
        )
      `)
      .eq("organization_id", currentOrg.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (directReportRequests) {
      // Filter to only direct reports (where current user is the manager)
      const managerRequests = directReportRequests.filter((req: any) => 
        req.employee?.manager_id === currentEmployee.id
      );
      
      for (const req of managerRequests) {
        requests.push(req as PendingLeaveRequest);
      }
    }

    // If user is Admin or HR, also check for requests where manager is on leave (HR/Admin backup)
    if (isAdminOrHR) {
      const { data: allPending } = await supabase
        .from("leave_requests")
        .select(`
          id,
          leave_type,
          start_date,
          end_date,
          days_count,
          reason,
          employee:employees!leave_requests_employee_id_fkey(
            id,
            manager_id,
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
        
        for (const req of allPending) {
          // Skip if already in manager requests
          if (existingIds.has(req.id)) continue;
          
          const emp = req.employee as any;
          
          // Skip if this is the current user's own request
          if (emp.id === currentEmployee.id) continue;
          
          if (emp.manager_id) {
            // Check if their manager is on leave
            const { data: mgrOnLeave } = await supabase
              .from("leave_requests")
              .select("id")
              .eq("employee_id", emp.manager_id)
              .eq("status", "approved")
              .lte("start_date", today)
              .gte("end_date", today)
              .maybeSingle();

            if (mgrOnLeave) {
              // Fetch manager name
              const { data: managerData } = await supabase
                .from("employees")
                .select("profiles!inner(full_name)")
                .eq("id", emp.manager_id)
                .maybeSingle();
              
              const managerName = (managerData as any)?.profiles?.full_name || "Manager";
              
              const backupReq = {
                ...req,
                isHRBackup: true,
                managerName,
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

  const handleApproval = async (requestId: string, approved: boolean) => {
    setProcessing(requestId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: approved ? "approved" : "rejected",
        reviewed_by: currentEmployee?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      toast.error(getErrorMessage(error, "Failed to update leave request"));
      console.error("Update leave status error:", error);
    } else {
      toast.success(`Leave request ${approved ? "approved" : "rejected"}`);
      
      // Send notification email to employee
      try {
        const reviewerName = (currentEmployee as any)?.profiles?.full_name || "Manager";
        await supabase.functions.invoke("notify-leave-decision", {
          body: {
            request_id: requestId,
            decision: approved ? "approved" : "rejected",
            reviewer_name: reviewerName,
          },
        });
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
        // Don't show error to user - notification is not critical
      }
      
      loadPendingRequests();
      onApprovalChange?.();
    }

    setProcessing(null);
    setConfirmDialog({ open: false, request: null, action: "approve" });
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

  const openConfirmDialog = (request: PendingLeaveRequest, action: "approve" | "reject") => {
    setConfirmDialog({ open: true, request, action });
  };

  const confirmApproval = () => {
    if (confirmDialog.request) {
      handleApproval(confirmDialog.request.id, confirmDialog.action === "approve");
    }
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

  if (loading) {
    return null;
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

          {/* Pending Requests for Approval (Manager/HR) */}
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-lg bg-background p-4 shadow-sm border"
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
                    <span>
                      {format(parseISO(request.start_date), "MMM d")} - {format(parseISO(request.end_date), "MMM d")}
                    </span>
                    <span>({request.days_count} {request.days_count === 1 ? "day" : "days"})</span>
                  </div>
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
                  variant="default"
                  className="flex-1"
                  onClick={() => openConfirmDialog(request, "approve")}
                  disabled={processing === request.id}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => openConfirmDialog(request, "reject")}
                  disabled={processing === request.id}
                >
                  <X className="mr-1 h-3 w-3" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Approval Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, request: null, action: "approve" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "approve" ? "Approve" : "Reject"} Leave Request?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.request && (
                <>
                  Are you sure you want to {confirmDialog.action}{" "}
                  <span className="font-medium">{confirmDialog.request.employee.profiles.full_name}'s</span>{" "}
                  {getLeaveTypeLabel(confirmDialog.request.leave_type).toLowerCase()} request for{" "}
                  {confirmDialog.request.days_count} {confirmDialog.request.days_count === 1 ? "day" : "days"} (
                  {format(parseISO(confirmDialog.request.start_date), "MMM d")} -{" "}
                  {format(parseISO(confirmDialog.request.end_date), "MMM d")})?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApproval}
              disabled={!!processing}
              className={confirmDialog.action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {processing ? "Processing..." : confirmDialog.action === "approve" ? "Approve" : "Reject"}
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
