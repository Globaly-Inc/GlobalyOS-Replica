import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

interface LeaveManagementProps {
  employeeId: string;
}

export const LeaveManagement = ({ employeeId }: LeaveManagementProps) => {
  const queryClient = useQueryClient();
  const { isHR } = useUserRole();
  const currentYear = new Date().getFullYear();

  const { data: balance } = useQuery({
    queryKey: ["leave-balance", employeeId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("year", currentYear)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const { data: requests } = useQuery({
    queryKey: ["leave-requests", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          reviewed_by_employee:employees!leave_requests_reviewed_by_fkey(
            user_id,
            profiles:profiles(full_name)
          )
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: "approved" | "rejected" }) => {
      const { data: currentUser } = await supabase.auth.getUser();
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", currentUser.user?.id)
        .single();

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          reviewed_by: employee?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Request updated successfully");
    },
    onError: () => {
      toast.error("Failed to update request");
    },
  });

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

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case "vacation":
        return "Vacation";
      case "sick":
        return "Sick Leave";
      case "pto":
        return "PTO";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Leave Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Balances ({currentYear})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-primary/5">
              <div className="text-3xl font-bold text-primary">
                {balance?.vacation_days || 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Vacation Days</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-primary/5">
              <div className="text-3xl font-bold text-primary">
                {balance?.sick_days || 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Sick Days</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-primary/5">
              <div className="text-3xl font-bold text-primary">
                {balance?.pto_days || 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">PTO Days</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!requests || requests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No leave requests yet</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{getLeaveTypeLabel(request.leave_type)}</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(request.start_date), "MMM d, yyyy")} -{" "}
                          {format(new Date(request.end_date), "MMM d, yyyy")}
                          <span className="ml-2">({request.days_count} days)</span>
                        </div>
                      </div>
                      {request.reason && (
                        <p className="text-sm text-muted-foreground">{request.reason}</p>
                      )}
                      {request.reviewed_at && (
                        <p className="text-xs text-muted-foreground">
                          Reviewed on {format(new Date(request.reviewed_at), "MMM d, yyyy")}
                          {request.reviewed_by_employee?.profiles && 
                            ` by ${request.reviewed_by_employee.profiles.full_name}`
                          }
                        </p>
                      )}
                    </div>
                    {isHR && request.status === "pending" && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate({ requestId: request.id, status: "approved" })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate({ requestId: request.id, status: "rejected" })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
