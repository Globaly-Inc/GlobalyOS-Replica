import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Clock, Settings2, ArrowRight, TrendingDown, TrendingUp, Timer } from "lucide-react";
import { format, startOfWeek, endOfWeek, differenceInMinutes, parseISO } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { EditScheduleDialog } from "./dialogs/EditScheduleDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";

interface AttendanceTrackerProps {
  employeeId: string;
  showCheckIn?: boolean;
  organizationId?: string;
}

export const AttendanceTracker = ({ employeeId, showCheckIn = false, organizationId }: AttendanceTrackerProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentDate = new Date();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
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

  const { data: weekRecords } = useQuery({
    queryKey: ["attendance-week", employeeId, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
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
      queryClient.invalidateQueries({ queryKey: ["attendance-week"] });
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
      queryClient.invalidateQueries({ queryKey: ["attendance-week"] });
      toast.success("Checked out successfully");
    },
    onError: () => {
      toast.error("Failed to check out");
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      present: "bg-green-500",
      absent: "bg-red-500",
      late: "bg-yellow-500",
      half_day: "bg-blue-500",
    };
    return <Badge className={variants[status] || ""}>{status.replace("_", " ")}</Badge>;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Calculate weekly metrics
  const calculateWeeklyMetrics = () => {
    if (!weekRecords || !schedule) {
      return { lateMinutes: 0, earlyMinutes: 0, earlyCheckouts: 0, totalWorkHours: 0, daysWorked: 0 };
    }

    let lateMinutes = 0;
    let earlyMinutes = 0;
    let earlyCheckouts = 0;
    let totalWorkHours = 0;
    let daysWorked = 0;

    const scheduleStart = schedule.work_start_time;
    const scheduleEnd = schedule.work_end_time;

    weekRecords.forEach((record) => {
      if (record.check_in_time) {
        daysWorked++;
        const checkInTime = new Date(record.check_in_time);
        const checkInHHMM = format(checkInTime, "HH:mm:ss");
        
        // Calculate late minutes
        if (checkInHHMM > scheduleStart) {
          const [schedH, schedM] = scheduleStart.split(":").map(Number);
          const schedDate = new Date(checkInTime);
          schedDate.setHours(schedH, schedM, 0, 0);
          lateMinutes += Math.max(0, differenceInMinutes(checkInTime, schedDate));
        }
        
        // Calculate early arrival
        if (checkInHHMM < scheduleStart) {
          const [schedH, schedM] = scheduleStart.split(":").map(Number);
          const schedDate = new Date(checkInTime);
          schedDate.setHours(schedH, schedM, 0, 0);
          earlyMinutes += Math.max(0, differenceInMinutes(schedDate, checkInTime));
        }

        // Calculate early checkouts
        if (record.check_out_time) {
          const checkOutTime = new Date(record.check_out_time);
          const checkOutHHMM = format(checkOutTime, "HH:mm:ss");
          if (checkOutHHMM < scheduleEnd) {
            earlyCheckouts++;
          }
        }

        if (record.work_hours) {
          totalWorkHours += record.work_hours;
        }
      }
    });

    return { lateMinutes, earlyMinutes, earlyCheckouts, totalWorkHours, daysWorked };
  };

  const metrics = calculateWeeklyMetrics();

  const formatMinutesToHours = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-5">
      {/* Work Schedule */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <p className="font-semibold">Work Schedule</p>
          </div>
          {canManageSchedule && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2"
              onClick={() => setShowScheduleDialog(true)}
            >
              <Settings2 className="h-4 w-4 mr-1" />
              Configure
            </Button>
          )}
        </div>
        {schedule ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background/60 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Start</p>
              <p className="font-semibold text-sm">{formatTime(schedule.work_start_time)}</p>
            </div>
            <div className="bg-background/60 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">End</p>
              <p className="font-semibold text-sm">{formatTime(schedule.work_end_time)}</p>
            </div>
            <div className="bg-background/60 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Grace</p>
              <p className="font-semibold text-sm">{schedule.late_threshold_minutes}m</p>
            </div>
          </div>
        ) : (
          <div className="bg-background/60 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">No schedule configured</p>
            {canManageSchedule && (
              <Button 
                variant="link" 
                size="sm" 
                className="mt-1 h-auto p-0"
                onClick={() => setShowScheduleDialog(true)}
              >
                Set up schedule
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Today's Check-in */}
      {showCheckIn && (
        <div className="p-4 rounded-xl bg-muted/50 border">
          <p className="text-sm font-semibold mb-3">Today's Status</p>
          {!todayRecord ? (
            <div className="text-center py-3">
              <p className="text-muted-foreground text-sm mb-3">Not checked in yet</p>
              <Button onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending} size="sm">
                Check In
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">In</p>
                    <p className="font-semibold text-sm">
                      {todayRecord.check_in_time ? format(new Date(todayRecord.check_in_time), "h:mm a") : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Out</p>
                    <p className="font-semibold text-sm">
                      {todayRecord.check_out_time ? format(new Date(todayRecord.check_out_time), "h:mm a") : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hours</p>
                    <p className="font-semibold text-sm">
                      {todayRecord.work_hours ? `${todayRecord.work_hours.toFixed(1)}h` : "-"}
                    </p>
                  </div>
                </div>
                {getStatusBadge(todayRecord.status)}
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

      {/* Weekly Summary */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm">This Week's Summary</p>
          <Badge variant="outline" className="text-xs">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Late Hours</p>
            </div>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">
              {formatMinutesToHours(metrics.lateMinutes)}
            </p>
          </div>
          
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Early Arrivals</p>
            </div>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">
              {formatMinutesToHours(metrics.earlyMinutes)}
            </p>
          </div>
          
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Early Checkouts</p>
            </div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
              {metrics.earlyCheckouts}
            </p>
          </div>
          
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Hours Worked</p>
            </div>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {metrics.totalWorkHours.toFixed(1)}h
            </p>
          </div>
        </div>
      </div>

      {/* View Full History Link */}
      <Button 
        variant="outline" 
        className="w-full justify-between"
        onClick={() => navigate(`/team/${employeeId}/attendance`)}
      >
        <span>View Full Attendance History</span>
        <ArrowRight className="h-4 w-4" />
      </Button>

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
