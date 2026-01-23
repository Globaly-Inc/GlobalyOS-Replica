import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useCheckInStatus } from "@/services/useAttendance";
import { useAttendanceRealtime } from "@/services/useAttendanceRealtime";
import { RemoteCheckInDialog } from "@/components/dialogs/RemoteCheckInDialog";
import { QRScannerDialog } from "@/components/dialogs/QRScannerDialog";
import { useEmployeeWorkLocation, useHasApprovedWfhToday } from "@/services/useWfh";
import { format, differenceInMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { getTimezoneAbbreviation } from "@/utils/timezone";

interface EmployeeSchedule {
  work_start_time: string;
  work_end_time: string;
  work_location: string;
  break_start_time?: string;
  break_end_time?: string;
  work_days?: number[];
  timezone?: string;
}

type HalfDayType = 'full' | 'first_half' | 'second_half' | null;

export const SelfCheckInCard = () => {
  // Enable realtime updates for attendance
  useAttendanceRealtime();
  
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { data: checkInStatus, isLoading: statusLoading } = useCheckInStatus();
  
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<EmployeeSchedule | null>(null);
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [halfDayType, setHalfDayType] = useState<HalfDayType>(null);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [scheduleStarted, setScheduleStarted] = useState(false);
  const [orgTimezone, setOrgTimezone] = useState<string>('Asia/Kathmandu');

  // Work location hooks for smart check-in
  const { data: workLocation } = useEmployeeWorkLocation(employeeId || undefined);
  const { data: hasApprovedWfhToday } = useHasApprovedWfhToday(employeeId || undefined);

  // Determine which check-in method to use (same logic as top bar)
  const shouldUseRemoteCheckIn = workLocation === 'hybrid' || workLocation === 'remote' || 
    (workLocation === 'office' && hasApprovedWfhToday);

  // Check if schedule has started based on work days and half-day leave
  useEffect(() => {
    if (!schedule?.work_start_time) {
      setScheduleStarted(false);
      return;
    }

    const checkScheduleStarted = () => {
      // Get current time and day in organization's timezone
      const currentTimeStr = formatInTimeZone(new Date(), orgTimezone, 'HH:mm:ss');
      const currentDayOfWeek = parseInt(formatInTimeZone(new Date(), orgTimezone, 'i')) % 7;
      
      // Check if today is a scheduled work day (default Mon-Fri: 1,2,3,4,5)
      const workDays = schedule.work_days || [1, 2, 3, 4, 5];
      if (!workDays.includes(currentDayOfWeek)) {
        setScheduleStarted(false);
        return;
      }

      // Determine effective start and end time based on leave type
      let effectiveStartTime = schedule.work_start_time;
      let effectiveEndTime = schedule.work_end_time;
      
      if (halfDayType === 'first_half') {
        // First half leave: check-in starts after break ends
        effectiveStartTime = schedule.break_end_time || '13:00:00';
      } else if (halfDayType === 'second_half') {
        // Second half leave: check-in at regular time, ends when break starts
        effectiveEndTime = schedule.break_start_time || '12:00:00';
      }
      
      // Only show card if current time is within working window
      const isAfterStart = currentTimeStr >= effectiveStartTime;
      const isBeforeEnd = currentTimeStr < effectiveEndTime;
      
      setScheduleStarted(isAfterStart && isBeforeEnd);
    };

    checkScheduleStarted();
    const interval = setInterval(checkScheduleStarted, 60000);
    
    return () => clearInterval(interval);
  }, [schedule, orgTimezone, halfDayType]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id || !currentOrg?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get employee and schedule (with timezone)
        const { data: employee } = await supabase
          .from("employees")
          .select(`
            id,
            checkin_exempt,
            employee_schedules(
              work_start_time,
              work_end_time,
              work_location,
              break_start_time,
              break_end_time,
              work_days,
              timezone
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

        // If employee is exempt from check-in, don't show the card
        if (employee.checkin_exempt) {
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

        // Use schedule timezone, fall back to org timezone if not set
        let timezone = empSchedule.timezone;
        if (!timezone) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('timezone')
            .eq('id', currentOrg.id)
            .single();
          timezone = orgData?.timezone || 'UTC';
        }
        setOrgTimezone(timezone);

        // Check if on approved leave today - use organization's local date
        const today = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
        const { data: leaveRequest } = await supabase
          .from("leave_requests")
          .select("id, half_day_type")
          .eq("employee_id", employee.id)
          .eq("status", "approved")
          .lte("start_date", today)
          .gte("end_date", today)
          .maybeSingle();

        if (leaveRequest) {
          const leaveType = leaveRequest.half_day_type as HalfDayType;
          setHalfDayType(leaveType);
          // Only set isOnLeave for full day leave
          setIsOnLeave(leaveType === 'full');
        } else {
          setHalfDayType(null);
          setIsOnLeave(false);
        }
      } catch (error) {
        console.error("Error loading self check-in data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, currentOrg?.id]);

  // Don't show if loading, no schedule, on full-day leave, or already checked in
  if (loading || statusLoading) {
    return null;
  }

  if (!schedule || isOnLeave || checkInStatus?.isCheckedIn || !scheduleStarted) {
    return null;
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return `${format(date, "h:mm a")} ${getTimezoneAbbreviation(orgTimezone)}`;
  };

  // Get effective start time based on half-day leave
  const getEffectiveStartTime = () => {
    if (halfDayType === 'first_half') {
      return schedule?.break_end_time || '13:00:00';
    }
    return schedule?.work_start_time || '';
  };

  const getLateDuration = () => {
    const effectiveStartTime = getEffectiveStartTime();
    if (!effectiveStartTime) return null;
    
    const now = new Date();
    
    // Get today's date in the employee's schedule timezone
    const todayInTz = formatInTimeZone(now, orgTimezone, 'yyyy-MM-dd');
    
    // Parse the time and combine with today's date
    const [hours, minutes] = effectiveStartTime.split(":");
    const localStartTimeStr = `${todayInTz}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
    
    // Convert from employee's timezone to a proper Date object for comparison
    const startTime = fromZonedTime(localStartTimeStr, orgTimezone);

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
                  <span>Expected: {formatTime(getEffectiveStartTime())}</span>
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
                onClick={() => {
                  if (shouldUseRemoteCheckIn) {
                    setShowCheckInDialog(true);
                  } else {
                    setShowQRScanner(true);
                  }
                }}
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

      <QRScannerDialog
        open={showQRScanner}
        onOpenChange={setShowQRScanner}
      />
    </>
  );
};
