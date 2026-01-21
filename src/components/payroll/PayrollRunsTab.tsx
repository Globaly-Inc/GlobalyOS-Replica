import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { 
  usePayrollRuns, usePayrollProfiles, useCreatePayrollRun, 
  useUpdatePayrollRunStatus, useCalculatePayroll, usePayrollRunItems 
} from "@/services/usePayroll";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Calculator, Play, Check, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import type { PayrollRun, CreatePayrollRunInput, PayrollRunStatus, PayrollRunItem } from "@/types/payroll";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const PayrollRunsTab = () => {
  const { currentOrg } = useOrganization();
  const { data: runs, isLoading } = usePayrollRuns();
  const { data: profiles } = usePayrollProfiles();
  const createRun = useCreatePayrollRun();
  const updateStatus = useUpdatePayrollRunStatus();
  const calculatePayroll = useCalculatePayroll();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  
  const now = new Date();
  const [formData, setFormData] = useState<Partial<CreatePayrollRunInput>>({
    payroll_profile_id: '',
    period_start: format(startOfMonth(now), 'yyyy-MM-dd'),
    period_end: format(endOfMonth(now), 'yyyy-MM-dd'),
    pay_date: format(addDays(endOfMonth(now), 5), 'yyyy-MM-dd'),
  });

  const handleOpenCreate = () => {
    if (!profiles?.length) {
      toast.error("Please create a payroll profile first");
      return;
    }
    const now = new Date();
    setFormData({
      payroll_profile_id: profiles[0].id,
      period_start: format(startOfMonth(now), 'yyyy-MM-dd'),
      period_end: format(endOfMonth(now), 'yyyy-MM-dd'),
      pay_date: format(addDays(endOfMonth(now), 5), 'yyyy-MM-dd'),
    });
    setCreateDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentOrg?.id || !formData.payroll_profile_id) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      await createRun.mutateAsync({
        ...formData as CreatePayrollRunInput,
        organization_id: currentOrg.id,
      });
      toast.success("Payroll run created");
      setCreateDialogOpen(false);
    } catch (error) {
      toast.error("Failed to create payroll run");
    }
  };

  const handleCalculate = async (run: PayrollRun) => {
    try {
      await calculatePayroll.mutateAsync({ payrollRunId: run.id });
      toast.success("Payroll calculated successfully");
    } catch (error) {
      toast.error("Failed to calculate payroll");
    }
  };

  const handleApprove = async (run: PayrollRun) => {
    try {
      await updateStatus.mutateAsync({ id: run.id, status: 'approved' });
      toast.success("Payroll approved");
    } catch (error) {
      toast.error("Failed to approve payroll");
    }
  };

  const handleLock = async (run: PayrollRun) => {
    try {
      await updateStatus.mutateAsync({ id: run.id, status: 'locked' });
      toast.success("Payroll locked");
    } catch (error) {
      toast.error("Failed to lock payroll");
    }
  };

  const handleViewDetails = (run: PayrollRun) => {
    setSelectedRun(run);
    setDetailsDialogOpen(true);
  };

  const getStatusColor = (status: PayrollRunStatus) => {
    switch (status) {
      case 'locked': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'calculated': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProfileName = (profileId: string) => {
    return profiles?.find(p => p.id === profileId)?.name || 'Unknown';
  };

  const getRunLabel = (run: PayrollRun) => {
    return `${format(new Date(run.period_start), 'MMM yyyy')} Payroll`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Payroll Runs</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage payroll processing cycles
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Run
        </Button>
      </div>

      {runs?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Payroll Runs</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Create your first payroll run to start processing
            </p>
            <Button onClick={handleOpenCreate} disabled={!profiles?.length}>
              <Plus className="h-4 w-4 mr-2" />
              Create Payroll Run
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {runs?.map((run) => (
            <Card key={run.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{getRunLabel(run)}</CardTitle>
                    <CardDescription className="mt-1">
                      {getProfileName(run.payroll_profile_id)} • {format(new Date(run.period_start), 'MMM d')} - {format(new Date(run.period_end), 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(run.status)}>
                    {run.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {run.summary_totals && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Employees</p>
                      <p className="font-medium">{run.summary_totals.total_employees || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gross Pay</p>
                      <p className="font-medium">{(run.summary_totals.total_gross_earnings || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deductions</p>
                      <p className="font-medium">{(run.summary_totals.total_deductions || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net Pay</p>
                      <p className="font-medium">{(run.summary_totals.total_net_pay || 0).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(run)}>
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  {run.status === 'draft' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleCalculate(run)}
                      disabled={calculatePayroll.isPending}
                    >
                      {calculatePayroll.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3 mr-1" />
                      )}
                      Calculate
                    </Button>
                  )}
                  {run.status === 'calculated' && (
                    <Button size="sm" onClick={() => handleApprove(run)}>
                      <Check className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                  )}
                  {run.status === 'approved' && (
                    <Button size="sm" onClick={() => handleLock(run)}>
                      <Check className="h-3 w-3 mr-1" />
                      Lock & Finalize
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payroll Run</DialogTitle>
            <DialogDescription>
              Start a new payroll processing cycle
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile">Payroll Profile *</Label>
              <Select
                value={formData.payroll_profile_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, payroll_profile_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period_start">Period Start</Label>
                <DatePicker
                  value={formData.period_start}
                  onChange={(value) => setFormData(prev => ({ ...prev, period_start: value }))}
                  placeholder="Select start date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period_end">Period End</Label>
                <DatePicker
                  value={formData.period_end}
                  onChange={(value) => setFormData(prev => ({ ...prev, period_end: value }))}
                  placeholder="Select end date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay_date">Pay Date</Label>
              <DatePicker
                value={formData.pay_date}
                onChange={(value) => setFormData(prev => ({ ...prev, pay_date: value }))}
                placeholder="Select pay date"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createRun.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <PayrollRunDetails 
        run={selectedRun} 
        open={detailsDialogOpen} 
        onOpenChange={setDetailsDialogOpen} 
      />
    </div>
  );
};

interface EmployeeInfo {
  id: string;
  full_name: string;
  avatar_url: string | null;
  position: string;
}

const PayrollRunDetails = ({ 
  run, 
  open, 
  onOpenChange 
}: { 
  run: PayrollRun | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) => {
  const { currentOrg } = useOrganization();
  const { data: items, isLoading: itemsLoading } = usePayrollRunItems(run?.id);
  
  // Fetch employee details for all items
  const employeeIds = items?.map(item => item.employee_id) || [];
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['payroll-employees', employeeIds],
    queryFn: async () => {
      if (employeeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('employee_directory')
        .select('id, full_name, avatar_url, position')
        .in('id', employeeIds);
      if (error) throw error;
      return data as EmployeeInfo[];
    },
    enabled: employeeIds.length > 0,
  });

  const getEmployeeInfo = (employeeId: string): EmployeeInfo | undefined => {
    return employees?.find(e => e.id === employeeId);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!run) return null;

  const isLoading = itemsLoading || employeesLoading;

  const getRunLabel = (run: PayrollRun) => {
    return `${format(new Date(run.period_start), 'MMM yyyy')} Payroll`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getRunLabel(run)}</DialogTitle>
          <DialogDescription>
            {format(new Date(run.period_start), 'MMM d')} - {format(new Date(run.period_end), 'MMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : items?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No payroll items. Calculate payroll to generate items.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead className="text-right">Employer Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((item) => {
                const employee = getEmployeeInfo(item.employee_id);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={employee?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {employee ? getInitials(employee.full_name) : '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{employee?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{employee?.position || ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.currency} {item.gross_earnings.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">-{item.currency} {item.total_deductions.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">{item.currency} {item.net_pay.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.currency} {item.employer_contributions_total.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
