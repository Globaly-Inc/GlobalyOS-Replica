import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Clock, Calendar, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatDateRange } from "@/lib/utils";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

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
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  reviewed_by_employee: {
    profiles: {
      full_name: string;
    };
  } | null;
}

const OrgLeaveHistory = () => {
  const { currentOrg } = useOrganization();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("all");
  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);

  useEffect(() => {
    if (currentOrg?.id) {
      loadData();
    }
  }, [currentOrg?.id]);

  const loadData = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);
    
    try {
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
          employee:employees!leave_requests_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          ),
          reviewed_by_employee:employees!leave_requests_reviewed_by_fkey(
            profiles!inner(full_name)
          )
        `)
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;
      setRequests((requestsData as any) || []);
      
      // Extract unique leave types
      const types = [...new Set((requestsData || []).map((r: any) => r.leave_type))];
      setLeaveTypes(types as string[]);
    } catch (error) {
      console.error("Error loading leave data:", error);
      toast.error("Failed to load leave history");
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = request.employee?.profiles?.full_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesType = leaveTypeFilter === "all" || request.leave_type === leaveTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;
  const rejectedCount = requests.filter(r => r.status === "rejected").length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6" />
            Leave History
          </h1>
          <p className="text-muted-foreground">View all leave requests across the organization</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
              <SelectItem value="approved">Approved ({approvedCount})</SelectItem>
              <SelectItem value="rejected">Rejected ({rejectedCount})</SelectItem>
            </SelectContent>
          </Select>
          <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Leave Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {leaveTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No leave requests found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link 
                        to={`/team/${request.employee?.id}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={request.employee?.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(request.employee?.profiles?.full_name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {request.employee?.profiles?.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Requested {formatDateTime(request.created_at)}
                          </p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge variant={getLeaveTypeBadgeVariant(request.leave_type)}>
                          {request.leave_type}
                        </Badge>
                        {getStatusBadge(request.status)}
                      </div>
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default OrgLeaveHistory;
