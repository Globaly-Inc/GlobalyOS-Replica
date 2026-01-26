import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
import { Check, X, AlertTriangle, Users, ChevronsUpDown, CalendarDays, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useEmployees } from "@/services/useEmployees";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { OrgLink } from "@/components/OrgLink";
import { ApproveLeaveDialog } from "@/components/dialogs/ApproveLeaveDialog";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

interface LeaveBalance {
  leaveTypeName: string;
  currentBalance: number;
  maxNegative: number;
  availableBalance: number;
}

interface PendingLeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  half_day_type: 'full' | 'first_half' | 'second_half';
  reason: string | null;
  created_at: string;
  isHRBackup?: boolean;
  managerName?: string;
  balance?: LeaveBalance;
  employee: {
    id: string;
    position?: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

interface LeaveHistoryPendingTabProps {
  onApprovalChange?: () => void;
  selectedEmployees?: string[];
  onSelectedEmployeesChange?: (ids: string[]) => void;
}

export const LeaveHistoryPendingTab = ({ 
  onApprovalChange,
  selectedEmployees: externalSelectedEmployees,
  onSelectedEmployeesChange,
}: LeaveHistoryPendingTabProps) => {
  const { currentOrg } = useOrganization();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { data: currentEmployee, isLoading: employeeLoading } = useCurrentEmployee();
  
  const canEditAll = isOwner || isAdmin || isHR;
  
  const [pendingRequests, setPendingRequests] = useState<PendingLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Use external filter state if provided, otherwise use internal state
  const [internalSelectedEmployees, setInternalSelectedEmployees] = useState<string[]>([]);
  const selectedEmployees = externalSelectedEmployees ?? internalSelectedEmployees;
  const setSelectedEmployees = onSelectedEmployeesChange ?? setInternalSelectedEmployees;
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkApproveDialog, setBulkApproveDialog] = useState(false);
  const [bulkRejectDialog, setBulkRejectDialog] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  
  // Single action dialogs
  const [approveDialog, setApproveDialog] = useState<{
    open: boolean;
    request: PendingLeaveRequest | null;
  }>({ open: false, request: null });
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    request: PendingLeaveRequest | null;
  }>({ open: false, request: null });

  // Check if current user is a manager
  const [isManager, setIsManager] = useState(false);
  const [directReportIds, setDirectReportIds] = useState<string[]>([]);

  // Fetch employees for filter dropdown
  const { data: employeesData = [] } = useEmployees({ status: 'active' });
  const allEmployees = (employeesData as unknown) as Array<{
    id: string;
    profiles?: { full_name?: string; avatar_url?: string | null };
  }>;

  // Filter employees visible in dropdown based on role
  const visibleEmployees = useMemo(() => {
    if (canEditAll) return allEmployees;
    if (isManager && currentEmployee?.id) {
      return allEmployees.filter(e => 
        e.id === currentEmployee.id || directReportIds.includes(e.id)
      );
    }
    return allEmployees.filter(e => e.id === currentEmployee?.id);
  }, [allEmployees, canEditAll, isManager, currentEmployee?.id, directReportIds]);

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

  // Batch fetch balances with office-aware leave type resolution
  const fetchBalancesBatchOfficeAware = async (
    requests: Array<{ employeeId: string; officeId: string | null; leaveType: string }>,
    requestYear: number
  ): Promise<Map<string, LeaveBalance>> => {
    if (!currentOrg || requests.length === 0) return new Map();
    
    // Get unique office IDs (filter out nulls)
    const officeIds = [...new Set(requests.map(r => r.officeId).filter(Boolean))] as string[];
    
    if (officeIds.length === 0) return new Map();

    // Fetch all office_leave_types for these offices in one query
    const { data: officeLeaveTypes } = await supabase
      .from("office_leave_types")
      .select("id, name, max_negative_days, office_id")
      .in("office_id", officeIds)
      .eq("is_active", true);

    // Build map: "officeId:leaveTypeName" -> leave type info
    const officeLeaveTypesMap = new Map<string, { id: string; name: string; max_negative_days: number; office_id: string }>();
    (officeLeaveTypes || []).forEach(lt => {
      officeLeaveTypesMap.set(`${lt.office_id}:${lt.name.toLowerCase()}`, lt);
    });

    // Get all office_leave_type_ids we need
    const leaveTypeIds = requests
      .map(r => r.officeId ? officeLeaveTypesMap.get(`${r.officeId}:${r.leaveType.toLowerCase()}`)?.id : null)
      .filter(Boolean) as string[];

    if (leaveTypeIds.length === 0) return new Map();

    // Fetch balances using correct office_leave_type_ids
    const { data: balances } = await supabase
      .from("leave_type_balances")
      .select("employee_id, office_leave_type_id, balance")
      .in("employee_id", [...new Set(requests.map(r => r.employeeId))])
      .in("office_leave_type_id", [...new Set(leaveTypeIds)])
      .eq("year", requestYear);

    // Build result map
    const balanceMap = new Map<string, LeaveBalance>();
    requests.forEach(req => {
      if (!req.officeId) return;
      
      const leaveType = officeLeaveTypesMap.get(`${req.officeId}:${req.leaveType.toLowerCase()}`);
      if (!leaveType) return;

      const balance = (balances || []).find(
        (b: any) => b.employee_id === req.employeeId && b.office_leave_type_id === leaveType.id
      );

      const currentBalance = balance?.balance || 0;
      const maxNegative = leaveType.max_negative_days || 0;

      balanceMap.set(`${req.employeeId}:${req.leaveType.toLowerCase()}`, {
        leaveTypeName: leaveType.name,
        currentBalance,
        maxNegative,
        availableBalance: currentBalance + maxNegative,
      });
    });

    return balanceMap;
  };

  // Load pending requests
  const loadPendingRequests = async () => {
    if (!currentOrg?.id || !currentEmployee?.id) return;
    setLoading(true);

    try {
      const today = format(new Date(), "yyyy-MM-dd");

      let requests: PendingLeaveRequest[] = [];

      if (canEditAll) {
        // Owner/Admin/HR can see all pending requests (include office_id)
        const { data: allPending } = await supabase
          .from("leave_requests")
          .select(`
            id,
            leave_type,
            start_date,
            end_date,
            days_count,
            half_day_type,
            reason,
            created_at,
            employee:employees!leave_requests_employee_id_fkey(
              id,
              position,
              manager_id,
              office_id,
              profiles!inner(full_name, avatar_url)
            )
          `)
          .eq("organization_id", currentOrg.id)
          .eq("status", "pending")
          .order("created_at", { ascending: true });

        if (allPending) {
          // Get all manager IDs to check if they're on leave
          const managerIds = [...new Set(allPending
            .map((req: any) => req.employee?.manager_id)
            .filter(Boolean))] as string[];

          // Batch check which managers are on leave
          const { data: managersOnLeave } = await supabase
            .from("leave_requests")
            .select("employee_id")
            .in("employee_id", managerIds)
            .eq("status", "approved")
            .lte("start_date", today)
            .gte("end_date", today);

          const managersOnLeaveSet = new Set((managersOnLeave || []).map(m => m.employee_id));

          // Batch fetch manager names
          const { data: managerProfiles } = await supabase
            .from("employees")
            .select("id, profiles!inner(full_name)")
            .in("id", managerIds);

          const managerNamesMap = new Map(
            (managerProfiles || []).map((m: any) => [m.id, m.profiles?.full_name || "Manager"])
          );

          // Build request info with office_id for batch fetching
          const requestYear = allPending.length > 0 
            ? new Date(allPending[0].start_date).getFullYear() 
            : new Date().getFullYear();

          const requestsInfo = allPending.map((req: any) => ({
            employeeId: req.employee.id,
            officeId: req.employee.office_id,
            leaveType: req.leave_type,
          }));

          const balanceMap = await fetchBalancesBatchOfficeAware(requestsInfo, requestYear);

          requests = allPending.map((req: any) => {
            const balance = balanceMap.get(`${req.employee.id}:${req.leave_type.toLowerCase()}`);
            const managerId = req.employee?.manager_id;
            const isHRBackup = managerId ? managersOnLeaveSet.has(managerId) : !managerId;
            const managerName = managerId 
              ? managerNamesMap.get(managerId)
              : null;

            return {
              ...req,
              balance,
              isHRBackup,
              managerName,
            } as PendingLeaveRequest;
          });
        }
      } else if (isManager) {
        // Manager can only see direct reports' pending requests (include office_id)
        const { data: directReportRequests } = await supabase
          .from("leave_requests")
          .select(`
            id,
            leave_type,
            start_date,
            end_date,
            days_count,
            half_day_type,
            reason,
            created_at,
            employee:employees!leave_requests_employee_id_fkey(
              id,
              position,
              manager_id,
              office_id,
              profiles!inner(full_name, avatar_url)
            )
          `)
          .eq("organization_id", currentOrg.id)
          .eq("status", "pending")
          .order("created_at", { ascending: true });

        const managerRequests = (directReportRequests || []).filter((req: any) => 
          req.employee?.manager_id === currentEmployee.id
        );

        const requestYear = managerRequests.length > 0 
          ? new Date(managerRequests[0].start_date).getFullYear() 
          : new Date().getFullYear();

        // Build request info with office_id for batch fetching
        const requestsInfo = managerRequests.map((req: any) => ({
          employeeId: req.employee.id,
          officeId: req.employee.office_id,
          leaveType: req.leave_type,
        }));

        const balanceMap = await fetchBalancesBatchOfficeAware(requestsInfo, requestYear);

        requests = managerRequests.map((req: any) => {
          const balance = balanceMap.get(`${req.employee.id}:${req.leave_type.toLowerCase()}`);
          return { 
            ...req, 
            balance,
            managerName: currentEmployee?.profiles?.full_name || 'You',
          } as PendingLeaveRequest;
        });
      }

      setPendingRequests(requests);
    } catch (error) {
      console.error("Error loading pending requests:", error);
      toast.error("Failed to load pending requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg?.id && currentEmployee?.id && !roleLoading && !employeeLoading) {
      loadPendingRequests();

      // Set up realtime subscription
      const channel = supabase
        .channel('pending-leave-history')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leave_requests',
            filter: `organization_id=eq.${currentOrg.id}`,
          },
          () => {
            loadPendingRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentOrg?.id, currentEmployee?.id, roleLoading, employeeLoading, isManager, directReportIds.length]);

  // Filtered requests based on employee selection
  const filteredRequests = useMemo(() => {
    if (selectedEmployees.length === 0) return pendingRequests;
    return pendingRequests.filter(r => selectedEmployees.includes(r.employee?.id || ''));
  }, [pendingRequests, selectedEmployees]);

  // Pagination
  const pagination = usePagination({
    pageKey: 'pending-leave-history',
    defaultPageSize: 20,
  });

  useEffect(() => {
    pagination.setTotalCount(filteredRequests.length);
  }, [filteredRequests.length]);

  const paginatedRequests = useMemo(() => {
    return filteredRequests.slice(pagination.from, pagination.from + pagination.pageSize);
  }, [filteredRequests, pagination.from, pagination.pageSize]);

  // Selection handlers
  const isSelected = (id: string) => selectedIds.includes(id);
  
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(filteredRequests.map(r => r.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const allSelected = filteredRequests.length > 0 && 
    filteredRequests.every(r => isSelected(r.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  // Approval handlers
  const handleApproval = async (requestId: string, approved: boolean, newLeaveType?: string) => {
    setProcessing(requestId);
    
    const leaveRequest = pendingRequests.find(r => r.id === requestId);
    if (!leaveRequest) {
      setProcessing(null);
      return;
    }

    const updateData: any = {
      status: approved ? "approved" : "rejected",
      reviewed_by: currentEmployee?.id,
      reviewed_at: new Date().toISOString(),
    };

    if (approved && newLeaveType && newLeaveType !== leaveRequest.leave_type) {
      // Try office_leave_types first based on employee's office
      const { data: empOffice } = await supabase
        .from("employees")
        .select("office_id")
        .eq("id", leaveRequest.employee.id)
        .maybeSingle();

      let newLeaveTypeData = null;

      if (empOffice?.office_id) {
        const { data: officeType } = await supabase
          .from("office_leave_types")
          .select("id")
          .eq("office_id", empOffice.office_id)
          .ilike("name", newLeaveType)
          .eq("is_active", true)
          .maybeSingle();
        newLeaveTypeData = officeType;
      }

      if (newLeaveTypeData) {
        updateData.leave_type = newLeaveType;
        updateData.office_leave_type_id = newLeaveTypeData.id;
      } else {
        toast.error(`Could not find leave type: ${newLeaveType}`);
        setProcessing(null);
        return;
      }
    }

    const { error } = await supabase
      .from("leave_requests")
      .update(updateData)
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to update leave request");
      console.error("Update leave status error:", error);
    } else {
      const action = approved 
        ? (newLeaveType && newLeaveType !== leaveRequest.leave_type 
            ? `approved as ${newLeaveType}` 
            : "approved")
        : "rejected";
      toast.success(`Leave request ${action}`);
      
      // Send notification email
      try {
        await supabase.functions.invoke("notify-leave-decision", {
          body: {
            request_id: requestId,
            decision: approved ? "approved" : "rejected",
            reviewer_name: currentEmployee?.profiles?.full_name || "Manager",
          },
        });
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
      }

      onApprovalChange?.();
      loadPendingRequests();
    }
    
    setProcessing(null);
  };

  // Bulk handlers
  const handleBulkApprove = async () => {
    setBulkProcessing(true);
    let successCount = 0;
    
    for (const id of selectedIds) {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: "approved",
          reviewed_by: currentEmployee?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      
      if (!error) successCount++;
    }
    
    toast.success(`Approved ${successCount} of ${selectedIds.length} requests`);
    setSelectedIds([]);
    setBulkApproveDialog(false);
    setBulkProcessing(false);
    onApprovalChange?.();
    loadPendingRequests();
  };

  const handleBulkReject = async () => {
    setBulkProcessing(true);
    let successCount = 0;
    
    for (const id of selectedIds) {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: "rejected",
          reviewed_by: currentEmployee?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      
      if (!error) successCount++;
    }
    
    toast.success(`Rejected ${successCount} of ${selectedIds.length} requests`);
    setSelectedIds([]);
    setBulkRejectDialog(false);
    setBulkProcessing(false);
    onApprovalChange?.();
    loadPendingRequests();
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  };

  const hasInsufficientBalance = (request: PendingLeaveRequest) => {
    if (!request.balance) return false;
    return request.days_count > request.balance.availableBalance;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading pending requests...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canEditAll && !isManager) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            You don't have permission to approve leave requests.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-1">
                No pending requests
              </h3>
              <p className="text-sm text-muted-foreground">
                All leave requests have been processed
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => checked ? selectAll() : deselectAll()}
                        aria-label="Select all"
                        className={someSelected ? "opacity-50" : ""}
                      />
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden lg:table-cell">Manager</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead className="hidden md:table-cell">Balance</TableHead>
                    <TableHead className="hidden md:table-cell">Reason</TableHead>
                    <TableHead className="hidden md:table-cell">Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected(request.id)}
                          onCheckedChange={() => toggleSelection(request.id)}
                          aria-label={`Select ${request.employee?.profiles?.full_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <OrgLink 
                          to={`/team/${request.employee?.id}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={request.employee?.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(request.employee?.profiles?.full_name || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate text-sm">
                              {request.employee?.profiles?.full_name}
                            </div>
                            {request.employee?.position && (
                              <div className="text-xs text-muted-foreground truncate">
                                {request.employee.position}
                              </div>
                            )}
                          </div>
                        </OrgLink>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {request.managerName ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{request.managerName}</span>
                            {request.isHRBackup && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 border-amber-200">
                                On Leave
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {request.leave_type}
                          </Badge>
                          {request.half_day_type !== 'full' && (
                            <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                              {request.half_day_type === 'first_half' ? '1st Half' : '2nd Half'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            {format(parseISO(request.start_date), "dd MMM")}
                            {request.end_date !== request.start_date && (
                              <> → {format(parseISO(request.end_date), "dd MMM")}</>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {request.days_count}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {request.balance ? (
                          <div className="space-y-0.5">
                            <div className={cn(
                              "text-sm",
                              hasInsufficientBalance(request) && "text-destructive"
                            )}>
                              {request.balance.currentBalance.toFixed(1)} days
                            </div>
                            {hasInsufficientBalance(request) && (
                              <div className="flex items-center gap-1 text-xs text-destructive">
                                <AlertTriangle className="h-3 w-3" />
                                Insufficient
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[150px]">
                        <span className="text-sm text-muted-foreground truncate block" title={request.reason || ""}>
                          {request.reason || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
                        {format(parseISO(request.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => {
                                    if (hasInsufficientBalance(request)) {
                                      setApproveDialog({ open: true, request });
                                    } else {
                                      handleApproval(request.id, true);
                                    }
                                  }}
                                  disabled={processing === request.id}
                                >
                                  {processing === request.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Approve</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setRejectDialog({ open: true, request })}
                                  disabled={processing === request.id}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reject</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {filteredRequests.length > 0 && (
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

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={deselectAll}
            >
              Clear
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setBulkApproveDialog(true)}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve All
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setBulkRejectDialog(true)}
            >
              <X className="h-4 w-4 mr-1" />
              Reject All
            </Button>
          </div>
        </div>
      )}

      {/* Approve Dialog (for insufficient balance warning) */}
      <ApproveLeaveDialog
        open={approveDialog.open}
        onOpenChange={(open) => setApproveDialog({ open, request: open ? approveDialog.request : null })}
        request={approveDialog.request ? {
          id: approveDialog.request.id,
          leave_type: approveDialog.request.leave_type,
          start_date: approveDialog.request.start_date,
          days_count: approveDialog.request.days_count,
          employee: approveDialog.request.employee,
        } : null}
        onApprove={(requestId, newLeaveType) => {
          handleApproval(requestId, true, newLeaveType);
          setApproveDialog({ open: false, request: null });
        }}
        processing={processing === approveDialog.request?.id}
      />

      {/* Reject Confirmation Dialog */}
      <AlertDialog 
        open={rejectDialog.open} 
        onOpenChange={(open) => setRejectDialog({ open, request: open ? rejectDialog.request : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Leave Request?</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectDialog.request && (
                <>
                  Are you sure you want to reject {rejectDialog.request.employee?.profiles?.full_name}'s 
                  {' '}{rejectDialog.request.leave_type} request for {rejectDialog.request.days_count} day
                  {rejectDialog.request.days_count !== 1 ? 's' : ''}?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (rejectDialog.request) {
                  handleApproval(rejectDialog.request.id, false);
                  setRejectDialog({ open: false, request: null });
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Approve Dialog */}
      <AlertDialog open={bulkApproveDialog} onOpenChange={setBulkApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {selectedIds.length} Requests?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve all {selectedIds.length} selected leave requests?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkApprove}
              disabled={bulkProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {bulkProcessing ? "Approving..." : "Approve All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Reject Dialog */}
      <AlertDialog open={bulkRejectDialog} onOpenChange={setBulkRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {selectedIds.length} Requests?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject all {selectedIds.length} selected leave requests?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkReject}
              disabled={bulkProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {bulkProcessing ? "Rejecting..." : "Reject All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeaveHistoryPendingTab;
