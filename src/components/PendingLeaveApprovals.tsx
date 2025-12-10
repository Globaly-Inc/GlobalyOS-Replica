import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";

interface PendingLeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

interface PendingLeaveApprovalsProps {
  onApprovalChange?: () => void;
}

export const PendingLeaveApprovals = ({ onApprovalChange }: PendingLeaveApprovalsProps) => {
  const [pendingRequests, setPendingRequests] = useState<PendingLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isManagerOnLeave, setIsManagerOnLeave] = useState(false);
  const [showAsHR, setShowAsHR] = useState(false);
  const { currentOrg } = useOrganization();
  const { isHR } = useUserRole();

  useEffect(() => {
    if (currentOrg) {
      loadPendingRequests();
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

    // If manager is on leave and user is not HR, don't show anything
    if (managerLeave && !isHR) {
      setPendingRequests([]);
      setLoading(false);
      return;
    }

    // Get pending requests - either as manager or HR
    let requests: PendingLeaveRequest[] = [];

    if (isHR) {
      // HR sees requests where the manager is on leave OR all pending if they're HR
      // First, get all pending requests
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
        // Filter to show requests where manager is on leave
        for (const req of allPending) {
          const emp = req.employee as any;
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
              requests.push(req as PendingLeaveRequest);
            }
          } else {
            // No manager assigned - HR should handle
            requests.push(req as PendingLeaveRequest);
          }
        }
        setShowAsHR(requests.length > 0);
      }
    }

    // As manager, get direct reports' pending requests
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
      // Filter to only direct reports
      const managerRequests = directReportRequests.filter((req: any) => 
        req.employee.manager_id === currentEmployee.id
      );
      
      // Combine with HR requests (avoid duplicates)
      const existingIds = new Set(requests.map(r => r.id));
      for (const req of managerRequests) {
        if (!existingIds.has(req.id)) {
          requests.push(req as PendingLeaveRequest);
        }
      }
    }

    setPendingRequests(requests);
    setLoading(false);
  };

  const handleApproval = async (requestId: string, approved: boolean) => {
    setProcessing(requestId);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: currentEmployee } = await supabase
      .from("employees")
      .select("id")
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
      toast.error("Failed to update leave request");
    } else {
      toast.success(`Leave request ${approved ? "approved" : "rejected"}`);
      loadPendingRequests();
      onApprovalChange?.();
    }

    setProcessing(null);
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

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 border-amber-200 bg-amber-50/50">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Clock className="h-5 w-5 text-amber-600" />
        Pending Leave Requests
        {showAsHR && (
          <Badge variant="secondary" className="ml-2 text-xs">
            Manager Unavailable
          </Badge>
        )}
      </h3>
      <div className="space-y-4">
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="rounded-lg bg-background p-4 shadow-sm border"
          >
            <div className="flex items-start gap-3">
              <Link to={`/team/${request.employee.id}`}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.employee.profiles.avatar_url || undefined} />
                  <AvatarFallback>
                    {request.employee.profiles.full_name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link 
                  to={`/team/${request.employee.id}`}
                  className="text-sm font-medium text-foreground hover:underline"
                >
                  {request.employee.profiles.full_name}
                </Link>
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
                onClick={() => handleApproval(request.id, true)}
                disabled={processing === request.id}
              >
                <Check className="mr-1 h-3 w-3" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => handleApproval(request.id, false)}
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
  );
};
