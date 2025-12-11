import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Clock, Settings2 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { EditScheduleDialog } from "./dialogs/EditScheduleDialog";
import { useUserRole } from "@/hooks/useUserRole";

interface AttendanceTrackerProps {
  employeeId: string;
  showCheckIn?: boolean;
  organizationId?: string;
}

export const AttendanceTracker = ({ employeeId, showCheckIn = false, organizationId }: AttendanceTrackerProps) => {
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const { isAdmin, isHR } = useUserRole();
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const canManageSchedule = isAdmin || isHR;

  const { data: todayRecord } = useQuery({
    queryKey: ["attendance-today", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("date", format(currentDate, "yyyy-MM-dd"))
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const { data: monthRecords } = useQuery({
    queryKey: ["attendance-month", employeeId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: schedule } = useQuery({
    queryKey: ["employee-schedule", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_schedules")
        .select("*")
        .eq("employee_id", employeeId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const today = format(currentDate, "yyyy-MM-dd");

      const { error } = await supabase.from("attendance_records").insert({
        employee_id: employeeId,
        date: today,
        check_in_time: now,
        status: "present",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-month"] });
      toast.success("Checked in successfully");
    },
    onError: () => {
      toast.error("Failed to check in");
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!todayRecord) return;

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("attendance_records")
        .update({ check_out_time: now })
        .eq("id", todayRecord.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-month"] });
      toast.success("Checked out successfully");
    },
    onError: () => {
      toast.error("Failed to check out");
    },
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
      present: "bg-green-500",
      absent: "bg-red-500",
      late: "bg-yellow-500",
      half_day: "bg-blue-500",
    };
    return <Badge className={variants[status] || ""}>{status.replace("_", " ")}</Badge>;
  };

  const stats = monthRecords
    ? {
        total: monthRecords.length,
        present: monthRecords.filter((r) => r.status === "present").length,
        absent: monthRecords.filter((r) => r.status === "absent").length,
        late: monthRecords.filter((r) => r.status === "late").length,
        avgHours:
          monthRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0) / 
          monthRecords.filter((r) => r.work_hours).length || 0,
      }
    : null;

  const formatTime = (time: string) => {
    // Convert HH:MM:SS to HH:MM AM/PM
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Schedule Info */}
      {(schedule || canManageSchedule) && (
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Work Schedule</p>
            {canManageSchedule && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => setShowScheduleDialog(true)}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          {schedule ? (
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Start: </span>
                <span className="font-medium">{formatTime(schedule.work_start_time)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">End: </span>
                <span className="font-medium">{formatTime(schedule.work_end_time)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Late after: </span>
                <span className="font-medium">{schedule.late_threshold_minutes} min</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No schedule set</p>
          )}
        </div>
      )}

      {/* Today's Check-in */}
      {showCheckIn && (
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm font-medium text-muted-foreground mb-3">Today's Attendance</p>
          {!todayRecord ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">You haven't checked in today</p>
              <Button onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending}>
                Check In
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Check In</p>
                  <p className="text-base font-semibold">
                    {todayRecord.check_in_time
                      ? format(new Date(todayRecord.check_in_time), "h:mm a")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Check Out</p>
                  <p className="text-base font-semibold">
                    {todayRecord.check_out_time
                      ? format(new Date(todayRecord.check_out_time), "h:mm a")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hours</p>
                  <p className="text-base font-semibold">
                    {todayRecord.work_hours ? `${todayRecord.work_hours.toFixed(1)}h` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {getStatusBadge(todayRecord.status)}
                </div>
              </div>
              {!todayRecord.check_out_time && (
                <Button
                  onClick={() => checkOutMutation.mutate()}
                  disabled={checkOutMutation.isPending}
                  className="w-full"
                  size="sm"
                >
                  Check Out
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Monthly Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-primary/5">
            <div className="text-2xl font-bold text-primary">{stats.present}</div>
            <div className="text-xs text-muted-foreground mt-1">Present</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/5">
            <div className="text-2xl font-bold text-primary">{stats.late}</div>
            <div className="text-xs text-muted-foreground mt-1">Late</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/5">
            <div className="text-2xl font-bold text-primary">{stats.absent}</div>
            <div className="text-xs text-muted-foreground mt-1">Absent</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/5">
            <div className="text-2xl font-bold text-primary">
              {stats.avgHours.toFixed(1)}h
            </div>
            <div className="text-xs text-muted-foreground mt-1">Avg Hours</div>
          </div>
        </div>
      )}

      {/* Attendance History */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">Recent History</p>
        {!monthRecords || monthRecords.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No attendance records this month</p>
        ) : (
          <div className="space-y-2">
            {monthRecords.slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(record.status)}
                  <div>
                    <p className="font-medium text-sm">{format(new Date(record.date), "EEE, MMM d")}</p>
                    <p className="text-xs text-muted-foreground">
                      {record.check_in_time && format(new Date(record.check_in_time), "h:mm a")}
                      {record.check_out_time && ` - ${format(new Date(record.check_out_time), "h:mm a")}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {record.work_hours && (
                    <span className="text-sm font-medium">{record.work_hours.toFixed(1)}h</span>
                  )}
                  {getStatusBadge(record.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {organizationId && (
        <EditScheduleDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          employeeId={employeeId}
          organizationId={organizationId}
          currentSchedule={schedule}
        />
      )}
    </div>
  );
};
