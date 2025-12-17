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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  CalendarIcon, 
  Search,
  Users,
  X,
  Download,
  ExternalLink,
  Pencil,
  Trash2,
  Building2,
  Home,
  MapPin
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EditAttendanceDialog } from "@/components/dialogs/EditAttendanceDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { AttendanceBulkActionsBar } from "@/components/attendance/AttendanceBulkActionsBar";

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

const OrgAttendanceHistory = () => {
  const { currentOrg } = useOrganization();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { orgCode } = useOrgNavigation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; record: any | null }>({ open: false, record: null });
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // Fetch all attendance records for the organization with office data
  const { data: records, isLoading } = useQuery({
    queryKey: ["org-attendance", currentOrg?.id, format(monthStart, "yyyy-MM"), statusFilter, dateFilter, departmentFilter],
    queryFn: async () => {
      let query = supabase
        .from("attendance_records")
        .select(`
          *,
          employee:employees!attendance_records_employee_id_fkey(
            id,
            department,
            position,
            profiles!inner(full_name, avatar_url)
          ),
          check_in_office:offices!attendance_records_check_in_office_id_fkey(
            id,
            name,
            city,
            country
          )
        `)
        .eq("organization_id", currentOrg!.id)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .order("date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (dateFilter) {
        query = query.eq("date", format(dateFilter, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id && !roleLoading && (isOwner || isAdmin || isHR),
  });

  // Only owner, admin, and HR can access org-wide attendance history
  if (!roleLoading && !isOwner && !isAdmin && !isHR) {
    return <Navigate to={`/org/${orgCode}`} replace />;
  }

  // Get unique departments for filter
  const departments = useMemo(() => {
    if (!records) return [];
    const depts = new Set(records.map((r) => (r.employee as any)?.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [records]);

  // Get unique offices for filter
  const offices = useMemo(() => {
    if (!records) return [];
    const officeMap = new Map<string, string>();
    records.forEach((r) => {
      const office = r.check_in_office as any;
      if (office?.id && office?.name) {
        officeMap.set(office.id, office.name);
      }
    });
    return Array.from(officeMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  // Filter records
  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return records.filter((record) => {
      const employee = record.employee as any;
      const employeeName = employee?.profiles?.full_name?.toLowerCase() || "";
      const matchesSearch = employeeName.includes(searchQuery.toLowerCase());
      const matchesDepartment = departmentFilter === "all" || employee?.department === departmentFilter;
      
      // Location filter
      let matchesLocation = true;
      if (locationFilter === "wfh") {
        matchesLocation = record.status === "remote" || (!record.check_in_office_id && record.status !== "absent");
      } else if (locationFilter !== "all") {
        matchesLocation = record.check_in_office_id === locationFilter;
      }
      
      return matchesSearch && matchesDepartment && matchesLocation;
    });
  }, [records, searchQuery, departmentFilter, locationFilter]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      present: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      late: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      half_day: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      remote: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    };
    return (
      <Badge className={cn("font-medium text-xs", variants[status] || "")}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getLocationDisplay = (record: any) => {
    const office = record.check_in_office as any;
    
    // Remote/WFH check-in - show stored location name (address only)
    if (record.status === "remote" || (!record.check_in_office_id && record.status !== "absent")) {
      const locationName = record.check_in_location_name;
      if (!locationName) {
        return <span className="text-sm text-muted-foreground/50">—</span>;
      }
      return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-sm truncate max-w-[150px]" title={locationName}>{locationName}</span>
        </div>
      );
    }
    
    // Office check-in - show city, country
    if (office?.name) {
      const locationParts = [office.city, office.country].filter(Boolean);
      const locationText = locationParts.length > 0 ? locationParts.join(", ") : office.name;
      return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-sm truncate max-w-[150px]" title={locationText}>{locationText}</span>
        </div>
      );
    }
    
    // Absent or no location
    return <span className="text-sm text-muted-foreground/50">—</span>;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!filteredRecords) return null;
    return {
      total: filteredRecords.length,
      present: filteredRecords.filter((r) => r.status === "present").length,
      absent: filteredRecords.filter((r) => r.status === "absent").length,
      late: filteredRecords.filter((r) => r.status === "late").length,
      totalHours: filteredRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0),
    };
  }, [filteredRecords]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return { label: format(date, "MMMM yyyy"), value: date };
  });

  // Bulk selection handlers
  const allSelected = filteredRecords.length > 0 && selectedRecords.size === filteredRecords.length;
  const someSelected = selectedRecords.size > 0 && selectedRecords.size < filteredRecords.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map((r) => r.id)));
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
    const dataToExport = selectedRecords.size > 0 
      ? filteredRecords.filter((r) => selectedRecords.has(r.id))
      : filteredRecords;

    const headers = ["Employee", "Position", "Department", "Date", "Check In", "Check Out", "Work Hours", "Status", "Location"];
    const rows = dataToExport.map((record) => {
      const employee = record.employee as any;
      const office = record.check_in_office as any;
      const location = record.status === "remote" ? "WFH" : (office?.name || "Office");
      return [
        employee?.profiles?.full_name || "",
        employee?.position || "",
        employee?.department || "",
        format(parseISO(record.date), "yyyy-MM-dd"),
        record.check_in_time ? format(new Date(record.check_in_time), "HH:mm") : "",
        record.check_out_time ? format(new Date(record.check_out_time), "HH:mm") : "",
        record.work_hours?.toFixed(2) || "",
        record.status,
        location,
      ];
    });

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${format(selectedMonth, "yyyy-MM")}.csv`;
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
      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("id", deleteDialog.record.id);
      if (error) throw error;
      toast.success("Attendance record deleted");
      queryClient.invalidateQueries({ queryKey: ["org-attendance"] });
      setDeleteDialog({ open: false, record: null });
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
      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .in("id", selectedIds);
      if (error) throw error;
      toast.success(`Deleted ${selectedIds.length} attendance records`);
      setSelectedRecords(new Set());
      queryClient.invalidateQueries({ queryKey: ["org-attendance"] });
      setBulkDeleteDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete records");
    } finally {
      setBulkDeleting(false);
    }
  };

  // Mobile Card Component
  const MobileRecordCard = ({ record }: { record: any }) => {
    const employee = record.employee as any;
    const isSelected = selectedRecords.has(record.id);
    
    return (
      <Card 
        className={cn(
          "p-4 transition-all active:scale-[0.98]",
          isSelected && "bg-primary/5 border-primary/30"
        )}
      >
        <div className="flex items-start gap-3">
          {(isOwner || isAdmin) && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleSelectRecord(record.id)}
              className="mt-1"
            />
          )}
          <div className="flex-1 min-w-0">
            {/* Header: Employee + Location */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <OrgLink 
                to={`/team/${employee?.id}`}
                className="flex items-center gap-2.5 min-w-0"
              >
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src={employee?.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(employee?.profiles?.full_name || "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm truncate">{employee?.profiles?.full_name}</p>
                    {record.status === "remote" ? (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                        <Home className="h-2 w-2 mr-0.5" />WFH
                      </Badge>
                    ) : record.check_in_office_id && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                        <Building2 className="h-2 w-2 mr-0.5" />Office
                      </Badge>
                    )}
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
              <span className="font-medium">{record.work_hours?.toFixed(1) || "0"}h</span>
            </div>
            
            {/* Check In/Out + Status Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>{record.check_in_time ? format(new Date(record.check_in_time), "h:mm a") : "—"}</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span>{record.check_out_time ? format(new Date(record.check_out_time), "h:mm a") : "—"}</span>
                </div>
              </div>
              {getStatusBadge(record.status)}
            </div>
            
            {/* Actions Row - only for Owner/Admin */}
            {(isOwner || isAdmin) && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 h-9"
                  onClick={() => setEditRecord({
                    id: record.id,
                    employee_id: record.employee_id,
                    date: record.date,
                    check_in_time: record.check_in_time,
                    check_out_time: record.check_out_time,
                    status: record.status,
                    notes: record.notes,
                    work_hours: record.work_hours,
                    check_in_office_id: record.check_in_office_id,
                  })}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 h-9 text-destructive hover:text-destructive"
                  onClick={() => setDeleteDialog({ open: true, record })}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
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
          <Button onClick={exportCSV} variant="outline" size="sm" className="hidden sm:flex gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Sticky Filter Bar */}
        <div className="px-4 md:px-0 sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 -mt-2 pt-2">
          <div className="flex flex-col gap-2">
            {/* Search Row */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            
            {/* Filters Row - Scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {/* Month Selector */}
              <Select 
                value={format(selectedMonth, "yyyy-MM")} 
                onValueChange={(val) => {
                  const [year, month] = val.split("-");
                  setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
                }}
              >
                <SelectTrigger className="w-[130px] h-10 flex-shrink-0">
                  <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={format(month.value, "yyyy-MM")} value={format(month.value, "yyyy-MM")}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Location Selector */}
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[110px] h-10 flex-shrink-0">
                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="wfh">
                    <div className="flex items-center gap-1.5">
                      <Home className="h-3.5 w-3.5" />
                      WFH
                    </div>
                  </SelectItem>
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {office.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Department Selector */}
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[110px] h-10 flex-shrink-0">
                  <SelectValue placeholder="Dept" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depts</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Selector */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[100px] h-10 flex-shrink-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "h-10 px-3 gap-2 flex-shrink-0",
                      dateFilter && "bg-primary/10 border-primary/30"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-sm">{dateFilter ? format(dateFilter, "MMM d") : "Date"}</span>
                    {dateFilter && (
                      <X 
                        className="h-3.5 w-3.5 opacity-60 hover:opacity-100" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDateFilter(undefined);
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Mobile Export */}
              <Button onClick={exportCSV} variant="outline" size="icon" className="sm:hidden h-10 w-10 flex-shrink-0">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards - Clickable Filters */}
        {stats && (
          <div className="px-4 md:px-0">
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 md:grid md:grid-cols-5 md:gap-3 scrollbar-hide">
              <Card 
                className={cn(
                  "flex-shrink-0 w-[100px] md:w-auto p-3 md:p-4 text-center cursor-pointer transition-all active:scale-95 hover:scale-[1.02]",
                  statusFilter === "all" ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20" : "bg-muted/30"
                )}
                onClick={() => handleStatClick("all")}
              >
                <div className="text-lg md:text-2xl font-bold text-primary">{stats.total}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Records</div>
              </Card>
              <Card 
                className={cn(
                  "flex-shrink-0 w-[100px] md:w-auto p-3 md:p-4 text-center cursor-pointer transition-all active:scale-95 hover:scale-[1.02]",
                  statusFilter === "present" ? "ring-1 ring-green-500/30" : "",
                  "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900/50"
                )}
                onClick={() => handleStatClick("present")}
              >
                <div className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">{stats.present}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Present</div>
              </Card>
              <Card 
                className={cn(
                  "flex-shrink-0 w-[100px] md:w-auto p-3 md:p-4 text-center cursor-pointer transition-all active:scale-95 hover:scale-[1.02]",
                  statusFilter === "late" ? "ring-1 ring-yellow-500/30" : "",
                  "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-100 dark:border-yellow-900/50"
                )}
                onClick={() => handleStatClick("late")}
              >
                <div className="text-lg md:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.late}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Late</div>
              </Card>
              <Card 
                className={cn(
                  "flex-shrink-0 w-[100px] md:w-auto p-3 md:p-4 text-center cursor-pointer transition-all active:scale-95 hover:scale-[1.02]",
                  statusFilter === "absent" ? "ring-1 ring-red-500/30" : "",
                  "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50"
                )}
                onClick={() => handleStatClick("absent")}
              >
                <div className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Absent</div>
              </Card>
              <Card className="flex-shrink-0 w-[100px] md:w-auto p-3 md:p-4 text-center bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50">
                <div className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalHours.toFixed(1)}h</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Hours</div>
              </Card>
            </div>
          </div>
        )}


        {/* Records - Mobile Cards or Desktop Table */}
        <div className="px-4 md:px-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No attendance records found</p>
            </Card>
          ) : isMobile ? (
            // Mobile Card View
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{filteredRecords.length} records</span>
                {(isOwner || isAdmin) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleSelectAll}
                    className="h-8 text-xs"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </Button>
                )}
              </div>
              {filteredRecords.map((record) => (
                <MobileRecordCard key={record.id} record={record} />
              ))}
            </div>
          ) : (
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
                      {(isOwner || isAdmin) && (
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all"
                            className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                          />
                        </TableHead>
                      )}
                      <TableHead className="min-w-[180px]">Employee</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => {
                      const employee = record.employee as any;
                      const isSelected = selectedRecords.has(record.id);
                      return (
                        <TableRow 
                          key={record.id} 
                          className={cn(
                            "hover:bg-muted/50 transition-colors",
                            isSelected && "bg-primary/5"
                          )}
                        >
                          {(isOwner || isAdmin) && (
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectRecord(record.id)}
                                aria-label={`Select ${employee?.profiles?.full_name}`}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <OrgLink 
                              to={`/team/${employee?.id}`}
                              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={employee?.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(employee?.profiles?.full_name || "?")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{employee?.profiles?.full_name}</p>
                                  {record.status === "remote" ? (
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                                      <Home className="h-2.5 w-2.5 mr-0.5" />WFH
                                    </Badge>
                                  ) : record.check_in_office_id && (
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                                      <Building2 className="h-2.5 w-2.5 mr-0.5" />Office
                                    </Badge>
                                  )}
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
                            <div className="flex items-center gap-1.5 text-sm">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              <span>{record.check_in_time ? format(new Date(record.check_in_time), "h:mm a") : "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                              <span>{record.check_out_time ? format(new Date(record.check_out_time), "h:mm a") : "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{record.work_hours?.toFixed(1) || "0"}h</span>
                              {record.work_hours && (
                                <div className="hidden lg:block w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full",
                                      record.work_hours >= 8 ? "bg-green-500" : record.work_hours >= 6 ? "bg-yellow-500" : "bg-red-500"
                                    )}
                                    style={{ width: `${Math.min(100, (record.work_hours / 8) * 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <div className="flex items-center gap-0.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <OrgLink to={`/team/${employee?.id}`}>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                    </OrgLink>
                                  </TooltipTrigger>
                                  <TooltipContent>View Profile</TooltipContent>
                                </Tooltip>
                                
                                {(isOwner || isAdmin) && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7"
                                          onClick={() => setEditRecord({
                                            id: record.id,
                                            employee_id: record.employee_id,
                                            date: record.date,
                                            check_in_time: record.check_in_time,
                                            check_out_time: record.check_out_time,
                                            status: record.status,
                                            notes: record.notes,
                                            work_hours: record.work_hours,
                                            check_in_office_id: record.check_in_office_id,
                                          })}
                                        >
                                          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Edit</TooltipContent>
                                    </Tooltip>
                                    
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7"
                                          onClick={() => setDeleteDialog({ open: true, record })}
                                        >
                                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Delete</TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                              </div>
                            </TooltipProvider>
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
      </div>

      {/* Edit Attendance Dialog */}
      <EditAttendanceDialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        record={editRecord}
        employeeId={editRecord?.employee_id || ""}
        organizationId={currentOrg?.id || ""}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, record: null })}>
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
            <AlertDialogAction 
              onClick={handleDeleteRecord} 
              disabled={deleting} 
              className="bg-destructive hover:bg-destructive/90"
            >
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
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              disabled={bulkDeleting} 
              className="bg-destructive hover:bg-destructive/90"
            >
              {bulkDeleting ? "Deleting..." : "Delete Records"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Bulk Actions Bar */}
      {selectedRecords.size > 0 && (isOwner || isAdmin) && (
        <AttendanceBulkActionsBar
          selectedCount={selectedRecords.size}
          totalItems={filteredRecords.length}
          onSelectAll={() => setSelectedRecords(new Set(filteredRecords.map((r) => r.id)))}
          onDeselectAll={() => setSelectedRecords(new Set())}
          onDelete={() => setBulkDeleteDialog(true)}
          onExport={exportCSV}
          canDelete={isOwner || isAdmin}
        />
      )}
    </div>
  );
};

export default OrgAttendanceHistory;
