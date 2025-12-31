import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AddLeaveRequestDialog } from "@/components/dialogs/AddLeaveRequestDialog";
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  XCircle,
  Hourglass,
  Calendar
} from "lucide-react";
import { formatDateRange, formatDateTime } from "@/lib/utils";
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
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface LeaveTypeBalance {
  id: string;
  balance: number;
  leave_type: {
    id: string;
    name: string;
    category: string;
  };
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
}

interface HourBalance {
  overtime_minutes: number;
  undertime_minutes: number;
}

const Leave = () => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; request: LeaveRequest | null }>({ open: false, request: null });
  const [canceling, setCanceling] = useState(false);
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  // Fetch employee ID
  const { data: employee } = useQuery({
    queryKey: ["current-employee", user?.id, currentOrg?.id],
    queryFn: async () => {
      if (!user?.id || !currentOrg?.id) return null;
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user?.id && !!currentOrg?.id,
  });

  // Fetch leave balances
  const { data: balances = [], isLoading: balancesLoading } = useQuery({
    queryKey: ["leave-type-balances", employee?.id, currentYear],
    queryFn: async () => {
      if (!employee?.id) return [];
      const { data, error } = await supabase
        .from("leave_type_balances")
        .select(`
          id,
          balance,
          leave_type:leave_types!inner(
            id,
            name,
            category
          )
        `)
        .eq("employee_id", employee.id)
        .eq("year", currentYear);

      if (error) throw error;
      return (data || []) as LeaveTypeBalance[];
    },
    staleTime: 30 * 1000, // 30 seconds - may change after approvals
    enabled: !!employee?.id,
  });

  // Fetch hour balance
  const { data: hourBalance } = useQuery({
    queryKey: ["attendance-hour-balance", employee?.id, currentYear],
    queryFn: async () => {
      if (!employee?.id) return null;
      const { data, error } = await supabase
        .from("attendance_hour_balances")
        .select("overtime_minutes, undertime_minutes")
        .eq("employee_id", employee.id)
        .eq("year", currentYear)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as HourBalance | null;
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: !!employee?.id,
  });

  // Fetch leave requests
  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["employee-leave-requests", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return [];
      const { data, error } = await supabase
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
          created_at
        `)
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as LeaveRequest[];
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!employee?.id,
  });

  const handleCancelRequest = async () => {
    if (!cancelDialog.request) return;
    setCanceling(true);

    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", cancelDialog.request.id);

    if (error) {
      toast.error("Failed to cancel leave request");
    } else {
      toast.success("Leave request cancelled");
      queryClient.invalidateQueries({ queryKey: ["employee-leave-requests"] });
    }

    setCanceling(false);
    setCancelDialog({ open: false, request: null });
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const balancesWithValue = balances
    .filter((item) => item.balance > 0)
    .sort((a, b) => {
      if (a.leave_type.category === 'paid' && b.leave_type.category !== 'paid') return -1;
      if (a.leave_type.category !== 'paid' && b.leave_type.category === 'paid') return 1;
      return a.leave_type.name.localeCompare(b.leave_type.name);
    });

  const hasHourBalance = hourBalance && (hourBalance.overtime_minutes > 0 || hourBalance.undertime_minutes > 0);

  const pendingRequests = requests.filter(r => r.status === "pending");
  const pastRequests = requests.filter(r => r.status !== "pending");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Hourglass className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="bg-destructive/10">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pt-4 md:pt-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Leave" />
        <Button onClick={() => setRequestDialogOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Request
        </Button>
      </div>

      {/* Leave Balances */}
      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-sm">Leave Balance</h3>
          </div>
          
          {balancesLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : balancesWithValue.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {balancesWithValue.map((item) => (
                <div key={item.id} className="text-center p-3 rounded-lg bg-primary/5">
                  <div className="text-2xl font-bold text-primary">
                    {item.balance}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 truncate">
                    {item.leave_type.name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No leave balance available
            </p>
          )}

          {hasHourBalance && (
            <div className="border-t mt-4 pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Clock className="h-3.5 w-3.5" />
                <span>Accumulated Hours</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {hourBalance.overtime_minutes > 0 && (
                  <Badge variant="outline" className="gap-1 py-1 px-2 bg-green-500/10 text-green-700 border-green-200 text-xs">
                    <TrendingUp className="h-3 w-3" />
                    +{formatMinutes(hourBalance.overtime_minutes)}
                  </Badge>
                )}
                {hourBalance.undertime_minutes > 0 && (
                  <Badge variant="outline" className="gap-1 py-1 px-2 bg-amber-500/10 text-amber-700 border-amber-200 text-xs">
                    <TrendingDown className="h-3 w-3" />
                    -{formatMinutes(hourBalance.undertime_minutes)}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="pending" className="text-xs gap-1.5">
            <Hourglass className="h-3.5 w-3.5" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {requestsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Hourglass className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No pending requests</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <span className="font-medium text-sm">{request.leave_type}</span>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDateRange(request.start_date, request.end_date)}
                    <span className="text-primary font-medium">
                      ({request.days_count} {request.days_count === 1 ? 'day' : 'days'})
                    </span>
                  </div>
                  {request.reason && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 line-clamp-2">
                      {request.reason}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive text-xs h-8"
                    onClick={() => setCancelDialog({ open: true, request })}
                  >
                    Cancel Request
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {requestsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : pastRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Clock className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No leave history</p>
              </CardContent>
            </Card>
          ) : (
            pastRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <span className="font-medium text-sm">{request.leave_type}</span>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDateRange(request.start_date, request.end_date)}
                    <span>({request.days_count}d)</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Request Leave Dialog */}
      {employee?.id && (
        <AddLeaveRequestDialog
          employeeId={employee.id}
          open={requestDialogOpen}
          onOpenChange={setRequestDialogOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["employee-leave-requests"] });
            queryClient.invalidateQueries({ queryKey: ["leave-type-balances"] });
          }}
        />
      )}

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
                  Cancel your {cancelDialog.request.leave_type} request for{" "}
                  {cancelDialog.request.days_count} {cancelDialog.request.days_count === 1 ? "day" : "days"}?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>Keep</AlertDialogCancel>
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

export default Leave;