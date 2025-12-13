import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { OrgLink } from "@/components/OrgLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ArrowLeft, History, TrendingUp, TrendingDown, Calendar, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatDate, formatDateRange } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface LeaveBalanceLog {
  id: string;
  leave_type: string;
  change_amount: number;
  previous_balance: number;
  new_balance: number;
  reason: string | null;
  created_at: string;
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

const LeaveHistory = () => {
  const { id: employeeId } = useParams();
  const [logs, setLogs] = useState<LeaveBalanceLog[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; request: LeaveRequest | null }>({ open: false, request: null });
  const [canceling, setCanceling] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (employeeId) {
      loadData();
      checkIsOwnProfile();
    }
  }, [employeeId]);

  const checkIsOwnProfile = async () => {
    if (!employeeId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: employeeData } = await supabase
      .from("employees")
      .select("user_id")
      .eq("id", employeeId)
      .single();
    
    setIsOwnProfile(employeeData?.user_id === user.id);
  };

  const loadData = async () => {
    if (!employeeId) return;
    setLoading(true);
    
    try {
      // Load employee name
      const { data: empData } = await supabase
        .from("employees")
        .select("profiles!inner(full_name)")
        .eq("id", employeeId)
        .single();
      
      if (empData) {
        setEmployeeName((empData.profiles as any).full_name);
      }

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
      toast.error("Failed to load leave history");
    } finally {
      setLoading(false);
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

  const getLeaveTypeBadgeVariant = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("vacation") || lowerType.includes("annual")) {
      return "default";
    } else if (lowerType.includes("sick") || lowerType.includes("medical")) {
      return "secondary";
    } else {
      return "outline";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <OrgLink to={`/team/${employeeId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </OrgLink>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6" />
            Leave History
          </h1>
          {employeeName && (
            <p className="text-muted-foreground">{employeeName}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="requests" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Leave Requests
              </TabsTrigger>
              <TabsTrigger value="balance" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Balance Changes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No leave requests yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getLeaveTypeBadgeVariant(request.leave_type)}>
                            {request.leave_type}
                          </Badge>
                          {getStatusBadge(request.status)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Requested {formatDateTime(request.created_at)}
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
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded p-3">
                          {request.reason}
                        </p>
                      )}
                      {request.reviewed_at && (
                        <p className="text-sm text-muted-foreground">
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
                          className="w-full text-destructive hover:text-destructive"
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
            </TabsContent>

            <TabsContent value="balance">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No balance changes recorded</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getLeaveTypeBadgeVariant(log.leave_type)}>
                            {log.leave_type}
                          </Badge>
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
                        <span className="text-sm text-muted-foreground">
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
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded p-3">
                          {log.reason}
                        </p>
                      )}
                      {log.created_by_employee?.profiles && (
                        <p className="text-sm text-muted-foreground">
                          Updated by {log.created_by_employee.profiles.full_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
    </div>
  );
};

export default LeaveHistory;
