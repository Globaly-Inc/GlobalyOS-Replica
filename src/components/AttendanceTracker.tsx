import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingDown, TrendingUp, Timer, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, differenceInMinutes, addWeeks, subWeeks, isSameWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";

interface AttendanceTrackerProps {
  employeeId: string;
  showCheckIn?: boolean;
}

export const AttendanceTracker = ({ employeeId, showCheckIn = false }: AttendanceTrackerProps) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const currentDate = new Date();
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const isCurrentWeek = isSameWeek(selectedDate, currentDate, { weekStartsOn: 1 });

  const goToPreviousWeek = () => setSelectedDate(subWeeks(selectedDate, 1));
  const goToNextWeek = () => setSelectedDate(addWeeks(selectedDate, 1));

  const { data: todayRecords } = useQuery({
    queryKey: ["attendance-today", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("date", format(currentDate, "yyyy-MM-dd"))
        .order("check_in_time", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Find active session (checked in but not out)
  const activeSession = todayRecords?.find(r => r.check_in_time && !r.check_out_time);
  const completedSessions = todayRecords?.filter(r => r.check_in_time && r.check_out_time) || [];
  const canCheckIn = !activeSession && (todayRecords?.length || 0) < 3;

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
      if (!activeSession) return;

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("attendance_records")
        .update({ check_out_time: now })
        .eq("id", activeSession.id);

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

  // Calculate daily work hours for chart
  const dailyChartData = useMemo(() => {
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    return days.map(day => {
      const dayRecords = weekRecords?.filter(r => isSameDay(new Date(r.date), day)) || [];
      const totalHours = dayRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0);
      const isToday = isSameDay(day, currentDate);
      return {
        day: format(day, "EEE"),
        fullDate: format(day, "MMM d"),
        hours: Number(totalHours.toFixed(1)),
        isToday,
      };
    });
  }, [weekRecords, weekStart, weekEnd, currentDate]);

  const formatMinutesToHours = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs font-medium">{payload[0].payload.fullDate}</p>
          <p className="text-sm font-bold text-primary">{payload[0].value}h worked</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Today's Sessions - only show if there are sessions */}
      {showCheckIn && (todayRecords?.length || 0) > 0 && (
        <div className="p-4 rounded-xl bg-muted/50 border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Today's Sessions</p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary">
                Total: {todayRecords?.reduce((sum, r) => sum + (r.work_hours || 0), 0).toFixed(1)}h
              </span>
              <Badge variant="outline" className="text-xs">
                {todayRecords?.length || 0}/3
              </Badge>
            </div>
          </div>
          
          {/* Completed sessions */}
          {completedSessions.length > 0 && (
            <div className="space-y-2">
              {completedSessions.map((session, idx) => (
                <div key={session.id} className="flex items-center justify-between text-xs p-2 bg-background rounded-lg">
                  <span className="text-muted-foreground">Session {idx + 1}</span>
                  <div className="flex items-center gap-3">
                    <span>{format(new Date(session.check_in_time), "h:mm a")} - {format(new Date(session.check_out_time!), "h:mm a")}</span>
                    <span className="font-medium">{session.work_hours?.toFixed(1)}h</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Active session */}
          {activeSession && (
            <div className={`${completedSessions.length > 0 ? 'mt-3' : ''}`}>
              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900/50">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Checked in at {format(new Date(activeSession.check_in_time), "h:mm a")}
                  </span>
                </div>
                {getStatusBadge(activeSession.status)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly Summary */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm">{isCurrentWeek ? "This Week's Summary" : "Weekly Summary"}</p>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={goToPreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Badge variant="outline" className="text-xs">
              {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={goToNextWeek}
              disabled={isCurrentWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
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

        {/* Daily Hours Chart */}
        <div className="mt-4 p-3 rounded-xl bg-muted/30 border">
          <p className="text-xs font-medium text-muted-foreground mb-3">Daily Work Hours</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${value}h`}
                  width={35}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {dailyChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isToday ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.5)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};
