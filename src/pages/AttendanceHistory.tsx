import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  CalendarIcon, 
  Plus,
  Pencil,
  Download,
  Filter
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from "date-fns";
import { useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { EditAttendanceDialog } from "@/components/dialogs/EditAttendanceDialog";
import { cn } from "@/lib/utils";
import { useTimezone } from "@/hooks/useTimezone";
import { formatTimeInTimezone } from "@/utils/timezone";

const AttendanceHistory = () => {
  const { id } = useParams<{ id: string }>();
  const { navigateOrg } = useOrgNavigation();
  const { isAdmin, isHR } = useUserRole();
  const { timezone } = useTimezone();
  const canEditAttendance = isAdmin || isHR;
  
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // Helper function to check if check-in is late
  const isLateArrival = (record: any) => {
    if (!record.check_in_time || !schedule) return false;
    if (!schedule.work_start_time || schedule.late_threshold_minutes === null || schedule.late_threshold_minutes === undefined) return false;
    
    // Get check-in time in user's timezone
    const checkInTimeLocal = formatTimeInTimezone(record.check_in_time, timezone, 'HH:mm:ss');
    const [checkInH, checkInM] = checkInTimeLocal.split(':').map(Number);
    const [startHours, startMinutes] = schedule.work_start_time.split(':').map(Number);
    
    const checkInTotalMinutes = checkInH * 60 + checkInM;
    const thresholdTotalMinutes = startHours * 60 + startMinutes + (schedule.late_threshold_minutes || 0);
    
    return checkInTotalMinutes > thresholdTotalMinutes;
  };

  // Helper function to check if check-out is early
  const isEarlyDeparture = (record: any) => {
    if (!record.check_out_time || !schedule) return false;
    if (!schedule.work_end_time) return false;
    
    // Get check-out time in user's timezone
    const checkOutTimeLocal = formatTimeInTimezone(record.check_out_time, timezone, 'HH:mm:ss');
    const [checkOutH, checkOutM] = checkOutTimeLocal.split(':').map(Number);
    const [endHours, endMinutes] = schedule.work_end_time.split(':').map(Number);
    
    const checkOutTotalMinutes = checkOutH * 60 + checkOutM;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    return checkOutTotalMinutes < endTotalMinutes;
  };

  // Fetch employee info
  const { data: employee } = useQuery({
    queryKey: ["employee-info", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          id,
          organization_id,
          user_id,
          position,
          department
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch profile info
  const { data: profile } = useQuery({
    queryKey: ["employee-profile", employee?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", employee!.user_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!employee?.user_id,
  });

  // Fetch attendance records
  const { data: records, isLoading } = useQuery({
    queryKey: ["attendance-history", id, format(monthStart, "yyyy-MM"), statusFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", id!)
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
    enabled: !!id,
  });

  // Fetch schedule
  const { data: schedule } = useQuery({
    queryKey: ["employee-schedule", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_schedules")
        .select("*")
        .eq("employee_id", id!)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!id,
  });

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

  // Calculate monthly stats
  const stats = records
    ? {
        total: records.length,
        present: records.filter((r) => r.status === "present").length,
        absent: records.filter((r) => r.status === "absent").length,
        late: records.filter((r) => r.status === "late").length,
        totalHours: records.reduce((sum, r) => sum + (r.work_hours || 0), 0),
        avgHours: records.filter((r) => r.work_hours).length > 0
          ? records.reduce((sum, r) => sum + (r.work_hours || 0), 0) / records.filter((r) => r.work_hours).length
          : 0,
      }
    : null;

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return { label: format(date, "MMMM yyyy"), value: date };
  });

  return (
    <div className="space-y-4 md:space-y-6 pt-4 md:pt-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigateOrg(`/team/${id}`)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback>{profile?.full_name?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{profile?.full_name || "Employee"}</h1>
            <p className="text-sm text-muted-foreground">Attendance History</p>
          </div>
        </div>
      </div>

      {/* Filters - Light Purple Background */}
      <div className="sticky top-0 z-10 bg-purple-50/80 dark:bg-purple-950/20 backdrop-blur-sm pb-2 -mt-2 pt-2 rounded-lg">
        <div className="flex flex-wrap items-center gap-3 bg-slate-300 dark:bg-slate-700 px-[5px] py-[5px] rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <Select 
            value={format(selectedMonth, "yyyy-MM")} 
            onValueChange={(val) => {
              const [year, month] = val.split("-");
              setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
            }}
          >
            <SelectTrigger className="w-[160px]">
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
            <SelectTrigger className="w-[140px]">
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
              <Button variant="outline" size="sm" className={dateFilter ? "bg-primary/10" : ""}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateFilter ? format(dateFilter, "MMM d") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {dateFilter && (
            <Button variant="ghost" size="sm" onClick={() => setDateFilter(undefined)}>
              Clear date
            </Button>
          )}

          <div className="flex-1" />

          {canEditAttendance && (
            <Button
              size="sm"
              onClick={() => {
                setEditingRecord(null);
                setShowAttendanceDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Record
            </Button>
          )}
        </div>
      </div>

      {/* Monthly Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-4 text-center bg-primary/5 border-primary/10">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Days</div>
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

      {/* Attendance Records Table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b bg-card">
          <h2 className="font-semibold">Attendance Records</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : !records || records.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No attendance records found for this period
          </div>
        ) : (
          <div className="divide-y">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(record.status)}
                  <div>
                    <p className="font-medium">{format(parseISO(record.date), "EEEE, MMMM d, yyyy")}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex flex-col gap-0.5">
                        <span>
                          In: {record.check_in_time 
                            ? formatTimeInTimezone(record.check_in_time, timezone, "h:mm a")
                            : "-"}
                        </span>
                        {isLateArrival(record) && (
                          <Badge className="w-fit text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            Late Arrival
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span>
                          Out: {record.check_out_time 
                            ? formatTimeInTimezone(record.check_out_time, timezone, "h:mm a")
                            : "-"}
                        </span>
                        {isEarlyDeparture(record) && (
                          <Badge className="w-fit text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            Early Departure
                          </Badge>
                        )}
                      </div>
                      {record.work_hours && (
                        <span className="font-medium text-foreground">
                          {record.work_hours.toFixed(1)} hours
                        </span>
                      )}
                    </div>
                    {record.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Note: {record.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(record.status)}
                  {canEditAttendance && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setEditingRecord(record);
                        setShowAttendanceDialog(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {employee?.organization_id && (
        <EditAttendanceDialog
          open={showAttendanceDialog}
          onOpenChange={setShowAttendanceDialog}
          record={editingRecord}
          employeeId={id!}
          organizationId={employee.organization_id}
        />
      )}
    </div>
  );
};

export default AttendanceHistory;
