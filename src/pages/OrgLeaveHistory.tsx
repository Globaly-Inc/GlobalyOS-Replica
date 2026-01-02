import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { OrgLink } from "@/components/OrgLink";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { History, Search, Download, Pencil, TrendingUp, TrendingDown, Calendar, Trash2, AlertTriangle, Award, Upload, X, CalendarDays, Plus, Users, Check, ChevronsUpDown, Sun, Heart, Moon, Clock, Baby, Plane, Briefcase, BarChart3, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { EditLeaveAdjustmentDialog } from "@/components/dialogs/EditLeaveAdjustmentDialog";
import { EditLeaveRequestDialog } from "@/components/dialogs/EditLeaveRequestDialog";
import { LeaveBulkActionsBar } from "@/components/leave/LeaveBulkActionsBar";
import { LeaveAnalyticsChart } from "@/components/leave/LeaveAnalyticsChart";
import { LeaveHistoryPendingTab } from "@/components/leave/LeaveHistoryPendingTab";
import { AddLeaveForEmployeeDialog } from "@/components/dialogs/AddLeaveForEmployeeDialog";
import { useLeaveHistoryFilters, DATE_RANGE_OPTIONS, DateRangeOption, getPreviousPeriodRange, getComparisonLabel, getDateRangeDisplayLabel } from "@/hooks/useLeaveHistoryFilters";
import { useEmployees } from "@/services/useEmployees";
import { InitializeYearBalancesButton } from "@/components/leave/InitializeYearBalancesButton";

type LeaveHistoryTab = 'analytics' | 'records' | 'pending';

interface LeaveTransaction {
  id: string;
  type: 'leave_taken' | 'adjustment';
  adjustmentSource?: 'auto' | 'manual';
  leave_type: string;
  days: number;
  effective_date: string;
  reason: string | null;
  status?: string;
  start_date?: string;
  end_date?: string;
  half_day_type?: string;
  previous_balance?: number;
  new_balance?: number;
  balance_after?: number;
  employee: {
    id: string;
    position?: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

interface SelectedTransaction {
  type: 'leave_taken' | 'adjustment';
  id: string;
  status?: string;
}

// Format days with negative as (X) in red
const formatDays = (days: number, showSign: boolean = true) => {
  if (days === 0) return <span className="text-muted-foreground">0</span>;
  if (days < 0) {
    return <span className="text-destructive font-medium">({Math.abs(days)})</span>;
  }
  return <span className="text-green-600 font-medium">{showSign ? '+' : ''}{days}</span>;
};

// Format balance with color
const formatBalance = (balance: number | undefined) => {
  if (balance === undefined) return <span className="text-muted-foreground">-</span>;
  
  // Round to 1 decimal place to avoid floating point precision issues
  const roundedBalance = Math.round(balance * 10) / 10;
  
  if (roundedBalance < 0) {
    return <span className="text-destructive font-medium">({Math.abs(roundedBalance)})</span>;
  }
  return <span className={roundedBalance > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>{roundedBalance}</span>;
};

const OrgLeaveHistory = () => {
  const { currentOrg } = useOrganization();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { navigateOrg, orgCode } = useOrgNavigation();
  const { data: currentEmployee, isLoading: employeeLoading } = useCurrentEmployee();
  
  // Check if current user is a manager (has direct reports)
  const [isManager, setIsManager] = useState(false);
  const [directReportIds, setDirectReportIds] = useState<string[]>([]);
  
  const canEditAll = isOwner || isAdmin || isHR;
  
  const [transactions, setTransactions] = useState<LeaveTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSpinner, setShowSpinner] = useState(false);
  
  // Delayed spinner to prevent flickering on fast loads
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowSpinner(true), 150);
      return () => clearTimeout(timer);
    }
    setShowSpinner(false);
  }, [loading]);
  
  // Employee multi-select popover state
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [customDatePopoverOpen, setCustomDatePopoverOpen] = useState(false);
  
  const {
    statusFilter, setStatusFilter,
    leaveTypeFilter, setLeaveTypeFilter,
    transactionTypeFilter, setTransactionTypeFilter,
    yearFilter, setYearFilter,
    dateRangeFilter, setDateRangeFilter,
    selectedEmployees, setSelectedEmployees,
    customStartDate, customEndDate, setCustomDateRange,
    dateRange,
    clearFilters,
    isLoaded,
  } = useLeaveHistoryFilters();
  
  // Tab state with URL persistence
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as LeaveHistoryTab | null;
  const [activeTab, setActiveTab] = useState<LeaveHistoryTab>(
    tabParam && ['analytics', 'records', 'pending'].includes(tabParam) ? tabParam : 'records'
  );
  
  // Total pending count for tab badge (across entire org)
  const [totalPendingCount, setTotalPendingCount] = useState(0);
  
  const handleTabChange = (tab: LeaveHistoryTab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams, { replace: true });
  };
  
  // Handle URL query parameters for deep linking (employee, dateRange)
  const employeeParam = searchParams.get('employee');
  const dateRangeParam = searchParams.get('dateRange') as DateRangeOption | null;
  
  // Apply URL parameters as initial filters (only once when loaded)
  useEffect(() => {
    if (!isLoaded) return;
    
    let shouldClearParams = false;
    
    // If employee parameter is provided, set it as selected
    if (employeeParam && !selectedEmployees.includes(employeeParam)) {
      setSelectedEmployees([employeeParam]);
      shouldClearParams = true;
    }
    
    // If dateRange parameter is provided and valid, set it
    if (dateRangeParam && ['today', 'last7days', 'last14days', 'last30days', 'thisMonth', 'lastMonth', 'thisYear'].includes(dateRangeParam)) {
      setDateRangeFilter(dateRangeParam);
      shouldClearParams = true;
    }
    
    // Clear URL params after applying to avoid re-applying on refresh
    if (shouldClearParams) {
      setSearchParams({}, { replace: true });
    }
  }, [isLoaded, employeeParam, dateRangeParam, setSelectedEmployees, setDateRangeFilter, setSearchParams]);
  
  // Fetch all employees for multi-select dropdown
  const { data: employeesData = [] } = useEmployees({ status: 'active' });
  const allEmployees = (employeesData as unknown) as Array<{
    id: string;
    profiles?: { full_name?: string; avatar_url?: string | null };
  }>;
  
  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);
  
  // All active leave types for stats display
  const [allLeaveTypes, setAllLeaveTypes] = useState<Array<{ id: string; name: string }>>([]);
  
  // Stats for cards - comparing with previous period
  const [prevPeriodStats, setPrevPeriodStats] = useState<Record<string, { days: number }>>({});
  const [leaveTypeStats, setLeaveTypeStats] = useState<Array<{
    leave_type: string;
    total_days: number;
    balance: number;
  }>>();
  
  const [editAdjustment, setEditAdjustment] = useState<any>(null);
  const [editRequest, setEditRequest] = useState<any>(null);
  const [deleteAdjustmentDialog, setDeleteAdjustmentDialog] = useState<{ open: boolean; adjustment: LeaveTransaction | null }>({ open: false, adjustment: null });
  const [deletingAdjustment, setDeletingAdjustment] = useState(false);
  const [missingBalanceCount, setMissingBalanceCount] = useState(0);
  
  // Bulk selection state
  const [selectedTransactions, setSelectedTransactions] = useState<SelectedTransaction[]>([]);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkDeleteLeaveDialog, setBulkDeleteLeaveDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeletingLeave, setBulkDeletingLeave] = useState(false);
  const [deleteLeaveDialog, setDeleteLeaveDialog] = useState<{ open: boolean; request: LeaveTransaction | null }>({ open: false, request: null });
  const [deletingLeave, setDeletingLeave] = useState(false);
  const [addLeaveOpen, setAddLeaveOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Check if current user has direct reports (is a manager)
  useEffect(() => {
    const checkDirectReports = async () => {
      if (!currentEmployee?.id || !currentOrg?.id) return;
      
      const { data, error } = await supabase
        .from("employees")
        .select("id")
        .eq("manager_id", currentEmployee.id)
        .eq("organization_id", currentOrg.id)
        .eq("status", "active");
      
      if (!error && data) {
        setIsManager(data.length > 0);
        setDirectReportIds(data.map(e => e.id));
      }
    };
    
    checkDirectReports();
  }, [currentEmployee?.id, currentOrg?.id]);

  // Helper to check if user can edit a specific transaction
  // Only Owner/Admin/HR can edit leave records
  const canEditTransaction = (_t: LeaveTransaction) => {
    return canEditAll;
  };
  
  // Filter employees visible in dropdown based on role
  const visibleEmployees = useMemo(() => {
    if (canEditAll) {
      // Owner/Admin/HR can see all employees
      return allEmployees;
    }
    
    if (isManager && currentEmployee?.id) {
      // Managers see themselves + direct reports
      return allEmployees.filter(e => 
        e.id === currentEmployee.id || directReportIds.includes(e.id)
      );
    }
    
    // Regular users only see themselves
    return allEmployees.filter(e => e.id === currentEmployee?.id);
  }, [allEmployees, canEditAll, isManager, currentEmployee?.id, directReportIds]);

  // For checking if filters are modified from default
  const isRegularUser = !canEditAll && !isManager;

  useEffect(() => {
    if (!currentOrg?.id) return;
    if (roleLoading || employeeLoading) return;
    if (!currentEmployee?.id) return;

    loadData();
    
    // Fetch total pending count for tab badge
    const fetchPendingCount = async () => {
      if (!canEditAll && !isManager) return;
      
      let query = supabase
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", currentOrg.id)
        .eq("status", "pending");
      
      if (!canEditAll && isManager) {
        // Manager only sees direct reports
        query = query.in("employee_id", directReportIds);
      }
      
      const { count } = await query;
      setTotalPendingCount(count || 0);
    };
    
    fetchPendingCount();
  }, [currentOrg?.id, yearFilter, roleLoading, employeeLoading, currentEmployee?.id, isOwner, isAdmin, isHR, isManager, directReportIds, dateRangeFilter, format(dateRange.startDate, 'yyyy-MM-dd'), format(dateRange.endDate, 'yyyy-MM-dd'), selectedEmployees]);

  const loadData = async () => {
    if (!currentOrg?.id || !currentEmployee?.id) return;
    setLoading(true);
    
    try {
      const currentYear = parseInt(yearFilter);
      const startOfYear = `${yearFilter}-01-01`;
      const endOfYear = `${yearFilter}-12-31`;

      // Calculate previous period range based on current date filter
      const prevPeriod = getPreviousPeriodRange(dateRange);
      const startOfPrevPeriod = format(prevPeriod.startDate, 'yyyy-MM-dd');
      const endOfPrevPeriod = format(prevPeriod.endDate, 'yyyy-MM-dd');

      // Fetch leave types from database for name normalization and stats display
      const { data: leaveTypesData } = await supabase
        .from("leave_types")
        .select("id, name, is_active")
        .eq("organization_id", currentOrg.id)
        .eq("is_active", true);
      
      // Store all active leave types for stats cards
      setAllLeaveTypes((leaveTypesData || []).map((lt: { id: string; name: string }) => ({ id: lt.id, name: lt.name })));
      
      // Check how many employees are missing balances for CURRENT calendar year (for admin banner)
      // This should always check the current year, not the selected yearFilter
      const currentCalendarYear = new Date().getFullYear();
      if (canEditAll && leaveTypesData?.length) {
        const { count: activeEmployeeCount } = await supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", currentOrg.id)
          .eq("status", "active");
        
        const { count: balanceCount } = await supabase
          .from("leave_type_balances")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", currentOrg.id)
          .eq("year", currentCalendarYear);
        
        const expectedBalances = (activeEmployeeCount || 0) * leaveTypesData.length;
        const missing = Math.max(0, expectedBalances - (balanceCount || 0));
        setMissingBalanceCount(missing > 0 ? activeEmployeeCount || 0 : 0);
      }
      
      // Build a lookup map to normalize leave type names to official casing
      const leaveTypeNameMap: Record<string, string> = {};
      (leaveTypesData || []).forEach((lt: { name: string }) => {
        leaveTypeNameMap[lt.name.toLowerCase()] = lt.name;
      });
      const normalizeLeaveType = (name: string) => leaveTypeNameMap[name.toLowerCase()] || name;

      // Determine which employee IDs we can view
      let allowedEmployeeIds: string[] | null = null; // null = all employees (for admins)
      
      if (!canEditAll) {
        // Manager or regular user - filter to self + direct reports (for managers)
        allowedEmployeeIds = [currentEmployee.id, ...directReportIds];
      }

      // Load leave requests for current year
      let requestsQuery = supabase
        .from("leave_requests")
        .select(`
          id,
          leave_type,
          start_date,
          end_date,
          days_count,
          half_day_type,
          reason,
          status,
          created_at,
          employee_id,
          employee:employees!leave_requests_employee_id_fkey(
            id,
            position,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq("organization_id", currentOrg.id)
        .gte("start_date", startOfYear)
        .lte("start_date", endOfYear)
        .order("start_date", { ascending: false });

      // Filter by allowed employee IDs if not admin/HR/owner
      if (allowedEmployeeIds) {
        requestsQuery = requestsQuery.in("employee_id", allowedEmployeeIds);
      }

      const { data: requestsData, error: requestsError } = await requestsQuery;

      if (requestsError) throw requestsError;

      // Load leave balance logs (adjustments) for current year
      let logsQuery = supabase
        .from("leave_balance_logs")
        .select(`
          id,
          leave_type,
          change_amount,
          previous_balance,
          new_balance,
          reason,
          effective_date,
          created_at,
          employee_id,
          action,
          employee:employees!leave_balance_logs_employee_id_fkey(
            id,
            position,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq("organization_id", currentOrg.id)
        .in("action", ["manual_adjustment", "year_init"])
        .gte("effective_date", startOfYear)
        .lte("effective_date", endOfYear)
        .order("effective_date", { ascending: false });

      // Filter by allowed employee IDs if not admin/HR/owner
      if (allowedEmployeeIds) {
        logsQuery = logsQuery.in("employee_id", allowedEmployeeIds);
      }

      const { data: logsData, error: logsError } = await logsQuery;

      if (logsError) throw logsError;

      // Load previous period data for comparison
      let prevRequestsQuery = supabase
        .from("leave_requests")
        .select("leave_type, days_count, status")
        .eq("organization_id", currentOrg.id)
        .eq("status", "approved")
        .gte("start_date", startOfPrevPeriod)
        .lte("start_date", endOfPrevPeriod);

      if (allowedEmployeeIds) {
        prevRequestsQuery = prevRequestsQuery.in("employee_id", allowedEmployeeIds);
      }

      const { data: prevRequestsData } = await prevRequestsQuery;

      // Calculate previous period stats by leave type (normalized)
      const prevStats: Record<string, { days: number }> = {};
      (prevRequestsData || []).forEach((r: any) => {
        const normalizedType = normalizeLeaveType(r.leave_type);
        if (!prevStats[normalizedType]) {
          prevStats[normalizedType] = { days: 0 };
        }
        prevStats[normalizedType].days += r.days_count;
      });
      setPrevPeriodStats(prevStats);

      // Combine and format transactions
      const requestTransactions: LeaveTransaction[] = (requestsData || []).map((r: any) => ({
        id: r.id,
        type: 'leave_taken' as const,
        leave_type: normalizeLeaveType(r.leave_type),
        days: -r.days_count,
        effective_date: r.start_date,
        reason: r.reason,
        status: r.status,
        start_date: r.start_date,
        end_date: r.end_date,
        half_day_type: r.half_day_type,
        employee: r.employee
      }));

      // logsData now contains both manual_adjustment and year_init entries
      const adjustmentTransactions: LeaveTransaction[] = (logsData || []).map((l: any) => ({
        id: l.id,
        type: 'adjustment' as const,
        adjustmentSource: l.action === 'year_init' ? 'auto' : 'manual',
        leave_type: normalizeLeaveType(l.leave_type),
        days: l.change_amount,
        effective_date: l.effective_date || l.created_at.split('T')[0],
        reason: l.reason,
        previous_balance: l.previous_balance,
        new_balance: l.new_balance,
        employee: l.employee
      }));

      const allTransactions = [...requestTransactions, ...adjustmentTransactions];


      // ====== Running balance calculation per employee per leave type ======
      // Step 1: Sort chronologically (oldest first)
      const sortedChronologically = [...allTransactions].sort((a, b) => 
        new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
      );

      // Step 2: Process transactions chronologically, tracking per employee per leave type
      const runningBalance: Record<string, Record<string, number>> = {};
      const transactionsWithBalance = sortedChronologically.map(t => {
        const empId = t.employee?.id || 'unknown';
        if (!runningBalance[empId]) {
          runningBalance[empId] = {};
        }
        if (t.type === 'adjustment' || t.status === 'approved') {
          runningBalance[empId][t.leave_type] = (runningBalance[empId][t.leave_type] || 0) + t.days;
        }
        return { ...t, balance_after: runningBalance[empId][t.leave_type] || 0 };
      });

      // Step 3: Reverse to show newest first
      setTransactions(transactionsWithBalance.reverse());
      
      // Extract unique leave types
      const types = [...new Set(allTransactions.map(t => t.leave_type))];
      setLeaveTypes(types);
    } catch (error) {
      console.error("Error loading leave data:", error);
      toast.error("Failed to load leave history");
    } finally {
      setLoading(false);
    }
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedTransactions([]);
  }, [yearFilter, statusFilter, leaveTypeFilter, transactionTypeFilter, selectedEmployees, dateRangeFilter]);

  const filteredTransactions = useMemo(() => transactions.filter((t) => {
    // Employee filter - if no employees selected, show all; otherwise filter to selected
    const matchesEmployee = selectedEmployees.length === 0 || 
      selectedEmployees.includes(t.employee?.id || '');
    const matchesStatus = statusFilter === "all" || t.status === statusFilter || t.type === 'adjustment';
    const matchesType = leaveTypeFilter === "all" || t.leave_type === leaveTypeFilter;
    const matchesTransType = transactionTypeFilter === "all" || 
      t.type === transactionTypeFilter ||
      (transactionTypeFilter === "auto_adjust" && t.type === 'adjustment' && t.adjustmentSource === 'auto') ||
      (transactionTypeFilter === "manual_adjust" && t.type === 'adjustment' && t.adjustmentSource === 'manual');
    
    // Date range filter - parse date string as local date to avoid timezone issues
    const [year, month, day] = t.effective_date.split('-').map(Number);
    const effectiveDate = new Date(year, month - 1, day);
    const matchesDateRange = effectiveDate >= dateRange.startDate && effectiveDate <= dateRange.endDate;
    
    return matchesEmployee && matchesStatus && matchesType && matchesTransType && matchesDateRange;
  }), [transactions, selectedEmployees, statusFilter, leaveTypeFilter, transactionTypeFilter, dateRange]);

  // Pagination for filtered transactions
  const pagination = usePagination({
    pageKey: 'org-leave-history',
    defaultPageSize: 20,
  });

  // Update total count when filtered transactions change
  useEffect(() => {
    pagination.setTotalCount(filteredTransactions.length);
  }, [filteredTransactions.length]);

  // Reset page when filters change
  useEffect(() => {
    pagination.resetPage();
  }, [yearFilter, statusFilter, leaveTypeFilter, transactionTypeFilter, selectedEmployees, dateRangeFilter]);

  // Paginated transactions for display
  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(pagination.from, pagination.from + pagination.pageSize);
  }, [filteredTransactions, pagination.from, pagination.pageSize]);

  // Selection handlers
  const isTransactionSelected = (id: string, type: string) => {
    return selectedTransactions.some(s => s.id === id && s.type === type);
  };

  const toggleTransactionSelection = (t: LeaveTransaction) => {
    const key = { id: t.id, type: t.type, status: t.status };
    if (isTransactionSelected(t.id, t.type)) {
      setSelectedTransactions(prev => prev.filter(s => !(s.id === t.id && s.type === t.type)));
    } else {
      setSelectedTransactions(prev => [...prev, key]);
    }
  };

  const selectAllFiltered = () => {
    const allFiltered = filteredTransactions.map(t => ({
      id: t.id,
      type: t.type,
      status: t.status
    }));
    setSelectedTransactions(allFiltered);
  };

  const deselectAll = () => {
    setSelectedTransactions([]);
  };

  const allFilteredSelected = filteredTransactions.length > 0 && 
    filteredTransactions.every(t => isTransactionSelected(t.id, t.type));
  const someFilteredSelected = selectedTransactions.length > 0 && !allFilteredSelected;

  // Bulk action handlers
  const handleBulkDeleteAdjustments = async () => {
    const adjustmentIds = selectedTransactions
      .filter(s => s.type === 'adjustment')
      .map(s => s.id);
    
    if (adjustmentIds.length === 0) return;
    
    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from("leave_balance_logs")
        .delete()
        .in("id", adjustmentIds);

      if (error) throw error;

      toast.success(`Deleted ${adjustmentIds.length} adjustment${adjustmentIds.length > 1 ? 's' : ''}`);
      setSelectedTransactions([]);
      loadData();
      queryClient.invalidateQueries({ queryKey: ["leave-balance-logs"] });
    } catch (error) {
      console.error("Error deleting adjustments:", error);
      toast.error("Failed to delete some adjustments");
    } finally {
      setBulkDeleting(false);
      setBulkDeleteDialog(false);
    }
  };

  const handleBulkDeleteLeave = async () => {
    const leaveIds = selectedTransactions
      .filter(s => s.type === 'leave_taken')
      .map(s => s.id);
    
    if (leaveIds.length === 0) return;
    
    setBulkDeletingLeave(true);
    try {
      const { error } = await supabase
        .from("leave_requests")
        .delete()
        .in("id", leaveIds);

      if (error) throw error;

      toast.success(`Deleted ${leaveIds.length} leave record${leaveIds.length > 1 ? 's' : ''}`);
      setSelectedTransactions([]);
      loadData();
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    } catch (error) {
      console.error("Error deleting leave records:", error);
      toast.error("Failed to delete some leave records");
    } finally {
      setBulkDeletingLeave(false);
      setBulkDeleteLeaveDialog(false);
    }
  };

  const handleDeleteLeaveRequest = async () => {
    if (!deleteLeaveDialog.request) return;
    setDeletingLeave(true);

    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", deleteLeaveDialog.request.id);

    if (error) {
      toast.error("Failed to delete leave record");
    } else {
      toast.success("Leave record deleted");
      loadData();
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    }

    setDeletingLeave(false);
    setDeleteLeaveDialog({ open: false, request: null });
  };

  const handleExportSelected = () => {
    const selectedIds = new Set(selectedTransactions.map(s => `${s.type}-${s.id}`));
    const selectedData = filteredTransactions.filter(t => selectedIds.has(`${t.type}-${t.id}`));
    
    const headers = ["Employee", "Applied Date", "Leave Dates", "Type", "Leave Type", "Days", "Status", "Reason"];
    const rows = selectedData.map(t => [
      t.employee?.profiles?.full_name || "",
      t.effective_date,
      t.type === 'leave_taken' ? `${t.start_date || ''} - ${t.end_date || ''}` : '-',
      t.type === 'leave_taken' ? 'Leave Taken' : 'Adjustment',
      t.leave_type,
      t.days.toString(),
      t.status || "-",
      t.reason || ""
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-history-selected-${yearFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedData.length} transactions`);
  };

  // Calculate employee leave totals for Most/Least cards (using filtered data)
  const employeeLeaveTotals = useMemo(() => {
    const totals: Record<string, { employee: LeaveTransaction['employee']; totalDays: number }> = {};
    
    filteredTransactions
      .filter(t => t.type === 'leave_taken' && t.status === 'approved')
      .forEach(t => {
        const empId = t.employee?.id;
        if (!empId) return;
        if (!totals[empId]) {
          totals[empId] = { employee: t.employee, totalDays: 0 };
        }
        totals[empId].totalDays += Math.abs(t.days);
      });
    
    return Object.values(totals);
  }, [filteredTransactions]);

  // Transactions filtered ONLY by employee selection - for balance calculation
  // Balance should not be affected by leave type, status, or date range filters
  const employeeOnlyTransactions = useMemo(() => {
    if (selectedEmployees.length === 0) return transactions;
    return transactions.filter(t => 
      selectedEmployees.includes(t.employee?.id || '')
    );
  }, [transactions, selectedEmployees]);

  // Calculate filtered leave type stats - includes ALL leave types, even with 0 days
  // Days taken: respects all filters (for analytics)
  // Balance: only respects employee selection (to show actual current balance)
  const filteredLeaveTypeStats = useMemo(() => {
    // Initialize all leave types with 0 days and 0 balance
    const typeStats: Record<string, { total_days: number; balance: number }> = {};
    allLeaveTypes.forEach(lt => {
      typeStats[lt.name] = { total_days: 0, balance: 0 };
    });
    
    // Calculate DAYS TAKEN from filteredTransactions (respects all filters)
    filteredTransactions.forEach(t => {
      if (!typeStats[t.leave_type]) {
        typeStats[t.leave_type] = { total_days: 0, balance: 0 };
      }
      if (t.type === 'leave_taken' && t.status === 'approved') {
        typeStats[t.leave_type].total_days += Math.abs(t.days);
      }
    });
    
    // Calculate BALANCE from employeeOnlyTransactions (only employee filter affects this)
    employeeOnlyTransactions.forEach(t => {
      if (!typeStats[t.leave_type]) {
        typeStats[t.leave_type] = { total_days: 0, balance: 0 };
      }
      if (t.type === 'leave_taken' && t.status === 'approved') {
        typeStats[t.leave_type].balance += t.days; // t.days is negative for leave_taken
      } else if (t.type === 'adjustment') {
        typeStats[t.leave_type].balance += t.days;
      }
    });

    return Object.entries(typeStats).map(([leave_type, stats]) => ({
      leave_type,
      total_days: stats.total_days,
      balance: stats.balance,
    }));
  }, [filteredTransactions, employeeOnlyTransactions, allLeaveTypes]);

  const mostLeaveTaken = useMemo(() => {
    if (employeeLeaveTotals.length === 0) return null;
    return employeeLeaveTotals.sort((a, b) => b.totalDays - a.totalDays)[0];
  }, [employeeLeaveTotals]);

  const leastLeaveTaken = useMemo(() => {
    const withLeave = employeeLeaveTotals.filter(e => e.totalDays > 0);
    if (withLeave.length === 0) return null;
    return withLeave.sort((a, b) => a.totalDays - b.totalDays)[0];
  }, [employeeLeaveTotals]);


  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="bg-destructive/10 text-xs">Rejected</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">Pending</Badge>;
      default:
        return <span className="text-muted-foreground text-xs">-</span>;
    }
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  };

  const formatLeaveDates = (t: LeaveTransaction) => {
    if (t.type === 'adjustment') return "-";
    if (!t.start_date) return "-";
    
    const start = formatDate(t.start_date);
    const end = t.end_date ? formatDate(t.end_date) : start;
    
    if (t.start_date === t.end_date || !t.end_date) {
      return start;
    }
    return `${start} → ${end}`;
  };

  const handleExportCSV = () => {
    const headers = ["Employee", "Applied Date", "Leave Dates", "Type", "Leave Type", "Days", "Status", "Reason"];
    const rows = filteredTransactions.map(t => [
      t.employee?.profiles?.full_name || "",
      t.effective_date,
      t.type === 'leave_taken' ? `${t.start_date || ''} - ${t.end_date || ''}` : '-',
      t.type === 'leave_taken' ? 'Leave Taken' : 'Adjustment',
      t.leave_type,
      t.days.toString(),
      t.status || "-",
      t.reason || ""
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-history-${yearFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export complete");
  };

  const handleDeleteAdjustment = async () => {
    if (!deleteAdjustmentDialog.adjustment) return;
    setDeletingAdjustment(true);

    const { error } = await supabase
      .from("leave_balance_logs")
      .delete()
      .eq("id", deleteAdjustmentDialog.adjustment.id);

    if (error) {
      toast.error("Failed to delete adjustment");
    } else {
      toast.success("Adjustment deleted");
      loadData();
      queryClient.invalidateQueries({ queryKey: ["leave-balance-logs"] });
    }

    setDeletingAdjustment(false);
    setDeleteAdjustmentDialog({ open: false, adjustment: null });
  };
  // Helper to map LeaveTransaction to EditLeaveAdjustmentDialog format
  const mapToAdjustmentEdit = (t: LeaveTransaction) => ({
    id: t.id,
    leave_type: t.leave_type,
    change_amount: t.days,
    reason: t.reason || '',
    effective_date: t.effective_date,
    previous_balance: t.previous_balance || 0,
    new_balance: t.new_balance || 0
  });

  // Helper to map LeaveTransaction to EditLeaveRequestDialog format
  const mapToRequestEdit = (t: LeaveTransaction) => ({
    id: t.id,
    leave_type: t.leave_type,
    start_date: t.start_date || t.effective_date,
    end_date: t.end_date || t.start_date || t.effective_date,
    days_count: Math.abs(t.days),
    half_day_type: t.half_day_type || 'full',
    reason: t.reason || '',
    status: t.status || 'pending'
  });

  const pendingCount = filteredTransactions.filter(r => r.status === "pending").length;
  const approvedCount = filteredTransactions.filter(r => r.status === "approved").length;
  const rejectedCount = filteredTransactions.filter(r => r.status === "rejected").length;
  const adjustmentCount = filteredTransactions.filter(r => r.type === "adjustment").length;

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <div className="space-y-6 pt-4 md:pt-6">
      {/* Year Balance Initialization Banner (for admins) */}
      {canEditAll && (
        <InitializeYearBalancesButton
          year={new Date().getFullYear()}
          missingCount={missingBalanceCount}
          onComplete={loadData}
        />
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6" />
            Leave History
          </h1>
          <p className="text-muted-foreground hidden md:block">
            {canEditAll
              ? "View all leave transactions across the organization"
              : isManager
              ? "Your leave history and direct reports"
              : "Your leave history"}
          </p>
        </div>
      {canEditAll && (
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateOrg('/leave/import')} className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setAddLeaveOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Leave
            </Button>
          </div>
        )}
      </div>

      {/* Tab Toggle */}
      <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30 w-fit">
        <Button
          variant={activeTab === 'analytics' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => handleTabChange('analytics')}
          className="gap-1.5 h-8"
        >
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Analytics</span>
        </Button>
        <Button
          variant={activeTab === 'records' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => handleTabChange('records')}
          className="gap-1.5 h-8"
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Records</span>
        </Button>
        {(canEditAll || isManager) && (
          <Button
            variant={activeTab === 'pending' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('pending')}
            className="gap-1.5 h-8"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Pending</span>
            {totalPendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {totalPendingCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Mobile Request Leave Button */}
      <div className="md:hidden mb-2">
        <Button onClick={() => navigateOrg('/leave')} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Request Leave
        </Button>
      </div>

      {/* Pending Tab Content */}
      {activeTab === 'pending' && (canEditAll || isManager) && (
        <LeaveHistoryPendingTab onApprovalChange={loadData} />
      )}

      {/* Analytics & Records Tab Content */}
      {activeTab !== 'pending' && (
        <>
      {/* Sticky Filter Bar - Light Purple Background */}
      <div className="sticky top-0 z-10 bg-purple-50/80 dark:bg-purple-950/20 backdrop-blur-sm pb-2 pt-2 rounded-lg">
        <div className="flex items-center gap-2 flex-wrap bg-slate-300 dark:bg-slate-700 px-[5px] py-[5px] rounded-lg">
          {/* Employee Multi-Select Dropdown - Read-only for regular users, interactive for Owner/Admin/HR/Manager - Hidden on mobile */}
          <div className="hidden md:block">
            {isRegularUser ? (
              // Read-only version for regular users - shows their name, not interactive
              <Button
                variant="outline"
                className="h-9 gap-1 bg-background cursor-default min-w-[140px]"
                disabled
              >
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">
                  {currentEmployee?.profiles?.full_name || "My Leave"}
                </span>
              </Button>
            ) : (
              <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeePopoverOpen}
                    className="h-9 justify-between gap-1 bg-background hover:bg-background/80 min-w-[140px]"
                  >
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">
                      {selectedEmployees.length === 0
                        ? "All Employees"
                        : selectedEmployees.length === 1
                          ? visibleEmployees.find(e => e.id === selectedEmployees[0])?.profiles?.full_name || "1 selected"
                          : `${selectedEmployees.length} selected`}
                    </span>
                    <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employees..." />
                    <CommandList>
                      <CommandEmpty>No employees found.</CommandEmpty>
                      <CommandGroup>
                        {/* Select All / Clear All */}
                        <div className="flex items-center justify-between px-2 py-1.5 border-b">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setSelectedEmployees(visibleEmployees.map(e => e.id))}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setSelectedEmployees([])}
                          >
                            Clear All
                          </Button>
                        </div>
                        {visibleEmployees.map((employee) => (
                          <CommandItem
                            key={employee.id}
                            value={employee.profiles?.full_name || employee.id}
                            onSelect={() => {
                              const isSelected = selectedEmployees.includes(employee.id);
                              if (isSelected) {
                                setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                              } else {
                                setSelectedEmployees([...selectedEmployees, employee.id]);
                              }
                            }}
                          >
                            <div className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              selectedEmployees.includes(employee.id)
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible"
                            )}>
                              <Check className="h-3 w-3" />
                            </div>
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={employee.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {(employee.profiles?.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{employee.profiles?.full_name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Transaction Type Filter - Hidden on mobile */}
          <div className="hidden md:block">
            <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
              <SelectTrigger className="h-9 w-auto min-w-[120px] bg-background">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="leave_taken">Leave Taken</SelectItem>
                <SelectItem value="auto_adjust">Auto Adjust</SelectItem>
                <SelectItem value="manual_adjust">Manual Adjust</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter - Hidden on mobile */}
          <div className="hidden md:block">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-auto min-w-[110px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile: Full-width filters */}
          <div className="flex md:hidden w-full gap-2">
            {/* Leave Type Filter - Mobile */}
            <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
              <SelectTrigger className="h-9 flex-1 bg-background">
                <SelectValue placeholder="Leave Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {leaveTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Filter - Mobile */}
            <Select 
              value={dateRangeFilter} 
              onValueChange={(value: DateRangeOption) => {
                setDateRangeFilter(value);
                if (value === "custom") {
                  setCustomDatePopoverOpen(true);
                }
              }}
            >
              <SelectTrigger className="h-9 flex-1 bg-background">
                <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />
                <span className="truncate">{getDateRangeDisplayLabel(dateRangeFilter)}</span>
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === "thisYear" || option.value === "lastYear" 
                      ? getDateRangeDisplayLabel(option.value as DateRangeOption)
                      : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Leave Type Filter */}
          <div className="hidden md:block">
            <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
              <SelectTrigger className="h-9 w-auto min-w-[130px] bg-background">
                <SelectValue placeholder="Leave Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {leaveTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Date Range Filter */}
          <Popover open={customDatePopoverOpen && dateRangeFilter === "custom"} onOpenChange={setCustomDatePopoverOpen}>
            <div className="hidden md:block">
              <Select 
                value={dateRangeFilter} 
                onValueChange={(value: DateRangeOption) => {
                  setDateRangeFilter(value);
                  if (value === "custom") {
                    setCustomDatePopoverOpen(true);
                  }
                }}
              >
                <SelectTrigger className="h-9 w-auto min-w-[150px] bg-background">
                  <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span className="truncate">{getDateRangeDisplayLabel(dateRangeFilter)}</span>
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value === "thisYear" || option.value === "lastYear" 
                        ? getDateRangeDisplayLabel(option.value as DateRangeOption)
                        : option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PopoverTrigger asChild>
              <span />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <div className="space-y-4">
                <div className="text-sm font-medium">Select Date Range</div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Start Date</div>
                    <CalendarComponent
                      mode="single"
                      selected={customStartDate ? new Date(customStartDate) : undefined}
                      onSelect={(date) => setCustomDateRange(date ? format(date, "yyyy-MM-dd") : null, customEndDate)}
                      className="rounded-md border pointer-events-auto"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">End Date</div>
                    <CalendarComponent
                      mode="single"
                      selected={customEndDate ? new Date(customEndDate) : undefined}
                      onSelect={(date) => setCustomDateRange(customStartDate, date ? format(date, "yyyy-MM-dd") : null)}
                      className="rounded-md border pointer-events-auto"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={() => setCustomDatePopoverOpen(false)}>
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear Filters - Hidden on mobile */}
          {(selectedEmployees.length > 0 || statusFilter !== "all" || leaveTypeFilter !== "all" || transactionTypeFilter !== "all" || dateRangeFilter !== "last30days") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="hidden md:flex h-9 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* Total Leave Requests Card */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Leave Requests</span>
            </div>
            <div className="text-2xl font-bold mb-2">{filteredTransactions.filter(t => t.type === 'leave_taken').length}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span className="text-amber-600">● {pendingCount} Pending</span>
              <span className="text-green-600">✓ {approvedCount} Approved</span>
              <span className="text-destructive">✗ {rejectedCount} Rejected</span>
            </div>
          </CardContent>
        </Card>

        {/* Leave Type Cards */}
        {filteredLeaveTypeStats.map(stat => {
          const prevPeriod = prevPeriodStats[stat.leave_type];
          const prevDays = prevPeriod?.days || 0;
          const percentChange = prevDays > 0
            ? Math.round(((stat.total_days - prevDays) / prevDays) * 100)
            : stat.total_days > 0 ? 100 : 0;
          const isPositive = percentChange > 0;
          const isNegative = percentChange < 0;

          return (
            <Card key={stat.leave_type}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`p-1.5 rounded-md ${stat.balance < 0 ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                    <Calendar className={`h-4 w-4 ${stat.balance < 0 ? 'text-destructive' : 'text-primary'}`} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground truncate">{stat.leave_type}</span>
                </div>
                
                {/* Days taken */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-xl font-bold">{stat.total_days}</span>
                  <span className="text-xs text-muted-foreground">days taken</span>
                </div>
                
                {/* % Change from previous period */}
                <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : isNegative ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {isPositive && <TrendingUp className="h-3 w-3" />}
                  {isNegative && <TrendingDown className="h-3 w-3" />}
                  <span>
                    {percentChange === 0 ? 'No change' : `${isPositive ? '+' : ''}${percentChange}% from ${getComparisonLabel(dateRangeFilter)}`}
                  </span>
                </div>

                {/* Current Balance */}
                <div className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border/50">
                  Balance: <span className={stat.balance < 0 ? 'text-destructive font-medium' : 'font-medium'}>
                    {stat.balance < 0 ? `(${Math.abs(stat.balance).toFixed(1)})` : stat.balance.toFixed(1)} days
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {/* Most Leave Taken Employee - Hide for regular users and when single employee selected - Hidden on mobile */}
        {(canEditAll || isManager) && selectedEmployees.length !== 1 && (
          <Card className="hidden md:block">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Most Leave</span>
              </div>
              {mostLeaveTaken ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={mostLeaveTaken.employee?.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(mostLeaveTaken.employee?.profiles?.full_name || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{mostLeaveTaken.employee?.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{mostLeaveTaken.totalDays} days</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Least Leave Taken Employee - Hide for regular users and when single employee selected - Hidden on mobile */}
        {(canEditAll || isManager) && selectedEmployees.length !== 1 && (
          <Card className="hidden md:block">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Least Leave</span>
              </div>
              {leastLeaveTaken ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={leastLeaveTaken.employee?.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(leastLeaveTaken.employee?.profiles?.full_name || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{leastLeaveTaken.employee?.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{leastLeaveTaken.totalDays} days</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Leave Analytics Chart - Hidden on mobile */}
      <div className="hidden md:block">
        <LeaveAnalyticsChart
        transactions={filteredTransactions.map(t => ({
          id: t.id,
          type: t.type,
          leave_type: t.leave_type,
          effective_date: t.effective_date,
          end_date: t.end_date,
          days: t.days,
          reason: t.reason || '',
          status: t.status || '',
          employee_id: t.employee.id,
          employee_name: t.employee.profiles.full_name,
          employee_avatar: t.employee.profiles.avatar_url || undefined,
        }))}
        yearFilter={yearFilter}
        dateRangeFilter={dateRangeFilter}
          dateRange={dateRange}
        />
      </div>

      {/* Table */}
      <Card className="relative">
        <CardContent className="p-0">
          {/* Overlay spinner for refresh - keeps table visible */}
          {loading && transactions.length > 0 && showSpinner && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}
          
          {/* Initial loading - only when no data yet */}
          {loading && transactions.length === 0 && showSpinner ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !loading && filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No leave transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canEditAll && (
                      <TableHead className="w-[40px] hidden md:table-cell">
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllFiltered();
                            } else {
                              deselectAll();
                            }
                          }}
                          aria-label="Select all"
                          className={someFilteredSelected ? "data-[state=checked]:bg-primary" : ""}
                          ref={(ref) => {
                            if (ref) {
                              (ref as HTMLButtonElement).dataset.state = someFilteredSelected ? "indeterminate" : (allFilteredSelected ? "checked" : "unchecked");
                            }
                          }}
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-[180px] hidden md:table-cell">Employee</TableHead>
                    <TableHead className="w-[85px] whitespace-nowrap hidden md:table-cell">Applied</TableHead>
                    <TableHead className="w-[155px]">Leave Dates</TableHead>
                    <TableHead className="w-[70px] hidden md:table-cell">Type</TableHead>
                    <TableHead className="w-[120px] md:whitespace-nowrap">
                      <span className="hidden md:inline">Leave Type</span>
                      <span className="md:hidden">Type</span>
                    </TableHead>
                    <TableHead className="text-center w-[50px]">Days</TableHead>
                    <TableHead className="w-[85px] hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-center w-[60px]">Balance</TableHead>
                    <TableHead className="w-[100px] hidden md:table-cell">Reason</TableHead>
                    <TableHead className="w-[85px] hidden md:table-cell">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((t) => (
                    <TableRow 
                      key={`${t.type}-${t.id}`} 
                      className={`group ${isTransactionSelected(t.id, t.type) ? 'bg-primary/5' : ''}`}
                    >
                      {canEditAll && (
                        <TableCell className="hidden md:table-cell">
                          <Checkbox
                            checked={isTransactionSelected(t.id, t.type)}
                            onCheckedChange={() => toggleTransactionSelection(t)}
                            aria-label={`Select ${t.employee?.profiles?.full_name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="hidden md:table-cell">
                        <OrgLink 
                          to={`/team/${t.employee?.id}`}
                          className="flex items-center gap-2 hover:opacity-80"
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={t.employee?.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(t.employee?.profiles?.full_name || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="font-medium text-sm truncate block max-w-[130px]">
                              {t.employee?.profiles?.full_name}
                            </span>
                            {t.employee?.position && (
                              <span className="text-xs text-muted-foreground truncate block max-w-[130px]">
                                {t.employee.position}
                              </span>
                            )}
                          </div>
                        </OrgLink>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap hidden md:table-cell">
                        {format(new Date(t.effective_date), "dd MMM")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.type === 'leave_taken' && t.start_date ? (
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 hidden md:block" />
                            <span className="whitespace-normal">
                              {format(new Date(t.start_date), "dd MMM")}
                              {t.end_date && t.start_date !== t.end_date && (
                                <>
                                  <span className="hidden md:inline text-muted-foreground"> → </span>
                                  <span className="md:hidden text-muted-foreground"> -</span>
                                  <span className="md:hidden block">{format(new Date(t.end_date), "dd MMM")}</span>
                                  <span className="hidden md:inline">{format(new Date(t.end_date), "dd MMM")}</span>
                                </>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {t.type === 'leave_taken' ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 text-xs gap-1">
                            <TrendingDown className="h-3 w-3" />
                            Taken
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 text-xs gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Adjust
                            </Badge>
                            {t.adjustmentSource === 'auto' ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200">
                                Auto
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
                                Manual
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Mobile: icon with tooltip */}
                        <div className="md:hidden">
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center justify-center p-1.5 rounded-full bg-primary/10 text-primary">
                                {(() => {
                                  const type = t.leave_type.toLowerCase();
                                  if (type.includes('annual') || type.includes('vacation')) return <Sun className="h-4 w-4" />;
                                  if (type.includes('sick') || type.includes('medical')) return <Heart className="h-4 w-4" />;
                                  if (type.includes('menstrual') || type.includes('period')) return <Moon className="h-4 w-4" />;
                                  if (type.includes('unpaid')) return <Clock className="h-4 w-4" />;
                                  if (type.includes('maternity') || type.includes('paternity') || type.includes('parental')) return <Baby className="h-4 w-4" />;
                                  if (type.includes('travel') || type.includes('holiday')) return <Plane className="h-4 w-4" />;
                                  return <Briefcase className="h-4 w-4" />;
                                })()}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{t.leave_type}</TooltipContent>
                          </Tooltip>
                        </div>
                        {/* Desktop: text badge */}
                        <Badge variant="outline" className="text-xs whitespace-nowrap hidden md:inline-flex">{t.leave_type}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {formatDays(t.days)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{getStatusBadge(t.status)}</TableCell>
                      <TableCell className="text-center">
                        {formatBalance(t.balance_after)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[100px]" title={t.reason || ""}>
                        <span className="truncate block">{t.reason || "-"}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <TooltipProvider>
                          <div className="flex items-center gap-1">
                            {/* Edit - Only for canEdit users */}
                            {canEditTransaction(t) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => {
                                      if (t.type === 'adjustment') {
                                        setEditAdjustment(mapToAdjustmentEdit(t));
                                      } else {
                                        setEditRequest(mapToRequestEdit(t));
                                      }
                                    }}
                                  >
                                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                            )}
                            
                            {/* Delete - Only for adjustments and canEdit users */}
                            {canEditTransaction(t) && t.type === 'adjustment' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => setDeleteAdjustmentDialog({ open: true, adjustment: t })}
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            )}
                            
                            {/* Delete - For leave taken records */}
                            {canEditTransaction(t) && t.type === 'leave_taken' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => setDeleteLeaveDialog({ open: true, request: t })}
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Leave</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {filteredTransactions.length > 0 && (
            <div className="border-t">
              <PaginationControls
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalCount={pagination.totalCount}
                totalPages={pagination.totalPages}
                hasNextPage={pagination.hasNextPage}
                hasPrevPage={pagination.hasPrevPage}
                onPageChange={pagination.goToPage}
                onPageSizeChange={pagination.setPageSize}
                isLoading={loading}
                className="px-4"
              />
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* Delete Adjustment Confirmation Dialog */}
      <AlertDialog 
        open={deleteAdjustmentDialog.open} 
        onOpenChange={(open) => !open && setDeleteAdjustmentDialog({ open: false, adjustment: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Adjustment?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAdjustmentDialog.adjustment && (
                <>
                  Are you sure you want to delete this {deleteAdjustmentDialog.adjustment.leave_type} adjustment of{" "}
                  {deleteAdjustmentDialog.adjustment.days > 0 ? '+' : ''}{deleteAdjustmentDialog.adjustment.days} days
                  for {deleteAdjustmentDialog.adjustment.employee?.profiles?.full_name}?
                  This action cannot be undone and may affect leave balances.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAdjustment}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdjustment}
              disabled={deletingAdjustment}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingAdjustment ? "Deleting..." : "Delete Adjustment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialogs */}
      <EditLeaveAdjustmentDialog
        adjustment={editAdjustment}
        open={!!editAdjustment}
        onOpenChange={(open) => !open && setEditAdjustment(null)}
        onSuccess={loadData}
      />
      <EditLeaveRequestDialog
        request={editRequest}
        open={!!editRequest}
        onOpenChange={(open) => !open && setEditRequest(null)}
        onSuccess={loadData}
      />

      {/* Bulk Actions Bar */}
      {canEditAll && selectedTransactions.length > 0 && (
        <LeaveBulkActionsBar
          selectedItems={selectedTransactions}
          totalItems={filteredTransactions.length}
          onSelectAll={selectAllFiltered}
          onDeselectAll={deselectAll}
          onDeleteAdjustments={() => setBulkDeleteDialog(true)}
          onDeleteLeave={() => setBulkDeleteLeaveDialog(true)}
          onExportSelected={handleExportSelected}
        />
      )}

      {/* Bulk Delete Adjustments Dialog */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Adjustments?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTransactions.filter(s => s.type === 'adjustment').length} adjustment(s)?
              This action cannot be undone and may affect leave balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteAdjustments}
              disabled={bulkDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {bulkDeleting ? "Deleting..." : "Delete Adjustments"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Leave Dialog */}
      <AlertDialog open={bulkDeleteLeaveDialog} onOpenChange={setBulkDeleteLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Leave Records?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTransactions.filter(s => s.type === 'leave_taken').length} leave record(s)?
              This action cannot be undone and may affect leave balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeletingLeave}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteLeave}
              disabled={bulkDeletingLeave}
              className="bg-destructive hover:bg-destructive/90"
            >
              {bulkDeletingLeave ? "Deleting..." : "Delete Leave Records"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Single Leave Request Dialog */}
      <AlertDialog 
        open={deleteLeaveDialog.open} 
        onOpenChange={(open) => !open && setDeleteLeaveDialog({ open: false, request: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Record?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteLeaveDialog.request && (
                <>
                  Are you sure you want to delete this {deleteLeaveDialog.request.leave_type} leave of{" "}
                  {Math.abs(deleteLeaveDialog.request.days)} {Math.abs(deleteLeaveDialog.request.days) === 1 ? "day" : "days"} 
                  {" "}for {deleteLeaveDialog.request.employee?.profiles?.full_name}? 
                  This action cannot be undone and may affect leave balances.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingLeave}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLeaveRequest}
              disabled={deletingLeave}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingLeave ? "Deleting..." : "Delete Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Leave Dialog */}
      <AddLeaveForEmployeeDialog
        open={addLeaveOpen}
        onOpenChange={setAddLeaveOpen}
        onSuccess={loadData}
      />
    </div>
  );
};

export default OrgLeaveHistory;
