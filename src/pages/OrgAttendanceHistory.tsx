import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OrgLink } from "@/components/OrgLink";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { useUserRole } from "@/hooks/useUserRole";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Clock, CheckCircle2, XCircle, CalendarIcon, Search, Users, X, Download, ExternalLink, Pencil, Trash2, Building2, Home, MapPin, Eye, TrendingUp, TrendingDown, Timer, LogOut, ClipboardList, UserMinus, Plane, FolderKanban, UserPlus, ChevronDown, FileText, FileSpreadsheet, Sparkles } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, subMonths, subDays, differenceInDays, isWithinInterval } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EditAttendanceDialog } from "@/components/dialogs/EditAttendanceDialog";
import { AddAttendanceDialog } from "@/components/dialogs/AddAttendanceDialog";
import { AttendanceReportScheduleDialog } from "@/components/dialogs/AttendanceReportScheduleDialog";
import { AttendancePDFExport } from "@/components/attendance/AttendancePDFExport";
import { useIsMobile } from "@/hooks/use-mobile";
import { AttendanceBulkActionsBar } from "@/components/attendance/AttendanceBulkActionsBar";
import AttendanceAnalyticsChart from "@/components/attendance/AttendanceAnalyticsChart";
interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  notes: string | null;
  work_hours: number | null;
  check_in_office_id: string | null;
}
type DateRangeOption = 'today' | 'last7days' | 'last14days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';
const OrgAttendanceHistory = () => {
  const {
    currentOrg
  } = useOrganization();
  const {
    isOwner,
    isAdmin,
    isHR,
    loading: roleLoading
  } = useUserRole();
  const {
    orgCode
  } = useOrgNavigation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeOption>('today');
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [workStatusFilter, setWorkStatusFilter] = useState<string>("all");
  const [officeFilter, setOfficeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    record: any | null;
  }>({
    open: false,
    record: null
  });
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [addAttendanceOpen, setAddAttendanceOpen] = useState(false);
  const [reportScheduleOpen, setReportScheduleOpen] = useState(false);

  // PDF Export handler
  const handleExportPDF = () => {
    window.print();
  };

  // Calculate date range based on filter option - use UTC dates to match database storage
  const dateRange = useMemo(() => {
    const now = new Date();
    // Create UTC-based "today" to match how attendance records are stored
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    switch (dateRangeFilter) {
      case 'today':
        return {
          start: todayUTC,
          end: todayUTC
        };
      case 'last7days':
        return {
          start: subDays(todayUTC, 6),
          end: todayUTC
        };
      case 'last14days':
        return {
          start: subDays(todayUTC, 13),
          end: todayUTC
        };
      case 'last30days':
        return {
          start: subDays(todayUTC, 29),
          end: todayUTC
        };
      case 'thisMonth':
        return {
          start: startOfMonth(todayUTC),
          end: endOfMonth(todayUTC)
        };
      case 'lastMonth':
        const lastMonth = subMonths(todayUTC, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case 'custom':
        return {
          start: customDateRange.from || todayUTC,
          end: customDateRange.to || todayUTC
        };
      default:
        return {
          start: todayUTC,
          end: todayUTC
        };
    }
  }, [dateRangeFilter, customDateRange]);
  const dateRangeLabel = useMemo(() => {
    switch (dateRangeFilter) {
      case 'today':
        return 'Today';
      case 'last7days':
        return 'Last 7 days';
      case 'last14days':
        return 'Last 14 days';
      case 'last30days':
        return 'Last 30 days';
      case 'thisMonth':
        return 'This Month';
      case 'lastMonth':
        return 'Last Month';
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          return `${format(customDateRange.from, "MMM d")} - ${format(customDateRange.to, "MMM d")}`;
        }
        return 'Custom';
      default:
        return 'Today';
    }
  }, [dateRangeFilter, customDateRange]);

  // Helper function to get schedule (handles both array and object structures)
  const getSchedule = (scheduleData: any) => {
    if (!scheduleData) return null;
    return Array.isArray(scheduleData) ? scheduleData[0] : scheduleData;
  };

  // Helper to format hours as "Xh Ym"
  const formatHoursMinutes = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  // Helper: Calculate break duration in hours from schedule
  const getBreakDuration = (scheduleData: any): number => {
    const schedule = getSchedule(scheduleData);
    if (!schedule?.break_start_time || !schedule?.break_end_time) return 1; // default 1 hour

    const [startH, startM] = schedule.break_start_time.split(':').map(Number);
    const [endH, endM] = schedule.break_end_time.split(':').map(Number);
    return (endH * 60 + endM - startH * 60 - startM) / 60;
  };

  // Helper: Calculate net hours (work_hours - break_duration)
  const getNetHours = (workHours: number | null, scheduleData: any): number => {
    if (!workHours) return 0;
    const breakDuration = getBreakDuration(scheduleData);
    return Math.max(0, workHours - breakDuration);
  };

  // Helper: Calculate expected net hours from schedule
  const getExpectedNetHours = (scheduleData: any): number => {
    const schedule = getSchedule(scheduleData);
    if (!schedule?.work_start_time || !schedule?.work_end_time) return 8; // default 8 hours

    const [startH, startM] = schedule.work_start_time.split(':').map(Number);
    const [endH, endM] = schedule.work_end_time.split(':').map(Number);
    const totalWorkHours = (endH * 60 + endM - startH * 60 - startM) / 60;
    const breakDuration = getBreakDuration(scheduleData);
    return totalWorkHours - breakDuration;
  };

  // Helper: Get time variance status comparing actual vs expected net hours
  const getTimeVariance = (workHours: number | null, scheduleData: any) => {
    const netHours = getNetHours(workHours, scheduleData);
    const expectedHours = getExpectedNetHours(scheduleData);
    const diffMinutes = Math.round((netHours - expectedHours) * 60);
    if (Math.abs(diffMinutes) <= 5) {
      return {
        status: 'onTime' as const,
        diff: null
      };
    } else if (diffMinutes > 0) {
      return {
        status: 'overTime' as const,
        diff: `+${diffMinutes}m`
      };
    } else {
      return {
        status: 'belowTime' as const,
        diff: `${diffMinutes}m`
      };
    }
  };

  // Helper function to check if check-in is late
  const isLateArrival = (record: any, scheduleData: any) => {
    if (!record.check_in_time || !scheduleData) return false;
    const schedule = getSchedule(scheduleData);
    if (!schedule?.work_start_time || schedule.late_threshold_minutes === null || schedule.late_threshold_minutes === undefined) return false;
    const checkInTime = new Date(record.check_in_time);
    const [startHours, startMinutes] = schedule.work_start_time.split(':').map(Number);
    const workStartWithThreshold = new Date(checkInTime);
    workStartWithThreshold.setHours(startHours, startMinutes + (schedule.late_threshold_minutes || 0), 0, 0);
    return checkInTime > workStartWithThreshold;
  };

  // Helper function to check if check-out is early
  const isEarlyDeparture = (record: any, scheduleData: any) => {
    if (!record.check_out_time || !scheduleData) return false;
    const schedule = getSchedule(scheduleData);
    if (!schedule?.work_end_time) return false;
    const checkOutTime = new Date(record.check_out_time);
    const [endHours, endMinutes] = schedule.work_end_time.split(':').map(Number);
    const workEndTime = new Date(checkOutTime);
    workEndTime.setHours(endHours, endMinutes, 0, 0);
    return checkOutTime < workEndTime;
  };

  // Helper to get work location from schedule
  const getWorkLocation = (scheduleData: any) => {
    const schedule = getSchedule(scheduleData);
    return schedule?.work_location;
  };

  // Fetch all attendance records for the organization with office data and employee schedule
  const {
    data: records,
    isLoading
  } = useQuery({
    queryKey: ["org-attendance", currentOrg?.id, format(dateRange.start, "yyyy-MM-dd"), format(dateRange.end, "yyyy-MM-dd"), statusFilter, departmentFilter],
    queryFn: async () => {
      let query = supabase.from("attendance_records").select(`
          *,
          employee:employees!attendance_records_employee_id_fkey(
            id,
            department,
            position,
            office_id,
            profiles!inner(full_name, avatar_url),
            employee_schedules(work_location, work_start_time, work_end_time, late_threshold_minutes, break_start_time, break_end_time),
            office:offices!employees_office_id_fkey(
              id,
              name,
              city,
              country
            )
          ),
          check_in_office:offices!attendance_records_check_in_office_id_fkey(
            id,
            name,
            city,
            country
          )
        `).eq("organization_id", currentOrg!.id).gte("date", format(dateRange.start, "yyyy-MM-dd")).lte("date", format(dateRange.end, "yyyy-MM-dd")).order("date", {
        ascending: false
      });
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id && !roleLoading && (isOwner || isAdmin || isHR)
  });

  // Calculate previous period based on current filter
  const previousPeriod = useMemo(() => {
    const diff = differenceInDays(dateRange.end, dateRange.start) + 1;
    return {
      start: subDays(dateRange.start, diff),
      end: subDays(dateRange.end, diff)
    };
  }, [dateRange]);

  // Fetch previous period attendance for comparison
  const { data: previousRecords } = useQuery({
    queryKey: ["org-attendance-previous", currentOrg?.id, format(previousPeriod.start, "yyyy-MM-dd"), format(previousPeriod.end, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          *,
          employee:employees!attendance_records_employee_id_fkey(
            id,
            employee_schedules(work_location, work_start_time, work_end_time, late_threshold_minutes, break_start_time, break_end_time)
          )
        `)
        .eq("organization_id", currentOrg!.id)
        .gte("date", format(previousPeriod.start, "yyyy-MM-dd"))
        .lte("date", format(previousPeriod.end, "yyyy-MM-dd"));

      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id && !roleLoading && (isOwner || isAdmin || isHR)
  });

  // Fetch active employees for missing calculation
  const { data: activeEmployees } = useQuery({
    queryKey: ["active-employees-count", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id")
        .eq("organization_id", currentOrg!.id)
        .eq("status", "active");

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id
  });

  // Fetch approved leave for the selected period
  const { data: leaveRecords } = useQuery({
    queryKey: ["leave-for-period", currentOrg?.id, format(dateRange.start, "yyyy-MM-dd"), format(dateRange.end, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("employee_id, start_date, end_date")
        .eq("organization_id", currentOrg!.id)
        .eq("status", "approved")
        .lte("start_date", format(dateRange.end, "yyyy-MM-dd"))
        .gte("end_date", format(dateRange.start, "yyyy-MM-dd"));

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id
  });

  // Fetch projects for filter
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", currentOrg.id)
        .order("name");
      return data || [];
    },
    enabled: !!currentOrg?.id
  });

  // Fetch employee-project mappings
  const { data: employeeProjects = [] } = useQuery({
    queryKey: ["employee-projects", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data } = await supabase
        .from("employee_projects")
        .select("employee_id, project_id")
        .eq("organization_id", currentOrg.id);
      return data || [];
    },
    enabled: !!currentOrg?.id
  });

  // Only owner, admin, and HR can access org-wide attendance history
  if (!roleLoading && !isOwner && !isAdmin && !isHR) {
    return <Navigate to={`/org/${orgCode}`} replace />;
  }

  // Get unique departments for filter
  const departments = useMemo(() => {
    if (!records) return [];
    const depts = new Set(records.map(r => (r.employee as any)?.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [records]);

  // Get unique offices for filter
  const offices = useMemo(() => {
    if (!records) return [];
    const officeMap = new Map<string, string>();
    records.forEach(r => {
      const office = r.check_in_office as any;
      if (office?.id && office?.name) {
        officeMap.set(office.id, office.name);
      }
    });
    return Array.from(officeMap.entries()).map(([id, name]) => ({
      id,
      name
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  // Filter records
  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return records.filter(record => {
      const employee = record.employee as any;
      const employeeName = employee?.profiles?.full_name?.toLowerCase() || "";
      const schedule = getSchedule(employee?.employee_schedules);
      const workLocation = schedule?.work_location || 'office';
      
      const matchesSearch = employeeName.includes(searchQuery.toLowerCase());
      const matchesDepartment = departmentFilter === "all" || employee?.department === departmentFilter;

      // Work Status filter (matches Work Schedule card + WFH)
      let matchesWorkStatus = true;
      if (workStatusFilter === "office") {
        matchesWorkStatus = workLocation === 'office';
      } else if (workStatusFilter === "remote") {
        matchesWorkStatus = workLocation === 'remote' || record.status === 'remote';
      } else if (workStatusFilter === "hybrid") {
        matchesWorkStatus = workLocation === 'hybrid';
      } else if (workStatusFilter === "wfh") {
        matchesWorkStatus = record.status === 'remote' || workLocation === 'remote';
      }

      // Office filter
      let matchesOffice = true;
      if (officeFilter !== "all") {
        matchesOffice = record.check_in_office_id === officeFilter || employee?.office_id === officeFilter;
      }

      // Projects filter
      let matchesProject = true;
      if (projectFilter !== "all") {
        const employeeProjectIds = employeeProjects
          .filter(ep => ep.employee_id === record.employee_id)
          .map(ep => ep.project_id);
        matchesProject = employeeProjectIds.includes(projectFilter);
      }

      return matchesSearch && matchesDepartment && matchesWorkStatus && matchesOffice && matchesProject;
    });
  }, [records, searchQuery, departmentFilter, workStatusFilter, officeFilter, projectFilter, employeeProjects]);
  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      present: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      late: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      half_day: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      remote: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
    };
    return <Badge className={cn("font-medium text-xs", variants[status] || "")}>
        {status.replace("_", " ")}
      </Badge>;
  };
  const getLocationDisplay = (record: any) => {
    const office = record.check_in_office as any;
    const employee = record.employee as any;
    const employeeOffice = employee?.office as any;

    // Remote/WFH check-in - show stored location name
    if (record.status === "remote") {
      const locationName = record.check_in_location_name;
      if (!locationName) {
        return <span className="text-sm text-muted-foreground/50">—</span>;
      }
      return <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-sm truncate max-w-[150px]" title={locationName}>{locationName}</span>
        </div>;
    }

    // Office check-in - show city, country
    if (office?.name) {
      const locationParts = [office.city, office.country].filter(Boolean);
      const locationText = locationParts.length > 0 ? locationParts.join(", ") : office.name;
      return <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-sm truncate max-w-[150px]" title={locationText}>{locationText}</span>
        </div>;
    }

    // Fallback for older records: show employee's assigned office (if available)
    if (employeeOffice?.name) {
      const locationParts = [employeeOffice.city, employeeOffice.country].filter(Boolean);
      const locationText = locationParts.length > 0 ? locationParts.join(", ") : employeeOffice.name;
      return <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-sm truncate max-w-[150px]" title={locationText}>{locationText}</span>
        </div>;
    }

    // Default: show dash
    return <span className="text-sm text-muted-foreground/50">—</span>;
  };
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Helper: Calculate late arrival duration in minutes
  const getLateMinutes = (record: any, scheduleData: any): number => {
    if (!record.check_in_time || !scheduleData) return 0;
    const schedule = getSchedule(scheduleData);
    if (!schedule?.work_start_time) return 0;
    
    const checkInTime = new Date(record.check_in_time);
    const [startH, startM] = schedule.work_start_time.split(':').map(Number);
    const expectedStart = new Date(checkInTime);
    expectedStart.setHours(startH, startM + (schedule.late_threshold_minutes || 0), 0, 0);
    
    const diff = (checkInTime.getTime() - expectedStart.getTime()) / (1000 * 60);
    return Math.max(0, diff);
  };

  // Helper: Calculate early checkout duration in minutes
  const getEarlyMinutes = (record: any, scheduleData: any): number => {
    if (!record.check_out_time || !scheduleData) return 0;
    const schedule = getSchedule(scheduleData);
    if (!schedule?.work_end_time) return 0;
    
    const checkOutTime = new Date(record.check_out_time);
    const [endH, endM] = schedule.work_end_time.split(':').map(Number);
    const expectedEnd = new Date(checkOutTime);
    expectedEnd.setHours(endH, endM, 0, 0);
    
    const diff = (expectedEnd.getTime() - checkOutTime.getTime()) / (1000 * 60);
    return Math.max(0, diff);
  };

  // Helper: Format minutes as "Xh Ym"
  const formatMinutes = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // Helper: Calculate percentage change
  const calcChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Get employees on leave for the date range
  const employeesOnLeave = useMemo(() => {
    if (!leaveRecords) return new Set<string>();
    return new Set(leaveRecords.map(l => l.employee_id));
  }, [leaveRecords]);

  // Calculate enhanced stats with 8 metrics
  const stats = useMemo(() => {
    if (!filteredRecords) return null;
    
    const total = filteredRecords.length;
    
    // Calculate missing employees (active - checked in - on leave)
    const checkedInEmployeeIds = new Set(filteredRecords.map(r => r.employee_id));
    const missingCount = (activeEmployees || []).filter(e => 
      !checkedInEmployeeIds.has(e.id) && !employeesOnLeave.has(e.id)
    ).length;
    
    // Late arrivals with duration
    const lateRecords = filteredRecords.filter(r => {
      const employee = r.employee as any;
      return isLateArrival(r, employee?.employee_schedules);
    });
    const totalLateDuration = lateRecords.reduce((sum, r) => {
      const employee = r.employee as any;
      return sum + getLateMinutes(r, employee?.employee_schedules);
    }, 0);
    
    // Early checkouts with duration
    const earlyRecords = filteredRecords.filter(r => {
      const employee = r.employee as any;
      return isEarlyDeparture(r, employee?.employee_schedules);
    });
    const totalEarlyDuration = earlyRecords.reduce((sum, r) => {
      const employee = r.employee as any;
      return sum + getEarlyMinutes(r, employee?.employee_schedules);
    }, 0);
    
    // On Time (not late)
    const onTimeCount = filteredRecords.filter(r => {
      const employee = r.employee as any;
      return r.check_in_time && !isLateArrival(r, employee?.employee_schedules);
    }).length;
    
    // Below Time / Over Time
    const belowTimeRecords = filteredRecords.filter(r => {
      const employee = r.employee as any;
      return getTimeVariance(r.work_hours, employee?.employee_schedules).status === 'belowTime';
    });
    const belowTimeDuration = belowTimeRecords.reduce((sum, r) => {
      const employee = r.employee as any;
      const netHours = getNetHours(r.work_hours, employee?.employee_schedules);
      const expectedHours = getExpectedNetHours(employee?.employee_schedules);
      return sum + Math.max(0, (expectedHours - netHours) * 60);
    }, 0);
    
    const overTimeRecords = filteredRecords.filter(r => {
      const employee = r.employee as any;
      return getTimeVariance(r.work_hours, employee?.employee_schedules).status === 'overTime';
    });
    const overTimeDuration = overTimeRecords.reduce((sum, r) => {
      const employee = r.employee as any;
      const netHours = getNetHours(r.work_hours, employee?.employee_schedules);
      const expectedHours = getExpectedNetHours(employee?.employee_schedules);
      return sum + Math.max(0, (netHours - expectedHours) * 60);
    }, 0);
    
    // WFH count
    const wfhCount = filteredRecords.filter(r => r.status === 'remote').length;
    
    // Net Hours
    const totalNetHours = filteredRecords.reduce((sum, r) => {
      const employee = r.employee as any;
      return sum + getNetHours(r.work_hours, employee?.employee_schedules);
    }, 0);

    // Calculate previous period stats for comparison
    const prevLate = (previousRecords || []).filter(r => {
      const employee = r.employee as any;
      return isLateArrival(r, employee?.employee_schedules);
    }).length;
    
    const prevEarly = (previousRecords || []).filter(r => {
      const employee = r.employee as any;
      return isEarlyDeparture(r, employee?.employee_schedules);
    }).length;
    
    const prevOnTime = (previousRecords || []).filter(r => {
      const employee = r.employee as any;
      return r.check_in_time && !isLateArrival(r, employee?.employee_schedules);
    }).length;
    
    const prevBelowTime = (previousRecords || []).filter(r => {
      const employee = r.employee as any;
      return getTimeVariance(r.work_hours, employee?.employee_schedules).status === 'belowTime';
    }).length;
    
    const prevOverTime = (previousRecords || []).filter(r => {
      const employee = r.employee as any;
      return getTimeVariance(r.work_hours, employee?.employee_schedules).status === 'overTime';
    }).length;
    
    const prevWfh = (previousRecords || []).filter(r => r.status === 'remote').length;
    
    const prevNetHours = (previousRecords || []).reduce((sum, r) => {
      const employee = r.employee as any;
      return sum + getNetHours(r.work_hours, employee?.employee_schedules);
    }, 0);

    return {
      total,
      missing: missingCount,
      onLeave: employeesOnLeave.size,
      
      late: { 
        count: lateRecords.length, 
        duration: totalLateDuration, 
        change: calcChange(lateRecords.length, prevLate) 
      },
      early: { 
        count: earlyRecords.length, 
        duration: totalEarlyDuration, 
        change: calcChange(earlyRecords.length, prevEarly) 
      },
      onTime: { 
        count: onTimeCount, 
        change: calcChange(onTimeCount, prevOnTime) 
      },
      belowTime: { 
        count: belowTimeRecords.length, 
        duration: belowTimeDuration, 
        change: calcChange(belowTimeRecords.length, prevBelowTime) 
      },
      overTime: { 
        count: overTimeRecords.length, 
        duration: overTimeDuration, 
        change: calcChange(overTimeRecords.length, prevOverTime) 
      },
      wfh: { 
        count: wfhCount, 
        change: calcChange(wfhCount, prevWfh) 
      },
      netHours: { 
        total: totalNetHours, 
        change: calcChange(Math.round(totalNetHours), Math.round(prevNetHours)) 
      }
    };
  }, [filteredRecords, previousRecords, activeEmployees, employeesOnLeave]);
  const dateRangeOptions: {
    value: DateRangeOption;
    label: string;
  }[] = [{
    value: 'today',
    label: 'Today'
  }, {
    value: 'last7days',
    label: 'Last 7 days'
  }, {
    value: 'last14days',
    label: 'Last 14 days'
  }, {
    value: 'last30days',
    label: 'Last 30 days'
  }, {
    value: 'thisMonth',
    label: 'This Month'
  }, {
    value: 'lastMonth',
    label: 'Last Month'
  }, {
    value: 'custom',
    label: 'Custom Range'
  }];

  // Bulk selection handlers
  const allSelected = filteredRecords.length > 0 && selectedRecords.size === filteredRecords.length;
  const someSelected = selectedRecords.size > 0 && selectedRecords.size < filteredRecords.length;
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
    }
  };
  const toggleSelectRecord = (id: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecords(newSelected);
  };

  // Export CSV with Location column
  const exportCSV = () => {
    const dataToExport = selectedRecords.size > 0 ? filteredRecords.filter(r => selectedRecords.has(r.id)) : filteredRecords;
    const headers = ["Employee", "Position", "Department", "Date", "Check In", "Check Out", "Net Hours", "Status", "Location"];
    const rows = dataToExport.map(record => {
      const employee = record.employee as any;
      const office = record.check_in_office as any;
      const location = record.status === "remote" ? "WFH" : office?.name || "Office";
      const netHours = getNetHours(record.work_hours, employee?.employee_schedules);
      return [employee?.profiles?.full_name || "", employee?.position || "", employee?.department || "", format(parseISO(record.date), "yyyy-MM-dd"), record.check_in_time ? format(new Date(record.check_in_time), "HH:mm") : "", record.check_out_time ? format(new Date(record.check_out_time), "HH:mm") : "", netHours.toFixed(2), record.status, location];
    });
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${format(dateRange.start, "yyyy-MM-dd")}-to-${format(dateRange.end, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${dataToExport.length} records`);
  };

  // Click on stat card to filter
  const handleStatClick = (status: string) => {
    setStatusFilter(status === statusFilter ? "all" : status);
  };

  // Delete handler
  const handleDeleteRecord = async () => {
    if (!deleteDialog.record) return;
    setDeleting(true);
    try {
      const {
        error
      } = await supabase.from("attendance_records").delete().eq("id", deleteDialog.record.id);
      if (error) throw error;
      toast.success("Attendance record deleted");
      queryClient.invalidateQueries({
        queryKey: ["org-attendance"]
      });
      setDeleteDialog({
        open: false,
        record: null
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete record");
    } finally {
      setDeleting(false);
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedRecords);
    setBulkDeleting(true);
    try {
      const {
        error
      } = await supabase.from("attendance_records").delete().in("id", selectedIds);
      if (error) throw error;
      toast.success(`Deleted ${selectedIds.length} attendance records`);
      setSelectedRecords(new Set());
      queryClient.invalidateQueries({
        queryKey: ["org-attendance"]
      });
      setBulkDeleteDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete records");
    } finally {
      setBulkDeleting(false);
    }
  };

  // Mobile Card Component
  const MobileRecordCard = ({
    record
  }: {
    record: any;
  }) => {
    const employee = record.employee as any;
    const isSelected = selectedRecords.has(record.id);
    return <Card className={cn("p-4 transition-all active:scale-[0.98]", isSelected && "bg-primary/5 border-primary/30")}>
        <div className="flex items-start gap-3">
          {(isOwner || isAdmin) && <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectRecord(record.id)} className="mt-1" />}
          <div className="flex-1 min-w-0">
            {/* Header: Employee + Location */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <OrgLink to={`/team/${employee?.id}`} className="flex items-center gap-2.5 min-w-0">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={employee?.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(employee?.profiles?.full_name || "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm truncate">{employee?.profiles?.full_name}</p>
                    {record.status === "remote" ? <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-accent/50 text-accent-foreground shrink-0">
                        <Home className="h-2 w-2 mr-0.5" />WFH
                      </Badge> : record.check_in_office_id ? <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-primary/10 text-primary shrink-0">
                        <Building2 className="h-2 w-2 mr-0.5" />Office
                      </Badge> : getWorkLocation(employee?.employee_schedules) ? <Badge variant="secondary" className={cn("text-[8px] px-1 py-0 h-3.5 shrink-0", getWorkLocation(employee?.employee_schedules) === "remote" ? "bg-accent/50 text-accent-foreground" : getWorkLocation(employee?.employee_schedules) === "hybrid" ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary")}>
                        {getWorkLocation(employee?.employee_schedules) === "remote" ? <><Home className="h-2 w-2 mr-0.5" />Remote</> : getWorkLocation(employee?.employee_schedules) === "hybrid" ? <><Building2 className="h-2 w-2 mr-0.5" />Hybrid</> : <><Building2 className="h-2 w-2 mr-0.5" />Office</>}
                      </Badge> : record.status === "present" ? <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-primary/10 text-primary shrink-0">
                        <Building2 className="h-2 w-2 mr-0.5" />Office
                      </Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{employee?.position}</p>
                </div>
              </OrgLink>
              {getLocationDisplay(record)}
            </div>
            
            {/* Date + Time Row */}
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{format(parseISO(record.date), "EEE, MMM d")}</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-medium">{formatHoursMinutes(getNetHours(record.work_hours, employee?.employee_schedules))}</span>
                {record.work_hours && (() => {
                const variance = getTimeVariance(record.work_hours, employee?.employee_schedules);
                if (variance.status === 'onTime') {
                  return <Badge className="text-[8px] px-1 py-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        On Time
                      </Badge>;
                } else if (variance.status === 'overTime') {
                  return <Badge className="text-[8px] px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Over Time {variance.diff}
                      </Badge>;
                } else {
                  return <Badge className="text-[8px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Below Time {variance.diff}
                      </Badge>;
                }
              })()}
              </div>
            </div>
            
            {/* Check In/Out + Status Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="font-medium">In:</span>
                    <span>{record.check_in_time ? format(new Date(record.check_in_time), "h:mm a") : "—"}</span>
                  </div>
                  {isLateArrival(record, employee?.employee_schedules) && <Badge className="w-fit text-[8px] px-1 py-0.5 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                      <Clock className="h-2 w-2 mr-0.5" />Late
                    </Badge>}
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span className="font-medium">Out:</span>
                    <span>{record.check_out_time ? format(new Date(record.check_out_time), "h:mm a") : "—"}</span>
                  </div>
                  {isEarlyDeparture(record, employee?.employee_schedules) && <Badge className="w-fit text-[8px] px-1 py-0.5 bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                      <Clock className="h-2 w-2 mr-0.5" />Early
                    </Badge>}
                </div>
              </div>
              {getStatusBadge(record.status)}
            </div>
            
            {/* Actions Row - only for Owner/Admin */}
            {(isOwner || isAdmin) && <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => setEditRecord({
              id: record.id,
              employee_id: record.employee_id,
              date: record.date,
              check_in_time: record.check_in_time,
              check_out_time: record.check_out_time,
              status: record.status,
              notes: record.notes,
              work_hours: record.work_hours,
              check_in_office_id: record.check_in_office_id
            })}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1 h-9 text-destructive hover:text-destructive" onClick={() => setDeleteDialog({
              open: true,
              record
            })}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>}
          </div>
        </div>
      </Card>;
  };
  return <div className="min-h-screen bg-background pb-24 md:pb-6">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="px-4 pt-4 md:px-0 md:pt-0 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 md:h-6 md:w-6" />
              Attendance History
            </h1>
            <p className="text-sm text-muted-foreground">View attendance records across the organization</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setReportScheduleOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI Email Reports
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setAddAttendanceOpen(true)} size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Attendance
            </Button>
          </div>
        </div>

        {/* Sticky Filter Bar */}
        <div className="px-4 md:px-0 sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 -mt-2 pt-2">
          <div className="flex items-center gap-2">
            {/* Search - expanded on left */}
            <div className="relative flex-1 min-w-[140px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employee..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-10" />
            </div>

            {/* Filters on right */}
            <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto scrollbar-hide">
              {/* Date Range Selector */}
              <Select value={dateRangeFilter} onValueChange={val => setDateRangeFilter(val as DateRangeOption)}>
                <SelectTrigger className="w-[145px] h-10">
                  <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <SelectValue>{dateRangeLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map(option => <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>

              {/* Custom Date Range Picker */}
              {dateRangeFilter === 'custom' && <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 px-3 gap-1.5">
                      <CalendarIcon className="h-4 w-4" />
                      <span className="text-sm">
                        {customDateRange.from && customDateRange.to ? `${format(customDateRange.from, "MMM d")} - ${format(customDateRange.to, "MMM d")}` : "Select dates"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="range" selected={{
                  from: customDateRange.from,
                  to: customDateRange.to
                }} onSelect={range => setCustomDateRange({
                  from: range?.from,
                  to: range?.to
                })} initialFocus className="pointer-events-auto" numberOfMonths={2} />
                  </PopoverContent>
                </Popover>}

              {/* Status Selector (Work Schedule type + WFH) */}
              <Select value={workStatusFilter} onValueChange={setWorkStatusFilter}>
                <SelectTrigger className="w-[140px] h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="office">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      Office
                    </div>
                  </SelectItem>
                  <SelectItem value="remote">
                    <div className="flex items-center gap-1.5">
                      <Home className="h-3.5 w-3.5 text-purple-600" />
                      Remote
                    </div>
                  </SelectItem>
                  <SelectItem value="hybrid">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-blue-600" />
                      Hybrid
                    </div>
                  </SelectItem>
                  <SelectItem value="wfh">
                    <div className="flex items-center gap-1.5">
                      <Home className="h-3.5 w-3.5 text-green-600" />
                      WFH
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Office Selector */}
              <Select value={officeFilter} onValueChange={setOfficeFilter}>
                <SelectTrigger className="w-[140px] h-10">
                  <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                  <SelectValue placeholder="Office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  {offices.map(office => (
                    <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Department Selector */}
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[160px] h-10">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Projects Selector */}
              {projects.length > 0 && (
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-[150px] h-10">
                    <FolderKanban className="h-4 w-4 mr-2 flex-shrink-0" />
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              {/* Mobile Export */}
              <Button onClick={exportCSV} variant="outline" size="icon" className="sm:hidden h-10 w-10">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards - 8 Metrics with Trend Indicators */}
        {stats && <div className="px-4 md:px-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
              {/* Total Records */}
              <Card className="p-3 md:p-4">
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <ClipboardList className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
                <div className="text-xl md:text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Total Records</div>
                <div className="text-[9px] md:text-[10px] text-muted-foreground/70 mt-0.5">
                  {stats.missing > 0 && <span className="text-amber-600">{stats.missing} missing</span>}
                  {stats.missing > 0 && stats.onLeave > 0 && " · "}
                  {stats.onLeave > 0 && <span className="text-blue-600">{stats.onLeave} on leave</span>}
                </div>
              </Card>

              {/* Late Arrivals */}
              <Card className="p-3 md:p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30">
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  {stats.late.change !== 0 && (
                    <div className={cn("flex items-center gap-0.5 text-[10px] font-medium", 
                      stats.late.change < 0 ? "text-green-600" : "text-red-600")}>
                      {stats.late.change < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                      {Math.abs(stats.late.change)}%
                    </div>
                  )}
                </div>
                <div className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.late.count}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Late Arrivals</div>
                {stats.late.duration > 0 && (
                  <div className="text-[9px] md:text-[10px] text-amber-600/70 mt-0.5">{formatMinutes(stats.late.duration)} total</div>
                )}
              </Card>

              {/* Early Checkouts */}
              <Card className="p-3 md:p-4 bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30">
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <LogOut className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  </div>
                  {stats.early.change !== 0 && (
                    <div className={cn("flex items-center gap-0.5 text-[10px] font-medium", 
                      stats.early.change < 0 ? "text-green-600" : "text-red-600")}>
                      {stats.early.change < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                      {Math.abs(stats.early.change)}%
                    </div>
                  )}
                </div>
                <div className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">{stats.early.count}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Early Checkouts</div>
                {stats.early.duration > 0 && (
                  <div className="text-[9px] md:text-[10px] text-red-600/70 mt-0.5">{formatMinutes(stats.early.duration)} total</div>
                )}
              </Card>

              {/* On Time */}
              <Card className="p-3 md:p-4 bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30">
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  {stats.onTime.change !== 0 && (
                    <div className={cn("flex items-center gap-0.5 text-[10px] font-medium", 
                      stats.onTime.change > 0 ? "text-green-600" : "text-red-600")}>
                      {stats.onTime.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(stats.onTime.change)}%
                    </div>
                  )}
                </div>
                <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{stats.onTime.count}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">On Time</div>
                {stats.total > 0 && (
                  <div className="text-[9px] md:text-[10px] text-green-600/70 mt-0.5">{Math.round((stats.onTime.count / stats.total) * 100)}% of check-ins</div>
                )}
              </Card>

              {/* Below Time */}
              <Card className="p-3 md:p-4 bg-orange-50/50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30">
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Timer className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  </div>
                  {stats.belowTime.change !== 0 && (
                    <div className={cn("flex items-center gap-0.5 text-[10px] font-medium", 
                      stats.belowTime.change < 0 ? "text-green-600" : "text-red-600")}>
                      {stats.belowTime.change < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                      {Math.abs(stats.belowTime.change)}%
                    </div>
                  )}
                </div>
                <div className="text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.belowTime.count}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Below Time</div>
                {stats.belowTime.duration > 0 && (
                  <div className="text-[9px] md:text-[10px] text-orange-600/70 mt-0.5">{formatMinutes(stats.belowTime.duration)} deficit</div>
                )}
              </Card>

              {/* Over Time */}
              <Card className="p-3 md:p-4 bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30">
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  {stats.overTime.change !== 0 && (
                    <div className={cn("flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground")}>
                      {stats.overTime.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(stats.overTime.change)}%
                    </div>
                  )}
                </div>
                <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.overTime.count}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Over Time</div>
                {stats.overTime.duration > 0 && (
                  <div className="text-[9px] md:text-[10px] text-blue-600/70 mt-0.5">{formatMinutes(stats.overTime.duration)} extra</div>
                )}
              </Card>

              {/* Net Hours */}
              <Card className="p-3 md:p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <Timer className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  {stats.netHours.change !== 0 && (
                    <div className={cn("flex items-center gap-0.5 text-[10px] font-medium", 
                      stats.netHours.change > 0 ? "text-green-600" : "text-red-600")}>
                      {stats.netHours.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(stats.netHours.change)}%
                    </div>
                  )}
                </div>
                <div className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatHoursMinutes(stats.netHours.total)}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Net Hours</div>
                {stats.total > 0 && (
                  <div className="text-[9px] md:text-[10px] text-indigo-600/70 mt-0.5">avg {formatHoursMinutes(stats.netHours.total / stats.total)}/person</div>
                )}
              </Card>

              {/* WFH */}
              <Card className="p-3 md:p-4 bg-purple-50/50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30">
                <div className="flex items-start justify-between mb-1">
                  <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Home className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  {stats.wfh.change !== 0 && (
                    <div className={cn("flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground")}>
                      {stats.wfh.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(stats.wfh.change)}%
                    </div>
                  )}
                </div>
                <div className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.wfh.count}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">WFH</div>
                {stats.total > 0 && (
                  <div className="text-[9px] md:text-[10px] text-purple-600/70 mt-0.5">{Math.round((stats.wfh.count / stats.total) * 100)}% of check-ins</div>
                )}
              </Card>
            </div>
          </div>}

        {/* Attendance Analytics Chart */}
        {records && records.length > 0 && dateRangeFilter !== 'today' && (
          <div className="px-4 md:px-0">
            <AttendanceAnalyticsChart
              records={records}
              dateRange={dateRange}
              dateRangeLabel={dateRangeLabel}
              getSchedule={getSchedule}
              isLateArrival={isLateArrival}
              isEarlyDeparture={isEarlyDeparture}
              getNetHours={getNetHours}
              getTimeVariance={getTimeVariance}
            />
          </div>
        )}


        {/* Records - Mobile Cards or Desktop Table */}
        <div className="px-4 md:px-0">
          {isLoading ? <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div> : filteredRecords.length === 0 ? <Card className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No attendance records found</p>
            </Card> : isMobile ?
        // Mobile Card View
        <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{filteredRecords.length} records</span>
                {(isOwner || isAdmin) && <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="h-8 text-xs">
                    {allSelected ? "Deselect All" : "Select All"}
                  </Button>}
              </div>
              {filteredRecords.map(record => <MobileRecordCard key={record.id} record={record} />)}
            </div> :
        // Desktop Table View
        <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <h2 className="font-semibold text-sm">Attendance Records</h2>
                <span className="text-xs text-muted-foreground">{filteredRecords.length} records</span>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      {(isOwner || isAdmin) && <TableHead className="w-[40px]">
                          <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" className={someSelected ? "data-[state=checked]:bg-primary/50" : ""} />
                        </TableHead>}
                      <TableHead className="min-w-[180px]">Employee</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Net Hours</TableHead>
                      
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map(record => {
                  const employee = record.employee as any;
                  const isSelected = selectedRecords.has(record.id);
                  return <TableRow key={record.id} className={cn("hover:bg-muted/50 transition-colors", isSelected && "bg-primary/5")}>
                          {(isOwner || isAdmin) && <TableCell>
                              <Checkbox checked={isSelected} onCheckedChange={() => toggleSelectRecord(record.id)} aria-label={`Select ${employee?.profiles?.full_name}`} />
                            </TableCell>}
                          <TableCell>
                            <OrgLink to={`/team/${employee?.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={employee?.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(employee?.profiles?.full_name || "?")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{employee?.profiles?.full_name}</p>
                                  {record.status === "remote" ? <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-accent/50 text-accent-foreground shrink-0">
                                      <Home className="h-2.5 w-2.5 mr-0.5" />WFH
                                    </Badge> : record.check_in_office_id ? <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary shrink-0">
                                      <Building2 className="h-2.5 w-2.5 mr-0.5" />Office
                                    </Badge> : getWorkLocation(employee?.employee_schedules) ? <Badge variant="secondary" className={cn("text-[9px] px-1.5 py-0 h-4 shrink-0", getWorkLocation(employee?.employee_schedules) === "remote" ? "bg-accent/50 text-accent-foreground" : getWorkLocation(employee?.employee_schedules) === "hybrid" ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary")}>
                                      {getWorkLocation(employee?.employee_schedules) === "remote" ? <><Home className="h-2.5 w-2.5 mr-0.5" />Remote</> : getWorkLocation(employee?.employee_schedules) === "hybrid" ? <><Building2 className="h-2.5 w-2.5 mr-0.5" />Hybrid</> : <><Building2 className="h-2.5 w-2.5 mr-0.5" />Office</>}
                                    </Badge> : record.status === "present" ? <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary shrink-0">
                                      <Building2 className="h-2.5 w-2.5 mr-0.5" />Office
                                    </Badge> : null}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{employee?.position}</p>
                              </div>
                            </OrgLink>
                          </TableCell>
                          <TableCell>{getLocationDisplay(record)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="font-medium">{format(parseISO(record.date), "EEE")}</span>
                              <span className="text-muted-foreground ml-1">{format(parseISO(record.date), "MMM d")}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-sm">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                <span>{record.check_in_time ? format(new Date(record.check_in_time), "h:mm a") : "—"}</span>
                              </div>
                              {isLateArrival(record, employee?.employee_schedules) && <Badge className="w-fit text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                                  <Clock className="h-2.5 w-2.5 mr-1" />
                                  Late Arrival
                                </Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-sm">
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                                <span>{record.check_out_time ? format(new Date(record.check_out_time), "h:mm a") : "—"}</span>
                              </div>
                              {isEarlyDeparture(record, employee?.employee_schedules) && <Badge className="w-fit text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                                  <Clock className="h-2.5 w-2.5 mr-1" />
                                  Early Checkout 
                                </Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{formatHoursMinutes(getNetHours(record.work_hours, employee?.employee_schedules))}</span>
                                {record.work_hours && <div className="hidden lg:block w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full", getNetHours(record.work_hours, employee?.employee_schedules) >= getExpectedNetHours(employee?.employee_schedules) ? "bg-green-500" : getNetHours(record.work_hours, employee?.employee_schedules) >= getExpectedNetHours(employee?.employee_schedules) * 0.9 ? "bg-yellow-500" : "bg-red-500")} style={{
                              width: `${Math.min(100, getNetHours(record.work_hours, employee?.employee_schedules) / getExpectedNetHours(employee?.employee_schedules) * 100)}%`
                            }} />
                                  </div>}
                              </div>
                              {record.work_hours && (() => {
                          const variance = getTimeVariance(record.work_hours, employee?.employee_schedules);
                          if (variance.status === 'onTime') {
                            return <Badge className="w-fit text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                      On Time
                                    </Badge>;
                          } else if (variance.status === 'overTime') {
                            return <Badge className="w-fit text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                      Over Time {variance.diff}
                                    </Badge>;
                          } else {
                            return <Badge className="w-fit text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                      Below Time {variance.diff}
                                    </Badge>;
                          }
                        })()}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <TooltipProvider>
                              <div className="flex items-center gap-0.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <OrgLink to={`/team/${employee?.id}/attendance`}>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                    </OrgLink>
                                  </TooltipTrigger>
                                  <TooltipContent>View Attendance History</TooltipContent>
                                </Tooltip>
                                
                                {(isOwner || isAdmin) && <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditRecord({
                                  id: record.id,
                                  employee_id: record.employee_id,
                                  date: record.date,
                                  check_in_time: record.check_in_time,
                                  check_out_time: record.check_out_time,
                                  status: record.status,
                                  notes: record.notes,
                                  work_hours: record.work_hours,
                                  check_in_office_id: record.check_in_office_id
                                })}>
                                          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Edit</TooltipContent>
                                    </Tooltip>
                                    
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteDialog({
                                  open: true,
                                  record
                                })}>
                                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Delete</TooltipContent>
                                    </Tooltip>
                                  </>}
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>;
                })}
                  </TableBody>
                </Table>
              </div>
            </Card>}
        </div>
      </div>

      {/* Edit Attendance Dialog */}
      <EditAttendanceDialog open={!!editRecord} onOpenChange={open => !open && setEditRecord(null)} record={editRecord} employeeId={editRecord?.employee_id || ""} organizationId={currentOrg?.id || ""} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={open => !open && setDeleteDialog({
      open: false,
      record: null
    })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the attendance record for{" "}
              <span className="font-medium">{deleteDialog.record?.employee?.profiles?.full_name}</span> on{" "}
              <span className="font-medium">{deleteDialog.record?.date ? format(parseISO(deleteDialog.record.date), "MMM d, yyyy") : ""}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecord} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Records?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRecords.size} attendance records?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-destructive hover:bg-destructive/90">
              {bulkDeleting ? "Deleting..." : "Delete Records"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Bulk Actions Bar */}
      {selectedRecords.size > 0 && (isOwner || isAdmin) && <AttendanceBulkActionsBar selectedCount={selectedRecords.size} totalItems={filteredRecords.length} onSelectAll={() => setSelectedRecords(new Set(filteredRecords.map(r => r.id)))} onDeselectAll={() => setSelectedRecords(new Set())} onDelete={() => setBulkDeleteDialog(true)} onExport={exportCSV} canDelete={isOwner || isAdmin} />}

      {/* Add Attendance Dialog */}
      <AddAttendanceDialog
        open={addAttendanceOpen}
        onOpenChange={setAddAttendanceOpen}
      />

      {/* Auto Report Schedule Dialog */}
      <AttendanceReportScheduleDialog
        open={reportScheduleOpen}
        onOpenChange={setReportScheduleOpen}
      />
    </div>;
};
export default OrgAttendanceHistory;