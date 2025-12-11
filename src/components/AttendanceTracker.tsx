import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

interface AttendanceTrackerProps {
  employeeId: string;
  showCheckIn?: boolean;
}

export const AttendanceTracker = ({ employeeId, showCheckIn = false }: AttendanceTrackerProps) => {
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

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

  return (
    <div className="space-y-4">
      {/* Today's Check-in */}
      {showCheckIn && (
        <Card>
          <CardContent className="pt-4">
            {!todayRecord ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">You haven't checked in today</p>
                <Button onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending}>
                  Check In
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5">
                  <div>
                    <p className="text-sm text-muted-foreground">Check In</p>
                    <p className="text-lg font-semibold">
                      {todayRecord.check_in_time
                        ? format(new Date(todayRecord.check_in_time), "h:mm a")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check Out</p>
                    <p className="text-lg font-semibold">
                      {todayRecord.check_out_time
                        ? format(new Date(todayRecord.check_out_time), "h:mm a")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hours</p>
                    <p className="text-lg font-semibold">
                      {todayRecord.work_hours ? `${todayRecord.work_hours.toFixed(1)}h` : "-"}
                    </p>
                  </div>
                </div>
                {!todayRecord.check_out_time && (
                  <Button
                    onClick={() => checkOutMutation.mutate()}
                    disabled={checkOutMutation.isPending}
                    className="w-full"
                  >
                    Check Out
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monthly Statistics */}
      <Card>
        <CardContent className="pt-4">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-primary/5">
                <div className="text-2xl font-bold text-primary">{stats.present}</div>
                <div className="text-sm text-muted-foreground mt-1">Present</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/5">
                <div className="text-2xl font-bold text-primary">{stats.late}</div>
                <div className="text-sm text-muted-foreground mt-1">Late</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/5">
                <div className="text-2xl font-bold text-primary">{stats.absent}</div>
                <div className="text-sm text-muted-foreground mt-1">Absent</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/5">
                <div className="text-2xl font-bold text-primary">
                  {stats.avgHours.toFixed(1)}h
                </div>
                <div className="text-sm text-muted-foreground mt-1">Avg Hours</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardContent className="pt-4">
          {!monthRecords || monthRecords.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No attendance records this month</p>
          ) : (
            <div className="space-y-2">
              {monthRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(record.status)}
                    <div>
                      <p className="font-medium">{format(new Date(record.date), "EEE, MMM d")}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.check_in_time && format(new Date(record.check_in_time), "h:mm a")}
                        {record.check_out_time && ` - ${format(new Date(record.check_out_time), "h:mm a")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {record.work_hours && (
                      <span className="text-sm font-medium">{record.work_hours.toFixed(1)}h</span>
                    )}
                    {getStatusBadge(record.status)}
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
