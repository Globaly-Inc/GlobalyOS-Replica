import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { UserMinus, Clock, MapPin, Send, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { getTimezoneAbbreviation } from "@/utils/timezone";
import { OrgLink } from "@/components/OrgLink";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EmployeeSchedule {
  work_start_time: string;
  work_end_time: string;
  work_location: string;
  break_start_time?: string;
  break_end_time?: string;
  work_days?: number[];
  timezone?: string;
}

interface NotCheckedInEmployee {
  id: string;
  position: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
  employee_schedules: EmployeeSchedule | EmployeeSchedule[];
}

export const NotCheckedInCard = () => {
  const [notCheckedIn, setNotCheckedIn] = useState<NotCheckedInEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());
  const [orgTimezone, setOrgTimezone] = useState<string>('Asia/Kathmandu');
  const { currentOrg } = useOrganization();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { data: currentEmployee } = useCurrentEmployee();
  const isMobile = useIsMobile();

  const canView = isOwner || isAdmin || isHR;

  const loadNotCheckedIn = async () => {
    if (!currentOrg?.id || !canView) {
      setLoading(false);
      return;
    }

    try {
      // Get organization timezone
      const { data: orgData } = await supabase
        .from('organizations')
        .select('timezone')
        .eq('id', currentOrg.id)
        .single();

      const timezone = orgData?.timezone || 'Asia/Kathmandu';
      setOrgTimezone(timezone);

      // Use organization's local date for consistency
      const today = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');

      // Get today's holidays (both global and office-specific)
      const { data: holidaysToday } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          applies_to_all_offices,
          calendar_event_offices(office_id)
        `)
        .eq('organization_id', currentOrg.id)
        .eq('event_type', 'holiday')
        .lte('start_date', today)
        .gte('end_date', today);

      // Build a set of office IDs that are on holiday today
      const holidayOfficeIds = new Set<string>();
      let isOrgWideHoliday = false;

      (holidaysToday || []).forEach(holiday => {
        if (holiday.applies_to_all_offices) {
          isOrgWideHoliday = true;
        } else {
          holiday.calendar_event_offices?.forEach((ceo: { office_id: string }) => {
            holidayOfficeIds.add(ceo.office_id);
          });
        }
      });

      // If org-wide holiday, no one should be flagged as not checked in
      if (isOrgWideHoliday) {
        setNotCheckedIn([]);
        setLoading(false);
        return;
      }

      // Get active employees WITH a schedule (inner join)
      const { data: employeesWithSchedule, error: empError } = await supabase
        .from('employees')
        .select(`
          id,
          position,
          checkin_exempt,
          office_id,
          profiles:profiles!inner(full_name, avatar_url),
          employee_schedules!inner(
            work_start_time,
            work_end_time,
            work_location,
            break_start_time,
            break_end_time,
            work_days,
            timezone
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'active')
        .eq('checkin_exempt', false);

      if (empError) {
        console.error('Error fetching employees with schedules:', empError);
        setLoading(false);
        return;
      }

      // Get employees on approved leave today (include half_day_type)
      const { data: onLeaveToday } = await supabase
        .from('leave_requests')
        .select('employee_id, half_day_type')
        .eq('organization_id', currentOrg.id)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today);

      // Get employees who checked in today
      const { data: checkedInToday } = await supabase
        .from('attendance_records')
        .select('employee_id')
        .eq('organization_id', currentOrg.id)
        .eq('date', today)
        .not('check_in_time', 'is', null);

      // Get reminders already sent today
      const { data: remindersToday } = await supabase
        .from('attendance_reminders')
        .select('employee_id')
        .eq('organization_id', currentOrg.id)
        .eq('reminder_date', today)
        .eq('reminder_type', 'checkin');

      // Build leave map: employee_id -> { isFullDay, isFirstHalf, isSecondHalf }
      const leaveMap = new Map<string, { isFullDay: boolean; isFirstHalf: boolean; isSecondHalf: boolean }>();
      onLeaveToday?.forEach(l => {
        leaveMap.set(l.employee_id, {
          isFullDay: l.half_day_type === 'full',
          isFirstHalf: l.half_day_type === 'first_half',
          isSecondHalf: l.half_day_type === 'second_half',
        });
      });

      const checkedInIds = new Set(checkedInToday?.map(r => r.employee_id) || []);
      const reminderSentIds = new Set(remindersToday?.map(r => r.employee_id) || []);
      
      setSentReminders(reminderSentIds);

      // Filter to find not-checked-in employees whose start time has passed IN THEIR TIMEZONE
      const filtered = (employeesWithSchedule || []).filter(emp => {
        // Already checked in - exclude
        if (checkedInIds.has(emp.id)) {
          return false;
        }

        // Employee's office is on holiday today - exclude
        if (emp.office_id && holidayOfficeIds.has(emp.office_id)) {
          return false;
        }

        // Get employee's schedule
        const scheduleData = emp.employee_schedules;
        const schedule = Array.isArray(scheduleData) ? scheduleData[0] : scheduleData;
        
        if (!schedule?.work_start_time) {
          return false;
        }

        // Use employee's schedule timezone (fallback to org timezone)
        const employeeTimezone = schedule.timezone || timezone;

        // Get current time and day in EMPLOYEE'S timezone
        const currentTimeInEmpTz = formatInTimeZone(new Date(), employeeTimezone, 'HH:mm:ss');
        const currentDayInEmpTz = parseInt(formatInTimeZone(new Date(), employeeTimezone, 'i')) % 7; // 0=Sunday

        // Check if today is a work day for this employee (in their timezone)
        const workDays = schedule.work_days || [1, 2, 3, 4, 5];
        if (!workDays.includes(currentDayInEmpTz)) {
          return false; // Today is not a scheduled work day
        }

        // Check leave status
        const leave = leaveMap.get(emp.id);
        if (leave) {
          // Full day leave - exclude entirely
          if (leave.isFullDay) return false;
          
          // First half leave - only flag if current time is past break_end_time
          if (leave.isFirstHalf) {
            const breakEndTime = schedule.break_end_time || '13:00:00';
            return currentTimeInEmpTz >= breakEndTime; // Only show after lunch break
          }
          
          // Second half leave - only flag if current time is before break_start_time
          if (leave.isSecondHalf) {
            const breakStartTime = schedule.break_start_time || '12:00:00';
            if (currentTimeInEmpTz >= breakStartTime) return false; // They're on leave now
            // Otherwise, they should have checked in by their normal start time
          }
        }

        // Only show if their scheduled start time has passed IN THEIR TIMEZONE
        return currentTimeInEmpTz >= schedule.work_start_time;
      }) as NotCheckedInEmployee[];

      setNotCheckedIn(filtered);
    } catch (error) {
      console.error('Error loading not checked in employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && currentOrg?.id) {
      loadNotCheckedIn();
    }
  }, [currentOrg?.id, roleLoading, canView]);

  // Refresh every minute to update as employees' start times pass
  useEffect(() => {
    if (!currentOrg?.id || !canView) return;
    
    const interval = setInterval(() => {
      loadNotCheckedIn();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [currentOrg?.id, canView]);

  // Realtime subscriptions
  useEffect(() => {
    if (!currentOrg?.id || !canView) return;

    const attendanceChannel = supabase
      .channel('not-checked-in-attendance')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_records',
        filter: `organization_id=eq.${currentOrg.id}`
      }, loadNotCheckedIn)
      .subscribe();

    const leaveChannel = supabase
      .channel('not-checked-in-leave')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leave_requests',
        filter: `organization_id=eq.${currentOrg.id}`
      }, loadNotCheckedIn)
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(leaveChannel);
    };
  }, [currentOrg?.id, canView]);

  const handleSendReminder = async (employeeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentOrg?.id || !currentEmployee?.id || sendingReminder) return;

    setSendingReminder(employeeId);
    try {
      const response = await supabase.functions.invoke('send-checkin-reminder', {
        body: {
          employee_id: employeeId,
          organization_id: currentOrg.id,
          sender_employee_id: currentEmployee.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.already_sent) {
        toast.info("Reminder already sent today");
        setSentReminders(prev => new Set([...prev, employeeId]));
      } else if (response.data?.success) {
        toast.success("Reminder sent successfully");
        setSentReminders(prev => new Set([...prev, employeeId]));
      } else {
        throw new Error(response.data?.error || "Failed to send reminder");
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error("Failed to send reminder");
    } finally {
      setSendingReminder(null);
    }
  };

  if (roleLoading || !canView || loading || notCheckedIn.length === 0) {
    return null;
  }

  const formatTime = (timeStr: string, scheduleTimezone?: string) => {
    if (!timeStr) return '';
    const tz = scheduleTimezone || orgTimezone;
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return `${format(date, 'h:mm a')} ${getTimezoneAbbreviation(tz)}`;
  };

  const maxVisible = isMobile ? 10 : 20;
  const displayEmployees = notCheckedIn.slice(0, maxVisible);
  const remainingCount = notCheckedIn.length - maxVisible;

  return (
    <Card className={cn("p-6", isMobile && "p-4")}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserMinus className="h-5 w-5 text-destructive" />
          <h3 className={cn("font-semibold", isMobile ? "text-base" : "text-lg")}>
            Not Checked In
          </h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {notCheckedIn.length} {notCheckedIn.length === 1 ? 'person' : 'people'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {displayEmployees.map((employee) => {
          const scheduleData = employee.employee_schedules;
          const schedule = Array.isArray(scheduleData) ? scheduleData[0] : scheduleData;
          const initials = employee.profiles.full_name
            ?.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase() || '?';
          const reminderSent = sentReminders.has(employee.id);
          const isSending = sendingReminder === employee.id;

          const avatarContent = (
            <Avatar className={cn("cursor-pointer border-2 border-destructive/30", isMobile ? "h-8 w-8" : "h-10 w-10")}>
              <AvatarImage src={employee.profiles.avatar_url || undefined} alt={employee.profiles.full_name} />
              <AvatarFallback className="bg-destructive/10 text-destructive text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          );

          if (isMobile) {
            return (
              <OrgLink key={employee.id} to={`/team/${employee.id}`}>
                {avatarContent}
              </OrgLink>
            );
          }

          return (
            <HoverCard key={employee.id} openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <OrgLink to={`/team/${employee.id}`}>
                  {avatarContent}
                </OrgLink>
              </HoverCardTrigger>
              <HoverCardContent className="w-72" side="top">
                <div className="flex gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={employee.profiles.avatar_url || undefined} alt={employee.profiles.full_name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{employee.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground truncate">{employee.position}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <Badge variant="destructive" className="text-xs">
                    Not checked in
                  </Badge>
                  {schedule && (
                    <>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Expected: {formatTime(schedule.work_start_time, schedule.timezone)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="capitalize">{schedule.work_location}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t">
                  <Button
                    size="sm"
                    variant={reminderSent ? "secondary" : "outline"}
                    className="w-full"
                    disabled={reminderSent || isSending}
                    onClick={(e) => handleSendReminder(employee.id, e)}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Sending...
                      </>
                    ) : reminderSent ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Reminder Sent
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Send Reminder
                      </>
                    )}
                  </Button>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}

        {remainingCount > 0 && (
          <OrgLink to="/attendance-history">
            <div className={cn(
              "flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium text-xs",
              isMobile ? "h-8 w-8" : "h-10 w-10"
            )}>
              +{remainingCount}
            </div>
          </OrgLink>
        )}
      </div>
    </Card>
  );
};
