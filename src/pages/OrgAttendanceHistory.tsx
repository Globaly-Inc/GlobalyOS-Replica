import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OrgLink } from "@/components/OrgLink";
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
  Users
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";

const OrgAttendanceHistory = () => {
  const { currentOrg } = useOrganization();
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
    enabled: !!currentOrg?.id,
  });

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
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            Attendance History
          </h1>
          <p className="text-muted-foreground">View attendance records across the organization</p>
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
          
          <Select 
            value={format(selectedMonth, "yyyy-MM")} 
            onValueChange={(val) => {
              const [year, month] = val.split("-");
              setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <CalendarIcon className="h-4 w-4 mr-2" />
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="half_day">Half Day</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={dateFilter ? "bg-primary/10" : ""}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateFilter ? format(dateFilter, "MMM d") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {dateFilter && (
            <Button variant="ghost" onClick={() => setDateFilter(undefined)}>
              Clear
            </Button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-4 text-center bg-primary/5 border-primary/10">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Records</div>
            </Card>
            <Card className="p-4 text-center bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/50">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.present}</div>
              <div className="text-xs text-muted-foreground mt-1">Present</div>
            </Card>
            <Card className="p-4 text-center bg-yellow-50 dark:bg-yellow-950/30 border-yellow-100 dark:border-yellow-900/50">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.late}</div>
              <div className="text-xs text-muted-foreground mt-1">Late</div>
            </Card>
            <Card className="p-4 text-center bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</div>
              <div className="text-xs text-muted-foreground mt-1">Absent</div>
            </Card>
            <Card className="p-4 text-center bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalHours.toFixed(1)}h</div>
              <div className="text-xs text-muted-foreground mt-1">Total Hours</div>
            </Card>
          </div>
        )}

        {/* Records */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b bg-card">
            <h2 className="font-semibold">Attendance Records</h2>
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
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(record.status)}
                      <OrgLink 
                        to={`/team/${employee?.id}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={employee?.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(employee?.profiles?.full_name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee?.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(record.date), "EEE, MMM d, yyyy")}
                          </p>
                        </div>
                      </OrgLink>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm text-muted-foreground hidden sm:block">
                        <div>In: {record.check_in_time ? format(new Date(record.check_in_time), "h:mm a") : "-"}</div>
                        <div>Out: {record.check_out_time ? format(new Date(record.check_out_time), "h:mm a") : "-"}</div>
                      </div>
                      {record.work_hours && (
                        <Badge variant="outline" className="hidden md:inline-flex">
                          {record.work_hours.toFixed(1)}h
                        </Badge>
                      )}
                      {getStatusBadge(record.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default OrgAttendanceHistory;
