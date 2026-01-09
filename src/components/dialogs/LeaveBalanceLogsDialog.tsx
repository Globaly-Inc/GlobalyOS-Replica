import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  X, 
  ArrowDownCircle, 
  ArrowUpCircle,
  CalendarPlus,
  Edit,
  Trash2,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatDate, formatDateRange } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useLeaveBalanceRealtime } from "@/services/useLeaveRealtime";

interface LeaveBalanceLog {
  id: string;
  leave_type: string;
  change_amount: number;
  previous_balance: number;
  new_balance: number;
  reason: string | null;
  created_at: string;
  action?: string;
  created_by_employee: {
    profiles: {
      full_name: string;
    };
  } | null;
}

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  half_day_type: string;
  reason: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_employee: {
    profiles: {
      full_name: string;
    };
  } | null;
}

interface LeaveBalanceLogsDialogProps {
  employeeId: string;
  isOwnProfile?: boolean;
}

// Action badge component
const ActionBadge = ({ action }: { action?: string }) => {
  switch (action) {
    case "year_allocation":
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-950">
          <CalendarPlus className="h-3 w-3 mr-1" />
          Year Allocation
        </Badge>
      );
    case "carry_forward_in":
      return (
        <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-950">
          <ArrowDownCircle className="h-3 w-3 mr-1" />
          Carry Forward In
        </Badge>
      );
    case "carry_forward_out":
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-600 bg-orange-50 dark:bg-orange-950">
          <ArrowUpCircle className="h-3 w-3 mr-1" />
          Carry Forward Out
        </Badge>
      );
    case "manual_adjustment":
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-600 bg-amber-50 dark:bg-amber-950">
          <Edit className="h-3 w-3 mr-1" />
          Manual Adjust
        </Badge>
      );
    case "leave_deduct":
      return (
        <Badge variant="outline" className="text-red-600 border-red-600 bg-red-50 dark:bg-red-950">
          <TrendingDown className="h-3 w-3 mr-1" />
          Leave Taken
        </Badge>
      );
    case "leave_approved":
      return (
        <Badge variant="outline" className="text-red-600 border-red-600 bg-red-50 dark:bg-red-950">
          <TrendingDown className="h-3 w-3 mr-1" />
          Leave Approved
        </Badge>
      );
    case "leave_refund":
      return (
        <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-950">
          <ArrowUpCircle className="h-3 w-3 mr-1" />
          Leave Refund
        </Badge>
      );
    case "leave_modify":
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-950">
          <RefreshCw className="h-3 w-3 mr-1" />
          Leave Modified
        </Badge>
      );
    case "leave_type_change_refund":
      return (
        <Badge variant="outline" className="text-cyan-600 border-cyan-600 bg-cyan-50 dark:bg-cyan-950">
          <ArrowUpCircle className="h-3 w-3 mr-1" />
          Type Changed (Refund)
        </Badge>
      );
    case "leave_type_change_deduct":
      return (
        <Badge variant="outline" className="text-purple-600 border-purple-600 bg-purple-50 dark:bg-purple-950">
          <ArrowDownCircle className="h-3 w-3 mr-1" />
          Type Changed (Deduct)
        </Badge>
      );
    case "leave_delete_refund":
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-600 bg-orange-50 dark:bg-orange-950">
          <Trash2 className="h-3 w-3 mr-1" />
          Delete Refund
        </Badge>
      );
    case "balance_deleted":
      return (
        <Badge variant="outline" className="text-red-600 border-red-600 bg-red-50 dark:bg-red-950">
          <Trash2 className="h-3 w-3 mr-1" />
          Balance Deleted
        </Badge>
      );
    case "year_init":
      return (
        <Badge variant="outline" className="text-muted-foreground border-muted bg-muted/50">
          <Clock className="h-3 w-3 mr-1" />
          Legacy Init
        </Badge>
      );
    default:
      return null;
  }
};

export const LeaveBalanceLogsDialog = ({
  employeeId,
  isOwnProfile = false,
}: LeaveBalanceLogsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LeaveBalanceLog[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; request: LeaveRequest | null }>({ open: false, request: null });
  const [canceling, setCanceling] = useState(false);
  const queryClient = useQueryClient();

  // Subscribe to real-time balance updates
  useLeaveBalanceRealtime(employeeId);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load balance logs
      const { data: logsData, error: logsError } = await supabase
        .from("leave_balance_logs")
        .select(`
          id,
          leave_type,
          change_amount,
          previous_balance,
          new_balance,
          reason,
          created_at,
          action,
          created_by_employee:employees!leave_balance_logs_created_by_fkey(
            profiles!inner(full_name)
          )
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (logsError) throw logsError;
      setLogs((logsData as any) || []);

      // Load leave requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("leave_requests")
        .select(`
          id,
          leave_type,
          start_date,
          end_date,
          days_count,
          half_day_type,
          reason,
          status,
          created_at,
          reviewed_at,
          reviewed_by_employee:employees!leave_requests_reviewed_by_fkey(
            profiles!inner(full_name)
          )
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;
      setRequests((requestsData as any) || []);
    } catch (error) {
      console.error("Error loading leave data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      loadData();
    }
  };

  const handleCancelRequest = async () => {
    if (!cancelDialog.request) return;
    setCanceling(true);

    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", cancelDialog.request.id);

    if (error) {
      toast.error("Failed to cancel leave request");
      console.error("Cancel error:", error);
    } else {
      toast.success("Leave request cancelled");
      loadData();
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["employee-leave-requests"] });
    }

    setCanceling(false);
    setCancelDialog({ open: false, request: null });
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vacation: "Vacation",
      sick: "Sick Leave",
      pto: "PTO",
    };
    return labels[type] || type;
  };

  const getLeaveTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "vacation":
        return "default";
      case "sick":
        return "secondary";
      case "pto":
        return "outline";
      default:
        return "default";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <History className="h-4 w-4 mr-1" />
          Leave Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Leave History
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Leave Requests
            </TabsTrigger>
            <TabsTrigger value="balance" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Balance Changes
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="requests">
            <ScrollArea className="h-[400px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No leave requests yet</p>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getLeaveTypeBadgeVariant(request.leave_type)}>
                            {getLeaveTypeLabel(request.leave_type)}
                          </Badge>
                          {getStatusBadge(request.status)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(request.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDateRange(request.start_date, request.end_date)}
                        <span className="ml-2">
                          ({request.days_count} {request.days_count === 1 ? 'day' : 'days'})
                          {request.half_day_type !== 'full' && (
                            <span className="text-primary ml-1">
                              • {request.half_day_type === 'first_half' ? '1st Half' : '2nd Half'}
                            </span>
                          )}
                        </span>
                      </div>
                      {request.reason && (
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                          {request.reason}
                        </p>
                      )}
                      {request.reviewed_at && (
                        <p className="text-xs text-muted-foreground">
                          Reviewed on {formatDateTime(request.reviewed_at)}
                          {request.reviewed_by_employee?.profiles &&
                            ` by ${request.reviewed_by_employee.profiles.full_name}`
                          }
                        </p>
                      )}
                      {isOwnProfile && request.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 text-destructive hover:text-destructive"
                          onClick={() => setCancelDialog({ open: true, request })}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel Request
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="balance">
            <ScrollArea className="h-[400px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">No balance changes recorded</p>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getLeaveTypeBadgeVariant(log.leave_type)}>
                            {getLeaveTypeLabel(log.leave_type)}
                          </Badge>
                          <ActionBadge action={log.action} />
                          {log.change_amount > 0 ? (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-600"
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              +{log.change_amount}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-red-600 border-red-600"
                            >
                              <TrendingDown className="h-3 w-3 mr-1" />
                              {log.change_amount}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Balance:</span>
                        <span className="text-muted-foreground line-through">
                          {log.previous_balance}
                        </span>
                        <span className="text-foreground">→</span>
                        <span className="font-medium">{log.new_balance}</span>
                      </div>
                      {log.reason && (
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                          {log.reason}
                        </p>
                      )}
                      {log.created_by_employee?.profiles && (
                        <p className="text-xs text-muted-foreground">
                          Updated by {log.created_by_employee.profiles.full_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Cancel Confirmation Dialog */}
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
                  Are you sure you want to cancel your {cancelDialog.request.leave_type} request for{" "}
                  {cancelDialog.request.days_count} {cancelDialog.request.days_count === 1 ? "day" : "days"} (
                  {formatDateRange(cancelDialog.request.start_date, cancelDialog.request.end_date)}
                  )? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRequest}
              disabled={canceling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {canceling ? "Cancelling..." : "Cancel Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
