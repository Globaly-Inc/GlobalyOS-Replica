import { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { OrgLink } from "@/components/OrgLink";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Search, Download, Pencil, TrendingUp, TrendingDown, Calendar, Trash2, Eye, AlertTriangle, Award, Upload, X, CalendarDays, Plus } from "lucide-react";
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
import { AddLeaveForEmployeeDialog } from "@/components/dialogs/AddLeaveForEmployeeDialog";
import { useLeaveHistoryFilters } from "@/hooks/useLeaveHistoryFilters";

interface LeaveTransaction {
  id: string;
  type: 'leave_taken' | 'adjustment';
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
  if (balance < 0) {
    return <span className="text-destructive font-medium">({Math.abs(balance)})</span>;
  }
  return <span className={balance > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>{balance}</span>;
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
  const [searchQuery, setSearchQuery] = useState("");
  
  const {
    statusFilter, setStatusFilter,
    leaveTypeFilter, setLeaveTypeFilter,
    transactionTypeFilter, setTransactionTypeFilter,
    yearFilter, setYearFilter,
  } = useLeaveHistoryFilters();
  
  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);
  
  // Stats for cards
  const [prevYearStats, setPrevYearStats] = useState<Record<string, { days: number }>>({});
  const [leaveTypeStats, setLeaveTypeStats] = useState<Array<{
    leave_type: string;
    total_days: number;
    balance: number;
  }>>([]);
  
  const [editAdjustment, setEditAdjustment] = useState<any>(null);
  const [editRequest, setEditRequest] = useState<any>(null);
  const [deleteAdjustmentDialog, setDeleteAdjustmentDialog] = useState<{ open: boolean; adjustment: LeaveTransaction | null }>({ open: false, adjustment: null });
  const [deletingAdjustment, setDeletingAdjustment] = useState(false);
  
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
  const canEditTransaction = (t: LeaveTransaction) => {
    if (canEditAll) return true; // Owner/Admin/HR can edit all
    
    // Manager can edit their own and direct reports' leave
    if (isManager) {
      if (t.employee?.id === currentEmployee?.id) return true;
      if (directReportIds.includes(t.employee?.id || '')) return true;
    }
    
    return false; // Regular users cannot edit
  };

  useEffect(() => {
    if (!currentOrg?.id) return;
    if (roleLoading || employeeLoading) return;
    if (!currentEmployee?.id) return;

    loadData();
  }, [currentOrg?.id, yearFilter, roleLoading, employeeLoading, currentEmployee?.id, isOwner, isAdmin, isHR, isManager, directReportIds]);

  const loadData = async () => {
    if (!currentOrg?.id || !currentEmployee?.id) return;
    setLoading(true);
    
    try {
      const currentYear = parseInt(yearFilter);
      const prevYear = currentYear - 1;
      const startOfYear = `${yearFilter}-01-01`;
      const endOfYear = `${yearFilter}-12-31`;
      const startOfPrevYear = `${prevYear}-01-01`;
      const endOfPrevYear = `${prevYear}-12-31`;

      // Fetch leave types from database for name normalization
      const { data: leaveTypesData } = await supabase
        .from("leave_types")
        .select("name")
        .eq("organization_id", currentOrg.id);
      
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
          employee:employees!leave_balance_logs_employee_id_fkey(
            id,
            position,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq("organization_id", currentOrg.id)
        .gte("effective_date", startOfYear)
        .lte("effective_date", endOfYear)
        .order("effective_date", { ascending: false });

      // Filter by allowed employee IDs if not admin/HR/owner
      if (allowedEmployeeIds) {
        logsQuery = logsQuery.in("employee_id", allowedEmployeeIds);
      }

      const { data: logsData, error: logsError } = await logsQuery;

      if (logsError) throw logsError;

      // Load previous year data for comparison
      let prevRequestsQuery = supabase
        .from("leave_requests")
        .select("leave_type, days_count, status")
        .eq("organization_id", currentOrg.id)
        .eq("status", "approved")
        .gte("start_date", startOfPrevYear)
        .lte("start_date", endOfPrevYear);

      if (allowedEmployeeIds) {
        prevRequestsQuery = prevRequestsQuery.in("employee_id", allowedEmployeeIds);
      }

      const { data: prevRequestsData } = await prevRequestsQuery;

      // Calculate previous year stats by leave type (normalized)
      const prevStats: Record<string, { days: number }> = {};
      (prevRequestsData || []).forEach((r: any) => {
        const normalizedType = normalizeLeaveType(r.leave_type);
        if (!prevStats[normalizedType]) {
          prevStats[normalizedType] = { days: 0 };
        }
        prevStats[normalizedType].days += r.days_count;
      });
      setPrevYearStats(prevStats);

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

      const adjustmentTransactions: LeaveTransaction[] = (logsData || []).map((l: any) => ({
        id: l.id,
        type: 'adjustment' as const,
        leave_type: normalizeLeaveType(l.leave_type),
        days: l.change_amount,
        effective_date: l.effective_date || l.created_at.split('T')[0],
        reason: l.reason,
        previous_balance: l.previous_balance,
        new_balance: l.new_balance,
        employee: l.employee
      }));

      const allTransactions = [...requestTransactions, ...adjustmentTransactions];

      // Calculate leave type stats (days taken and balance) - already normalized above
      const typeStats: Record<string, { total_days: number; adjustments: number }> = {};
      allTransactions.forEach(t => {
        if (!typeStats[t.leave_type]) {
          typeStats[t.leave_type] = { total_days: 0, adjustments: 0 };
        }
        if (t.type === 'leave_taken' && t.status === 'approved') {
          typeStats[t.leave_type].total_days += Math.abs(t.days);
        }
        if (t.type === 'adjustment') {
          typeStats[t.leave_type].adjustments += t.days;
        }
      });

      const leaveTypeStatsArray = Object.entries(typeStats).map(([leave_type, stats]) => ({
        leave_type,
        total_days: stats.total_days,
        balance: stats.adjustments - stats.total_days
      }));
      setLeaveTypeStats(leaveTypeStatsArray);

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
  }, [yearFilter, statusFilter, leaveTypeFilter, transactionTypeFilter, searchQuery]);

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.employee?.profiles?.full_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter || (t.type === 'adjustment' && statusFilter === 'all');
    const matchesType = leaveTypeFilter === "all" || t.leave_type === leaveTypeFilter;
    const matchesTransType = transactionTypeFilter === "all" || t.type === transactionTypeFilter;
    return matchesSearch && matchesStatus && matchesType && matchesTransType;
  });

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

  // Calculate employee leave totals for Most/Least cards
  const employeeLeaveTotals = useMemo(() => {
    const totals: Record<string, { employee: LeaveTransaction['employee']; totalDays: number }> = {};
    
    transactions
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
  }, [transactions]);

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

  const pendingCount = transactions.filter(r => r.status === "pending").length;
  const approvedCount = transactions.filter(r => r.status === "approved").length;
  const rejectedCount = transactions.filter(r => r.status === "rejected").length;
  const adjustmentCount = transactions.filter(r => r.type === "adjustment").length;

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <div className="space-y-6 pt-4 md:pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6" />
            Leave History
          </h1>
          <p className="text-muted-foreground">
            {canEditAll
              ? "View all leave transactions across the organization"
              : isManager
              ? "Your leave history and direct reports"
              : "Your leave history"}
          </p>
        </div>
        {canEditAll && (
          <div className="flex items-center gap-2">
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-full sm:w-28">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="leave_taken">Leave Taken</SelectItem>
            <SelectItem value="adjustment">Adjustments</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
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
            <div className="text-2xl font-bold mb-2">{transactions.filter(t => t.type === 'leave_taken').length}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span className="text-amber-600">● {pendingCount} Pending</span>
              <span className="text-green-600">✓ {approvedCount} Approved</span>
              <span className="text-destructive">✗ {rejectedCount} Rejected</span>
            </div>
          </CardContent>
        </Card>

        {/* Leave Type Cards */}
        {leaveTypeStats.map(stat => {
          const prevYear = prevYearStats[stat.leave_type];
          const prevDays = prevYear?.days || 0;
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
                
                {/* % Change from last year */}
                <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : isNegative ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {isPositive && <TrendingUp className="h-3 w-3" />}
                  {isNegative && <TrendingDown className="h-3 w-3" />}
                  <span>
                    {percentChange === 0 ? 'No change' : `${isPositive ? '+' : ''}${percentChange}% from last year`}
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
        
        {/* Most Leave Taken Employee */}
        <Card>
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

        {/* Least Leave Taken Employee */}
        <Card>
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
      </div>

      {/* Leave Analytics Chart */}
      <LeaveAnalyticsChart 
        transactions={transactions.map(t => ({
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
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
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
                      <TableHead className="w-[40px]">
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
                    <TableHead className="w-[180px]">Employee</TableHead>
                    <TableHead className="w-[85px] whitespace-nowrap">Applied</TableHead>
                    <TableHead className="w-[155px]">Leave Dates</TableHead>
                    <TableHead className="w-[70px]">Type</TableHead>
                    <TableHead className="w-[95px]">Leave Type</TableHead>
                    <TableHead className="text-center w-[50px]">Days</TableHead>
                    <TableHead className="w-[85px]">Status</TableHead>
                    <TableHead className="text-center w-[60px]">Balance</TableHead>
                    <TableHead className="flex-1 min-w-[120px]">Reason</TableHead>
                    <TableHead className="w-[85px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((t) => (
                    <TableRow 
                      key={`${t.type}-${t.id}`} 
                      className={`group ${isTransactionSelected(t.id, t.type) ? 'bg-primary/5' : ''}`}
                    >
                      {canEditAll && (
                        <TableCell>
                          <Checkbox
                            checked={isTransactionSelected(t.id, t.type)}
                            onCheckedChange={() => toggleTransactionSelection(t)}
                            aria-label={`Select ${t.employee?.profiles?.full_name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell>
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
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(t.effective_date), "dd MMM")}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {t.type === 'leave_taken' && t.start_date ? (
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span>
                              {format(new Date(t.start_date), "dd MMM")}
                              {t.end_date && t.start_date !== t.end_date && (
                                <span className="text-muted-foreground"> → {format(new Date(t.end_date), "dd MMM")}</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.type === 'leave_taken' ? (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 text-xs gap-1">
                            <TrendingDown className="h-3 w-3" />
                            Taken
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 text-xs gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Adjust
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{t.leave_type}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {formatDays(t.days)}
                      </TableCell>
                      <TableCell>{getStatusBadge(t.status)}</TableCell>
                      <TableCell className="text-center">
                        {formatBalance(t.balance_after)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" title={t.reason || ""}>
                        <span className="line-clamp-1">{t.reason || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex items-center gap-1">
                            {/* View - Always visible - Links to individual leave history */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <OrgLink to={`/team/${t.employee?.id}/leave-history`}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </OrgLink>
                              </TooltipTrigger>
                              <TooltipContent>View Leave History</TooltipContent>
                            </Tooltip>
                            
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
        </CardContent>
      </Card>

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
