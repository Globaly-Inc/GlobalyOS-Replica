import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useCheckInStatus } from "@/services/useAttendance";
import { RemoteCheckInDialog } from "@/components/dialogs/RemoteCheckInDialog";
import { format, differenceInMinutes } from "date-fns";

interface EmployeeSchedule {
  work_start_time: string;
  work_end_time: string;
  work_location: string;
}

export const SelfCheckInCard = () => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { data: checkInStatus, isLoading: statusLoading } = useCheckInStatus();
  
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<EmployeeSchedule | null>(null);
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id || !currentOrg?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get employee and schedule
        const { data: employee } = await supabase
          .from("employees")
          .select(`
            id,
            employee_schedules(
              work_start_time,
              work_end_time,
              work_location
            )
          `)
          .eq("user_id", user.id)
          .eq("organization_id", currentOrg.id)
          .eq("status", "active")
          .maybeSingle();

        if (!employee) {
          setLoading(false);
          return;
        }

        setEmployeeId(employee.id);

        const scheduleData = employee.employee_schedules;
        const empSchedule = Array.isArray(scheduleData) ? scheduleData[0] : scheduleData;
        
        if (!empSchedule) {
          // No schedule means check-in not required
          setLoading(false);
          return;
        }

        setSchedule(empSchedule);

        // Check if on approved leave today
        const today = format(new Date(), "yyyy-MM-dd");
        const { data: leaveRequest } = await supabase
          .from("leave_requests")
          .select("id")
          .eq("employee_id", employee.id)
          .eq("status", "approved")
          .lte("start_date", today)
          .gte("end_date", today)
          .maybeSingle();

        setIsOnLeave(!!leaveRequest);
      } catch (error) {
        console.error("Error loading self check-in data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, currentOrg?.id]);

  // Don't show if loading, no schedule, on leave, or already checked in
  if (loading || statusLoading) {
    return null;
  }

  if (!schedule || isOnLeave || checkInStatus?.isCheckedIn) {
    return null;
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, "h:mm a");
  };

  const getLateDuration = () => {
    if (!schedule?.work_start_time) return null;
    
    const now = new Date();
    const [hours, minutes] = schedule.work_start_time.split(":").map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);

    if (now <= startTime) return null;

    const lateMinutes = differenceInMinutes(now, startTime);
    if (lateMinutes < 60) {
      return `${lateMinutes} minute${lateMinutes !== 1 ? "s" : ""} late`;
    }
    const hours_late = Math.floor(lateMinutes / 60);
    const mins = lateMinutes % 60;
    return `${hours_late}h ${mins}m late`;
  };

  const lateDuration = getLateDuration();

  return (
    <>
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                You Haven't Checked In Today
              </h3>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Expected: {formatTime(schedule.work_start_time)}</span>
                  {lateDuration && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      ({lateDuration})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="capitalize">{schedule.work_location}</span>
                </div>
              </div>
              <Button
                onClick={() => setShowCheckInDialog(true)}
                className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                size="sm"
              >
                Check In Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <RemoteCheckInDialog
        open={showCheckInDialog}
        onOpenChange={setShowCheckInDialog}
      />
    </>
  );
};
