import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Send, Check, Loader2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { OrgLink } from "@/components/OrgLink";
import { toast } from "sonner";

interface EmployeeSchedule {
  work_start_time: string;
  work_end_time: string;
  work_location: string;
  break_start_time?: string;
  break_end_time?: string;
  work_days?: number[];
}

export interface NotCheckedInEmployee {
  id: string;
  position: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
  employee_schedules: EmployeeSchedule | EmployeeSchedule[];
}

// Historical record from database
interface NotCheckedInRecord {
  id: string;
  employee_id: string;
  date: string;
  expected_start_time: string | null;
  work_location: string | null;
  reminder_sent: boolean;
  reminder_sent_at: string | null;
  employee?: {
    id: string;
    position: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

type DateRangeOption = "today" | "last7days" | "last14days" | "last30days" | "thisMonth" | "lastMonth" | "custom";

interface AttendanceNotCheckedInTabProps {
  selectedEmployees?: string[];
  onSelectedEmployeesChange?: (employees: string[]) => void;
  onEmployeesListChange?: (employees: { id: string; name: string; avatarUrl: string | null; position: string }[]) => void;
  onCountChange?: (count: number) => void;
  dateRangeFilter?: DateRangeOption;
  customDateRange?: { from: Date | undefined; to: Date | undefined };
}

export const AttendanceNotCheckedInTab = ({
  selectedEmployees: externalSelectedEmployees,
  onSelectedEmployeesChange,
  onEmployeesListChange,
  onCountChange,
  dateRangeFilter = "last7days",
  customDateRange,
}: AttendanceNotCheckedInTabProps) => {
  const [notCheckedIn, setNotCheckedIn] = useState<NotCheckedInEmployee[]>([]);
  const [historicalRecords, setHistoricalRecords] = useState<NotCheckedInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());
  const { currentOrg } = useOrganization();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { data: currentEmployee } = useCurrentEmployee();
  const isMobile = useIsMobile();
  
  const selectedEmployees = externalSelectedEmployees ?? [];

  const canView = isOwner || isAdmin || isHR;
  const canSendReminder = isOwner || isAdmin || isHR;

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    switch (dateRangeFilter) {
      case "today":
        return { start: todayUTC, end: todayUTC };
      case "last7days":
        return { start: subDays(todayUTC, 6), end: todayUTC };
      case "last14days":
        return { start: subDays(todayUTC, 13), end: todayUTC };
      case "last30days":
        return { start: subDays(todayUTC, 29), end: todayUTC };
      case "thisMonth":
        return { start: startOfMonth(todayUTC), end: endOfMonth(todayUTC) };
      case "lastMonth":
        const lastMonth = subMonths(todayUTC, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "custom":
        return {
          start: customDateRange?.from || todayUTC,
          end: customDateRange?.to || todayUTC,
        };
      default:
        return { start: subDays(todayUTC, 6), end: todayUTC };
    }
  }, [dateRangeFilter, customDateRange]);

  const isToday = dateRangeFilter === "today";

  // Load real-time "not checked in" for today
  const loadTodayNotCheckedIn = async () => {
    if (!currentOrg?.id || !canView) {
      setLoading(false);
      return;
    }

    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('timezone')
        .eq('id', currentOrg.id)
        .single();

      const orgTimezone = orgData?.timezone || 'Asia/Kathmandu';
      const today = formatInTimeZone(new Date(), orgTimezone, 'yyyy-MM-dd');

      const { data: employeesWithSchedule, error: empError } = await supabase
        .from('employees')
        .select(`
          id,
          position,
          checkin_exempt,
          profiles:profiles!inner(full_name, avatar_url),
          employee_schedules!inner(
            work_start_time,
            work_end_time,
            work_location,
            break_start_time,
            break_end_time,
            work_days
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

      // Get employees on approved leave today
      const { data: onLeaveToday } = await supabase
        .from('leave_requests')
        .select('employee_id, half_day_type')
        .eq('organization_id', currentOrg.id)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today);

      const { data: checkedInToday } = await supabase
        .from('attendance_records')
        .select('employee_id')
        .eq('organization_id', currentOrg.id)
        .eq('date', today)
        .not('check_in_time', 'is', null);

      const { data: remindersToday } = await supabase
        .from('attendance_reminders')
        .select('employee_id')
        .eq('organization_id', currentOrg.id)
        .eq('reminder_date', today)
        .eq('reminder_type', 'checkin');

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

      const currentTimeStr = formatInTimeZone(new Date(), orgTimezone, 'HH:mm:ss');
      const currentDayOfWeek = parseInt(formatInTimeZone(new Date(), orgTimezone, 'i')) % 7;

      const filtered = (employeesWithSchedule || []).filter(emp => {
        if (checkedInIds.has(emp.id)) return false;

        const scheduleData = emp.employee_schedules;
        const schedule = Array.isArray(scheduleData) ? scheduleData[0] : scheduleData;
        
        if (!schedule?.work_start_time) return false;

        const workDays = schedule.work_days || [1, 2, 3, 4, 5];
        if (!workDays.includes(currentDayOfWeek)) return false;

        const leave = leaveMap.get(emp.id);
        if (leave) {
          if (leave.isFullDay) return false;
          
          if (leave.isFirstHalf) {
            const breakEndTime = schedule.break_end_time || '13:00:00';
            return currentTimeStr >= breakEndTime;
          }
          
          if (leave.isSecondHalf) {
            const breakStartTime = schedule.break_start_time || '12:00:00';
            if (currentTimeStr >= breakStartTime) return false;
          }
        }

        return currentTimeStr >= schedule.work_start_time;
      }) as NotCheckedInEmployee[];

      setNotCheckedIn(filtered);
      setHistoricalRecords([]);
    } catch (error) {
      console.error('Error loading not checked in employees:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load historical records from database
  const loadHistoricalRecords = async () => {
    if (!currentOrg?.id || !canView) {
      setLoading(false);
      return;
    }

    try {
      const startDate = format(dateRange.start, "yyyy-MM-dd");
      const endDate = format(dateRange.end, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from('attendance_not_checked_in')
        .select(`
          id,
          employee_id,
          date,
          expected_start_time,
          work_location,
          reminder_sent,
          reminder_sent_at,
          employee:employees!attendance_not_checked_in_employee_id_fkey(
            id,
            position,
            profiles:profiles!inner(full_name, avatar_url)
          )
        `)
        .eq('organization_id', currentOrg.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching historical not checked in records:', error);
        setLoading(false);
        return;
      }

      setHistoricalRecords((data || []) as NotCheckedInRecord[]);
      setNotCheckedIn([]);
    } catch (error) {
      console.error('Error loading historical records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && currentOrg?.id) {
      setLoading(true);
      if (isToday) {
        loadTodayNotCheckedIn();
      } else {
        loadHistoricalRecords();
      }
    }
  }, [currentOrg?.id, roleLoading, canView, dateRangeFilter, dateRange.start, dateRange.end]);

  // Only set up real-time updates for today view
  useEffect(() => {
    if (!currentOrg?.id || !canView || !isToday) return;
    
    const interval = setInterval(() => {
      loadTodayNotCheckedIn();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [currentOrg?.id, canView, isToday]);

  useEffect(() => {
    if (!currentOrg?.id || !canView || !isToday) return;

    const attendanceChannel = supabase
      .channel('not-checked-in-tab-attendance')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_records',
        filter: `organization_id=eq.${currentOrg.id}`
      }, loadTodayNotCheckedIn)
      .subscribe();

    const leaveChannel = supabase
      .channel('not-checked-in-tab-leave')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leave_requests',
        filter: `organization_id=eq.${currentOrg.id}`
      }, loadTodayNotCheckedIn)
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(leaveChannel);
    };
  }, [currentOrg?.id, canView, isToday]);

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

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Build employees list for filter
  const employeesList = useMemo(() => {
    if (isToday) {
      return notCheckedIn.map(emp => ({
        id: emp.id,
        name: emp.profiles.full_name,
        avatarUrl: emp.profiles.avatar_url,
        position: emp.position,
      }));
    } else {
      const uniqueEmployees = new Map<string, { id: string; name: string; avatarUrl: string | null; position: string }>();
      historicalRecords.forEach(record => {
        if (record.employee && !uniqueEmployees.has(record.employee_id)) {
          uniqueEmployees.set(record.employee_id, {
            id: record.employee.id,
            name: record.employee.profiles.full_name,
            avatarUrl: record.employee.profiles.avatar_url,
            position: record.employee.position,
          });
        }
      });
      return Array.from(uniqueEmployees.values());
    }
  }, [isToday, notCheckedIn, historicalRecords]);

  // Notify parent of employees list changes
  useEffect(() => {
    if (onEmployeesListChange) {
      onEmployeesListChange(employeesList);
    }
  }, [employeesList, onEmployeesListChange]);

  // Notify parent of count changes
  const totalCount = isToday ? notCheckedIn.length : historicalRecords.length;
  useEffect(() => {
    if (onCountChange) {
      onCountChange(totalCount);
    }
  }, [totalCount, onCountChange]);

  // Filter displayed items based on selection
  const displayedEmployees = selectedEmployees.length > 0
    ? notCheckedIn.filter(emp => selectedEmployees.includes(emp.id))
    : notCheckedIn;

  const displayedRecords = selectedEmployees.length > 0
    ? historicalRecords.filter(record => selectedEmployees.includes(record.employee_id))
    : historicalRecords;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if ((isToday && notCheckedIn.length === 0) || (!isToday && historicalRecords.length === 0)) {
    return (
      <Card className="flex flex-col items-center justify-center py-12">
        <Check className="h-12 w-12 text-green-500 mb-3" />
        <p className="text-muted-foreground font-medium">
          {isToday ? "Everyone has checked in!" : "No missing check-ins found"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isToday ? "All scheduled employees are present today" : "All employees checked in during this period"}
        </p>
      </Card>
    );
  }

  // Render TODAY view
  if (isToday) {
    return (
      <div className="space-y-4">
        {isMobile ? (
          <div className="space-y-3">
            {displayedEmployees.map((employee) => {
              const scheduleData = employee.employee_schedules;
              const schedule = Array.isArray(scheduleData) ? scheduleData[0] : scheduleData;
              const reminderSent = sentReminders.has(employee.id);
              const isSending = sendingReminder === employee.id;

              return (
                <Card key={employee.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <OrgLink to={`/team/${employee.id}`}>
                      <Avatar className="h-10 w-10 border-2 border-destructive/30">
                        <AvatarImage src={employee.profiles.avatar_url || undefined} />
                        <AvatarFallback className="bg-destructive/10 text-destructive text-xs">
                          {getInitials(employee.profiles.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </OrgLink>
                    <div className="flex-1 min-w-0">
                      <OrgLink to={`/team/${employee.id}`}>
                        <p className="font-medium text-sm truncate">{employee.profiles.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{employee.position}</p>
                      </OrgLink>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {schedule?.work_start_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Expected: {formatTime(schedule.work_start_time)}</span>
                          </div>
                        )}
                        {schedule?.work_location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="capitalize">{schedule.work_location}</span>
                          </div>
                        )}
                      </div>
                      {canSendReminder && (
                        <Button
                          size="sm"
                          variant={reminderSent ? "secondary" : "outline"}
                          className="w-full mt-3"
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
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="min-w-[200px]">Employee</TableHead>
                    <TableHead>Expected Start</TableHead>
                    <TableHead>Work Location</TableHead>
                    {canSendReminder && <TableHead className="w-[150px]">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedEmployees.map((employee) => {
                    const scheduleData = employee.employee_schedules;
                    const schedule = Array.isArray(scheduleData) ? scheduleData[0] : scheduleData;
                    const reminderSent = sentReminders.has(employee.id);
                    const isSending = sendingReminder === employee.id;

                    return (
                      <TableRow key={employee.id} className="hover:bg-muted/50">
                        <TableCell>
                          <OrgLink to={`/team/${employee.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                            <Avatar className="h-8 w-8 border-2 border-destructive/30">
                              <AvatarImage src={employee.profiles.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-destructive/10 text-destructive">
                                {getInitials(employee.profiles.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{employee.profiles.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{employee.position}</p>
                            </div>
                          </OrgLink>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{schedule?.work_start_time ? formatTime(schedule.work_start_time) : '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="capitalize">{schedule?.work_location || '—'}</span>
                          </div>
                        </TableCell>
                        {canSendReminder && (
                          <TableCell>
                            <Button
                              size="sm"
                              variant={reminderSent ? "secondary" : "outline"}
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
                                  Sent
                                </>
                              ) : (
                                <>
                                  <Send className="h-3.5 w-3.5 mr-1.5" />
                                  Remind
                                </>
                              )}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Render HISTORICAL view
  return (
    <div className="space-y-4">
      {isMobile ? (
        <div className="space-y-3">
          {displayedRecords.map((record) => {
            const employee = record.employee;
            if (!employee) return null;

            return (
              <Card key={record.id} className="p-4">
                <div className="flex items-start gap-3">
                  <OrgLink to={`/team/${employee.id}`}>
                    <Avatar className="h-10 w-10 border-2 border-destructive/30">
                      <AvatarImage src={employee.profiles.avatar_url || undefined} />
                      <AvatarFallback className="bg-destructive/10 text-destructive text-xs">
                        {getInitials(employee.profiles.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </OrgLink>
                  <div className="flex-1 min-w-0">
                    <OrgLink to={`/team/${employee.id}`}>
                      <p className="font-medium text-sm truncate">{employee.profiles.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{employee.position}</p>
                    </OrgLink>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(record.date), "MMM d, yyyy")}</span>
                      </div>
                      {record.expected_start_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Expected: {formatTime(record.expected_start_time)}</span>
                        </div>
                      )}
                      {record.work_location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="capitalize">{record.work_location}</span>
                        </div>
                      )}
                    </div>
                    {record.reminder_sent && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Reminder Sent
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="min-w-[200px]">Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Expected Start</TableHead>
                  <TableHead>Work Location</TableHead>
                  <TableHead>Reminder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedRecords.map((record) => {
                  const employee = record.employee;
                  if (!employee) return null;

                  return (
                    <TableRow key={record.id} className="hover:bg-muted/50">
                      <TableCell>
                        <OrgLink to={`/team/${employee.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                          <Avatar className="h-8 w-8 border-2 border-destructive/30">
                            <AvatarImage src={employee.profiles.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-destructive/10 text-destructive">
                              {getInitials(employee.profiles.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{employee.profiles.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{employee.position}</p>
                          </div>
                        </OrgLink>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{format(new Date(record.date), "EEE")}</span>
                          <span className="text-muted-foreground ml-1">{format(new Date(record.date), "MMM d, yyyy")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{record.expected_start_time ? formatTime(record.expected_start_time) : '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="capitalize">{record.work_location || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.reminder_sent ? (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};
