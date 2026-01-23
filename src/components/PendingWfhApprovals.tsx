import { useState } from "react";
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
import { Home, Check, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { OrgLink } from "./OrgLink";
import {
  usePendingWfhRequests,
  useOwnPendingWfhRequests,
  useUpdateWfhRequest,
  useCancelWfhRequest,
} from "@/services/useWfh";
import { useWfhRealtime } from "@/services/useWfhRealtime";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useUserRole } from "@/hooks/useUserRole";
import { WfhRequest, WfhRequestWithEmployee } from "@/types/wfh";

interface PendingWfhApprovalsProps {
  onApprovalChange?: () => void;
}

export const PendingWfhApprovals = ({ onApprovalChange }: PendingWfhApprovalsProps) => {
  // Enable realtime updates for WFH requests
  useWfhRealtime();
  
  const { data: currentEmployee } = useCurrentEmployee();
  const { isHR, isAdmin, isOwner } = useUserRole();
  const isAdminOrHR = isAdmin || isHR || isOwner;

  const { data: allPendingRequests = [], isLoading } = usePendingWfhRequests();
  const { data: ownPendingRequests = [] } = useOwnPendingWfhRequests();

  const updateMutation = useUpdateWfhRequest();
  const cancelMutation = useCancelWfhRequest();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    request: WfhRequestWithEmployee | null;
    action: "approve" | "reject";
  }>({ open: false, request: null, action: "approve" });

  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    request: WfhRequest | null;
  }>({ open: false, request: null });

  // Filter requests that current user can approve (direct reports or HR/Admin)
  const pendingRequests = allPendingRequests.filter((req) => {
    if (!currentEmployee) return false;
    // Direct reports
    if (req.employee.manager_id === currentEmployee.id) return true;
    // HR/Admin can approve all
    if (isAdminOrHR) return true;
    return false;
  });

  const handleApproval = async (requestId: string, approve: boolean) => {
    await updateMutation.mutateAsync({
      requestId,
      status: approve ? "approved" : "rejected",
    });
    setConfirmDialog({ open: false, request: null, action: "approve" });
    onApprovalChange?.();
  };

  const handleCancel = async (requestId: string) => {
    await cancelMutation.mutateAsync(requestId);
    setCancelDialog({ open: false, request: null });
    onApprovalChange?.();
  };

  if (isLoading) return null;
  if (pendingRequests.length === 0 && ownPendingRequests.length === 0) return null;

  return (
    <>
      <Card className="p-6 border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Home className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Pending WFH Requests
        </h3>

        <div className="space-y-4">
          {/* Own pending requests */}
          {ownPendingRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-lg bg-background p-4 shadow-sm border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30">
                      Work From Home
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Your Request
                    </Badge>
                    <span className="text-muted-foreground">
                      {format(parseISO(request.start_date), "MMM d")} -{" "}
                      {format(parseISO(request.end_date), "MMM d")}
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
                  disabled={cancelMutation.isPending}
                >
                  <X className="mr-1 h-3 w-3" />
                  Cancel Request
                </Button>
              </div>
            </div>
          ))}

          {/* Requests to approve */}
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              className="rounded-lg bg-background p-4 shadow-sm border"
            >
              <div className="flex items-start gap-3">
                <OrgLink to={`/team/${request.employee.id}`}>
                  <Avatar className="h-10 w-10 cursor-pointer">
                    <AvatarImage src={request.employee.profiles.avatar_url || undefined} />
                    <AvatarFallback>
                      {request.employee.profiles.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </OrgLink>
                <div className="flex-1 min-w-0">
                  <OrgLink
                    to={`/team/${request.employee.id}`}
                    className="font-medium hover:underline"
                  >
                    {request.employee.profiles.full_name}
                  </OrgLink>
                  <div className="flex flex-wrap items-center gap-2 text-sm mt-1">
                    <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30">
                      Work From Home
                    </Badge>
                    <span className="text-muted-foreground">
                      {format(parseISO(request.start_date), "MMM d")} -{" "}
                      {format(parseISO(request.end_date), "MMM d")}
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
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() =>
                    setConfirmDialog({ open: true, request, action: "approve" })
                  }
                  disabled={updateMutation.isPending}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() =>
                    setConfirmDialog({ open: true, request, action: "reject" })
                  }
                  disabled={updateMutation.isPending}
                >
                  <X className="mr-1 h-3 w-3" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Confirm Dialog for Approve/Reject */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ ...confirmDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "approve" ? "Approve" : "Reject"} WFH Request?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "approve"
                ? `Approve ${confirmDialog.request?.employee.profiles.full_name}'s request to work from home?`
                : `Reject ${confirmDialog.request?.employee.profiles.full_name}'s request to work from home?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDialog.request &&
                handleApproval(
                  confirmDialog.request.id,
                  confirmDialog.action === "approve"
                )
              }
              className={
                confirmDialog.action === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {confirmDialog.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog
        open={cancelDialog.open}
        onOpenChange={(open) => setCancelDialog({ ...cancelDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel WFH Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this work from home request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                cancelDialog.request && handleCancel(cancelDialog.request.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
