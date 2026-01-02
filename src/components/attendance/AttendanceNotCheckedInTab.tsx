import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, MapPin, Send, Check, Loader2, Users, ChevronDown, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { OrgLink } from "@/components/OrgLink";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EmployeeSchedule {
  work_start_time: string;
  work_end_time: string;
  work_location: string;
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

interface AttendanceNotCheckedInTabProps {
  selectedEmployees?: string[];
  onSelectedEmployeesChange?: (employees: string[]) => void;
}

export const AttendanceNotCheckedInTab = ({
  selectedEmployees: externalSelectedEmployees,
  onSelectedEmployeesChange,
}: AttendanceNotCheckedInTabProps) => {
  const [notCheckedIn, setNotCheckedIn] = useState<NotCheckedInEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());
  const { currentOrg } = useOrganization();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { data: currentEmployee } = useCurrentEmployee();
  const isMobile = useIsMobile();

  // Internal employee filter state (for popover)
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  
  // Use external state if provided, otherwise internal
  const selectedEmployees = externalSelectedEmployees ?? [];

  const canView = isOwner || isAdmin || isHR;
  const canSendReminder = isOwner || isAdmin || isHR;

  const loadNotCheckedIn = async () => {
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
            work_location
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

      const { data: onLeaveToday } = await supabase
        .from('leave_requests')
        .select('employee_id')
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

      const onLeaveIds = new Set(onLeaveToday?.map(l => l.employee_id) || []);
      const checkedInIds = new Set(checkedInToday?.map(r => r.employee_id) || []);
      const reminderSentIds = new Set(remindersToday?.map(r => r.employee_id) || []);
      
      setSentReminders(reminderSentIds);

      const currentTimeStr = formatInTimeZone(new Date(), orgTimezone, 'HH:mm:ss');

      const filtered = (employeesWithSchedule || []).filter(emp => {
        if (onLeaveIds.has(emp.id) || checkedInIds.has(emp.id)) {
          return false;
        }

        const scheduleData = emp.employee_schedules;
        const schedule = Array.isArray(scheduleData) ? scheduleData[0] : scheduleData;
        
        if (!schedule?.work_start_time) {
          return false;
        }

        return currentTimeStr >= schedule.work_start_time;
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

  useEffect(() => {
    if (!currentOrg?.id || !canView) return;
    
    const interval = setInterval(() => {
      loadNotCheckedIn();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [currentOrg?.id, canView]);

  useEffect(() => {
    if (!currentOrg?.id || !canView) return;

    const attendanceChannel = supabase
      .channel('not-checked-in-tab-attendance')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_records',
        filter: `organization_id=eq.${currentOrg.id}`
      }, loadNotCheckedIn)
      .subscribe();

    const leaveChannel = supabase
      .channel('not-checked-in-tab-leave')
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
  const employeesList = notCheckedIn.map(emp => ({
    id: emp.id,
    name: emp.profiles.full_name,
    avatarUrl: emp.profiles.avatar_url,
    position: emp.position,
  }));

  const filteredEmployeesList = employeeSearchQuery
    ? employeesList.filter(e => 
        e.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
        e.position.toLowerCase().includes(employeeSearchQuery.toLowerCase())
      )
    : employeesList;

  const employeeFilterLabel = selectedEmployees.length === 0 
    ? "All Employees" 
    : selectedEmployees.length === 1
      ? employeesList.find(e => e.id === selectedEmployees[0])?.name || "1 Employee"
      : `${selectedEmployees.length} Employees`;

  // Filter displayed employees based on selection
  const displayedEmployees = selectedEmployees.length > 0
    ? notCheckedIn.filter(emp => selectedEmployees.includes(emp.id))
    : notCheckedIn;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notCheckedIn.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-12">
        <Check className="h-12 w-12 text-green-500 mb-3" />
        <p className="text-muted-foreground font-medium">Everyone has checked in!</p>
        <p className="text-sm text-muted-foreground">All scheduled employees are present today</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      {onSelectedEmployeesChange && (
        <div className="flex items-center gap-2 flex-wrap">
          <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-[180px] h-10 justify-between bg-background">
                <div className="flex items-center gap-2 truncate">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{employeeFilterLabel}</span>
                </div>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput 
                  placeholder="Search employees..." 
                  value={employeeSearchQuery} 
                  onValueChange={setEmployeeSearchQuery} 
                />
                <CommandList>
                  <CommandEmpty>No employees found.</CommandEmpty>
                  <CommandGroup>
                    {employeesList.length > 1 && (
                      <div className="flex items-center justify-between px-2 py-1.5 border-b">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => onSelectedEmployeesChange(employeesList.map(e => e.id))}
                        >
                          Select All
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => onSelectedEmployeesChange([])}
                        >
                          Clear All
                        </Button>
                      </div>
                    )}
                    {filteredEmployeesList.map(employee => (
                      <CommandItem
                        key={employee.id}
                        value={employee.id}
                        onSelect={() => {
                          onSelectedEmployeesChange(
                            selectedEmployees.includes(employee.id)
                              ? selectedEmployees.filter(id => id !== employee.id)
                              : [...selectedEmployees, employee.id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Checkbox checked={selectedEmployees.includes(employee.id)} className="pointer-events-none" />
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={employee.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium truncate max-w-[160px]">{employee.name}</span>
                            {employee.position && (
                              <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                                {employee.position}
                              </span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <div className="text-sm text-muted-foreground">
            {displayedEmployees.length} {displayedEmployees.length === 1 ? 'person' : 'people'} not checked in
          </div>
        </div>
      )}

      {/* Content */}
      {isMobile ? (
        // Mobile Card View
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
        // Desktop Table View
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserMinus className="h-4 w-4 text-destructive" />
              <h2 className="font-semibold text-sm">Not Checked In</h2>
            </div>
            <Badge variant="destructive" className="text-xs">
              {displayedEmployees.length} {displayedEmployees.length === 1 ? 'person' : 'people'}
            </Badge>
          </div>
          
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
};

export default AttendanceNotCheckedInTab;
