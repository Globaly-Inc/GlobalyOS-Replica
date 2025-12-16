import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { OrgLink } from "@/components/OrgLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ArrowLeft, History, TrendingUp, TrendingDown, Calendar, Pencil, Download, X, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatDateRange } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { EditLeaveAdjustmentDialog } from "@/components/dialogs/EditLeaveAdjustmentDialog";
import { EditLeaveRequestDialog } from "@/components/dialogs/EditLeaveRequestDialog";

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
}

interface LeaveBalance {
  leave_type: string;
  balance: number;
}

const LeaveHistory = () => {
  const { id: employeeId } = useParams();
  const { isOwner, isAdmin, isHR } = useUserRole();
  const canEdit = isOwner || isAdmin || isHR;
  
  const [transactions, setTransactions] = useState<LeaveTransaction[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("all");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>("all");
  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);
  
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; request: LeaveTransaction | null }>({ open: false, request: null });
  const [deleteAdjustmentDialog, setDeleteAdjustmentDialog] = useState<{ open: boolean; adjustment: LeaveTransaction | null }>({ open: false, adjustment: null });
  const [canceling, setCanceling] = useState(false);
  const [deletingAdjustment, setDeletingAdjustment] = useState(false);
  const [editAdjustment, setEditAdjustment] = useState<any>(null);
  const [editRequest, setEditRequest] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (employeeId) {
      loadData();
      checkIsOwnProfile();
    }
  }, [employeeId, yearFilter]);

  const checkIsOwnProfile = async () => {
    if (!employeeId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: employeeData } = await supabase
      .from("employees")
      .select("user_id")
      .eq("id", employeeId)
      .single();
    
    setIsOwnProfile(employeeData?.user_id === user.id);
  };

  const loadData = async () => {
    if (!employeeId) return;
    setLoading(true);
    
    try {
      const startOfYear = `${yearFilter}-01-01`;
      const endOfYear = `${yearFilter}-12-31`;

      // Load employee name
      const { data: empData } = await supabase
        .from("employees")
        .select("profiles!inner(full_name)")
        .eq("id", employeeId)
        .single();
      
      if (empData) {
        setEmployeeName((empData.profiles as any).full_name);
      }

      // Load current balances
      const { data: balanceData } = await supabase
        .from("leave_type_balances")
        .select(`
          balance,
          leave_type:leave_types!inner(name)
        `)
        .eq("employee_id", employeeId)
        .eq("year", parseInt(yearFilter));

      if (balanceData) {
        setBalances(balanceData.map((b: any) => ({
          leave_type: b.leave_type.name,
          balance: b.balance
        })));
      }

      // Load leave requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("leave_requests")
        .select(`
          id,
          leave_type,
          start_date,
          end_date,
          days_count,
          half_day_type,
          reason,
          status
        `)
        .eq("employee_id", employeeId)
        .gte("start_date", startOfYear)
        .lte("start_date", endOfYear)
        .order("start_date", { ascending: false });

      if (requestsError) throw requestsError;

      // Load leave balance logs (adjustments)
      const { data: logsData, error: logsError } = await supabase
        .from("leave_balance_logs")
        .select(`
          id,
          leave_type,
          change_amount,
          previous_balance,
          new_balance,
          reason,
          effective_date,
          created_at
        `)
        .eq("employee_id", employeeId)
        .gte("effective_date", startOfYear)
        .lte("effective_date", endOfYear)
        .order("effective_date", { ascending: false });

      if (logsError) throw logsError;

      // Combine and format transactions
      const requestTransactions: LeaveTransaction[] = (requestsData || []).map((r: any) => ({
        id: r.id,
        type: 'leave_taken' as const,
        leave_type: r.leave_type,
        days: -r.days_count,
        effective_date: r.start_date,
        reason: r.reason,
        status: r.status,
        start_date: r.start_date,
        end_date: r.end_date,
        half_day_type: r.half_day_type
      }));

      const adjustmentTransactions: LeaveTransaction[] = (logsData || []).map((l: any) => ({
        id: l.id,
        type: 'adjustment' as const,
        leave_type: l.leave_type,
        days: l.change_amount,
        effective_date: l.effective_date || l.created_at.split('T')[0],
        reason: l.reason,
        previous_balance: l.previous_balance,
        new_balance: l.new_balance
      }));

      const allTransactions = [...requestTransactions, ...adjustmentTransactions]
        .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());

      // Calculate running balance per leave type
      const balanceMap: Record<string, number> = {};
      balances.forEach(b => { balanceMap[b.leave_type] = b.balance; });

      // Process in reverse to calculate balance_after
      const transactionsWithBalance = [...allTransactions].reverse().map(t => {
        const currentBalance = balanceMap[t.leave_type] || 0;
        balanceMap[t.leave_type] = currentBalance - t.days;
        return { ...t, balance_after: currentBalance };
      }).reverse();

      setTransactions(transactionsWithBalance);
      
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

  const filteredTransactions = transactions.filter((t) => {
    const matchesType = leaveTypeFilter === "all" || t.leave_type === leaveTypeFilter;
    const matchesTransType = transactionTypeFilter === "all" || t.type === transactionTypeFilter;
    return matchesType && matchesTransType;
  });

  const handleCancelRequest = async () => {
    if (!cancelDialog.request) return;
    setCanceling(true);

    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", cancelDialog.request.id);

    if (error) {
      toast.error("Failed to cancel leave request");
    } else {
      toast.success("Leave request cancelled");
      loadData();
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    }

    setCanceling(false);
    setCancelDialog({ open: false, request: null });
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

  const handleExportCSV = () => {
    const headers = ["Date", "Type", "Leave Type", "Days", "Status", "Balance", "Reason"];
    const rows = filteredTransactions.map(t => [
      t.effective_date,
      t.type === 'leave_taken' ? 'Leave Taken' : 'Adjustment',
      t.leave_type,
      t.days.toString(),
      t.status || "-",
      t.balance_after?.toString() || "-",
      t.reason || ""
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-history-${employeeName.replace(/\s+/g, '-')}-${yearFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export complete");
  };

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <OrgLink to={`/team/${employeeId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </OrgLink>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <History className="h-6 w-6" />
              Leave History
            </h1>
            {employeeName && (
              <p className="text-muted-foreground">{employeeName}</p>
            )}
          </div>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </div>

      {/* Current Balances Summary */}
      {balances.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {balances.map((b) => (
            <Badge key={b.leave_type} variant="outline" className="py-1.5 px-3 text-sm">
              {b.leave_type}: <span className="font-bold ml-1">{b.balance}</span> days
            </Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="leave_taken">Leave Taken</SelectItem>
            <SelectItem value="adjustment">Adjustments</SelectItem>
          </SelectContent>
        </Select>
        <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
          <SelectTrigger className="w-40">
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
                    <TableHead className="min-w-[100px]">Date</TableHead>
                    <TableHead className="min-w-[90px]">Type</TableHead>
                    <TableHead className="min-w-[110px]">Leave Type</TableHead>
                    <TableHead className="text-right min-w-[70px]">Days</TableHead>
                    <TableHead className="min-w-[85px]">Status</TableHead>
                    <TableHead className="text-right min-w-[80px]">Balance</TableHead>
                    <TableHead className="min-w-[140px]">Reason</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((t) => (
                    <TableRow key={`${t.type}-${t.id}`} className="group">
                      <TableCell className="text-sm">
                        {formatDate(t.effective_date)}
                        {t.end_date && t.start_date !== t.end_date && (
                          <span className="text-xs text-muted-foreground block">
                            → {formatDate(t.end_date)}
                          </span>
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
                      <TableCell className={`text-right font-medium ${t.days > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.days > 0 ? '+' : ''}{t.days}
                      </TableCell>
                      <TableCell>{getStatusBadge(t.status)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {t.balance_after !== undefined ? t.balance_after : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[140px]" title={t.reason || ""}>
                        {t.reason || "-"}
                      </TableCell>
                      <TableCell>
                        {(canEdit || (isOwnProfile && t.type === 'leave_taken' && t.status === 'pending')) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEdit && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (t.type === 'adjustment') {
                                      setEditAdjustment(mapToAdjustmentEdit(t));
                                    } else {
                                      setEditRequest(mapToRequestEdit(t));
                                    }
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canEdit && t.type === 'adjustment' && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteAdjustmentDialog({ open: true, adjustment: t })}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                              {(isOwnProfile || canEdit) && t.type === 'leave_taken' && t.status === 'pending' && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setCancelDialog({ open: true, request: t })}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel Request
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog 
        open={cancelDialog.open} 
        onOpenChange={(open) => !open && setCancelDialog({ open: false, request: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Leave Request?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelDialog.request && (
                <>
                  Are you sure you want to cancel this {cancelDialog.request.leave_type} request for{" "}
                  {Math.abs(cancelDialog.request.days)} {Math.abs(cancelDialog.request.days) === 1 ? "day" : "days"} (
                  {formatDateRange(cancelDialog.request.start_date!, cancelDialog.request.end_date || cancelDialog.request.start_date!)}
                  )? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRequest}
              disabled={canceling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {canceling ? "Cancelling..." : "Cancel Request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  {deleteAdjustmentDialog.adjustment.days > 0 ? '+' : ''}{deleteAdjustmentDialog.adjustment.days} days?
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
    </div>
  );
};

export default LeaveHistory;