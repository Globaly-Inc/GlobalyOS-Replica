import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { OrgLink } from "@/components/OrgLink";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { useUserRole } from "@/hooks/useUserRole";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  CalendarIcon, 
  Search,
  Users,
  X
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";

const OrgAttendanceHistory = () => {
  const { currentOrg } = useOrganization();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { orgCode } = useOrgNavigation();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // Fetch all attendance records for the organization
  const { data: records, isLoading } = useQuery({
    queryKey: ["org-attendance", currentOrg?.id, format(monthStart, "yyyy-MM"), statusFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("attendance_records")
        .select(`
          *,
          employee:employees!attendance_records_employee_id_fkey(
            id,
            department,
            position,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq("organization_id", currentOrg!.id)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .order("date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (dateFilter) {
        query = query.eq("date", format(dateFilter, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id && !roleLoading && (isOwner || isAdmin || isHR),
  });

  // Only owner, admin, and HR can access org-wide attendance history - moved after all hooks
  if (!roleLoading && !isOwner && !isAdmin && !isHR) {
    return <Navigate to={`/org/${orgCode}`} replace />;
  }

  const filteredRecords = records?.filter((record) => {
    const employeeName = (record.employee as any)?.profiles?.full_name?.toLowerCase() || "";
    return employeeName.includes(searchQuery.toLowerCase());
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "absent":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "late":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "half_day":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      present: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      late: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      half_day: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    };
    return (
      <Badge className={cn("font-medium", variants[status] || "")}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate stats
  const stats = filteredRecords
    ? {
        total: filteredRecords.length,
        present: filteredRecords.filter((r) => r.status === "present").length,
        absent: filteredRecords.filter((r) => r.status === "absent").length,
        late: filteredRecords.filter((r) => r.status === "late").length,
        totalHours: filteredRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0),
      }
    : null;

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return { label: format(date, "MMMM yyyy"), value: date };
  });

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="px-4 pt-4 md:px-0 md:pt-0">
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 md:h-6 md:w-6" />
            Attendance History
          </h1>
          <p className="text-sm text-muted-foreground">View attendance records across the organization</p>
        </div>

        {/* Unified Filter Bar */}
        <div className="px-4 md:px-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            
            {/* Filters Row */}
            <div className="flex items-center gap-2">
              {/* Month Selector - Fixed Width */}
              <Select 
                value={format(selectedMonth, "yyyy-MM")} 
                onValueChange={(val) => {
                  const [year, month] = val.split("-");
                  setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
                }}
              >
                <SelectTrigger className="w-[130px] sm:w-[160px] h-10">
                  <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={format(month.value, "yyyy-MM")} value={format(month.value, "yyyy-MM")}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Selector - Fixed Width */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[100px] sm:w-[120px] h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Picker with Integrated Clear */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "h-10 px-3 gap-2 min-w-[90px]",
                      dateFilter && "bg-primary/10 border-primary/30"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{dateFilter ? format(dateFilter, "MMM d") : "Date"}</span>
                    {dateFilter && (
                      <X 
                        className="h-3.5 w-3.5 ml-1 opacity-60 hover:opacity-100" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDateFilter(undefined);
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Stats Cards - Horizontal Scroll on Mobile */}
        {stats && (
          <div className="px-4 md:px-0">
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 md:grid md:grid-cols-5 md:gap-3 scrollbar-hide">
              <Card className="flex-shrink-0 w-[100px] md:w-auto p-3 md:p-4 text-center bg-primary/5 border-primary/10">
                <div className="text-lg md:text-2xl font-bold text-primary">{stats.total}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Records</div>
              </Card>
              <Card className="flex-shrink-0 w-[100px] md:w-auto p-3 md:p-4 text-center bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/50">
                <div className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">{stats.present}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Present</div>
              </Card>
              <Card className="flex-shrink-0 w-[100px] md:w-auto p-3 md:p-4 text-center bg-yellow-50 dark:bg-yellow-950/30 border-yellow-100 dark:border-yellow-900/50">
                <div className="text-lg md:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.late}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Late</div>
              </Card>
              <Card className="flex-shrink-0 w-[100px] md:w-auto p-3 md:p-4 text-center bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50">
                <div className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Absent</div>
              </Card>
              <Card className="flex-shrink-0 w-[100px] md:w-auto p-3 md:p-4 text-center bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50">
                <div className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalHours.toFixed(1)}h</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Hours</div>
              </Card>
            </div>
          </div>
        )}

        {/* Records List */}
        <div className="px-4 md:px-0">
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <h2 className="font-semibold text-sm">Attendance Records</h2>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No attendance records found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredRecords.map((record) => {
                  const employee = record.employee as any;
                  return (
                    <div
                      key={record.id}
                      className="p-3 md:p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <OrgLink 
                          to={`/team/${employee?.id}`}
                          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                        >
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={employee?.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(employee?.profiles?.full_name || "?")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5">
                              {getStatusIcon(record.status)}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{employee?.profiles?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(record.date), "EEE, MMM d, yyyy")}
                            </p>
                          </div>
                        </OrgLink>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(record.status)}
                          {record.work_hours && (
                            <span className="text-xs text-muted-foreground">
                              {record.work_hours.toFixed(1)}h
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Check-in/out times */}
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="text-green-500">In:</span>
                          {record.check_in_time ? format(new Date(record.check_in_time), "h:mm a") : "-"}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-red-500">Out:</span>
                          {record.check_out_time ? format(new Date(record.check_out_time), "h:mm a") : "-"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrgAttendanceHistory;
