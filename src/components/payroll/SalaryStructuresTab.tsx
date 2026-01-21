import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { useSalaryStructures, useCreateSalaryStructure, usePayrollProfiles } from "@/services/usePayroll";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Plus, DollarSign, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { format } from "date-fns";
import type { CreateSalaryStructureInput, SalaryPeriod, SalaryType } from "@/types/payroll";

const SALARY_PERIODS: { value: SalaryPeriod; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

const SALARY_TYPES: { value: SalaryType; label: string }[] = [
  { value: 'gross', label: 'Gross Salary' },
  { value: 'ctc', label: 'Cost to Company' },
  { value: 'net', label: 'Net Salary' },
];

export const SalaryStructuresTab = () => {
  const { currentOrg } = useOrganization();
  const { data: profiles } = usePayrollProfiles();
  
  // Simple employee query for payroll
  const { data: employees } = useQuery({
    queryKey: ['payroll-employees', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('id, position, user_id, profiles:user_id(full_name)')
        .eq('organization_id', currentOrg.id)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });
  const createStructure = useCreateSalaryStructure();

  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const { data: structures, isLoading } = useSalaryStructures(selectedEmployee || undefined);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateSalaryStructureInput>>({
    employee_id: '',
    base_salary_amount: 0,
    salary_period: 'monthly',
    salary_type: 'gross',
    effective_from: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleOpenCreate = () => {
    if (!profiles?.length) {
      toast.error("Please create a payroll profile first");
      return;
    }
    setFormData({
      employee_id: selectedEmployee || '',
      base_salary_amount: 0,
      salary_period: 'monthly',
      salary_type: 'gross',
      effective_from: format(new Date(), 'yyyy-MM-dd'),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentOrg?.id || !formData.employee_id || !formData.base_salary_amount) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      await createStructure.mutateAsync({
        ...formData as CreateSalaryStructureInput,
        organization_id: currentOrg.id,
      });
      toast.success("Salary structure created");
      setDialogOpen(false);
      setSelectedEmployee(formData.employee_id);
    } catch (error) {
      toast.error("Failed to create salary structure");
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees?.find(e => e.id === employeeId);
    return emp?.profiles?.full_name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Salary Structures</h2>
          <p className="text-sm text-muted-foreground">
            Manage employee salary configurations
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Salary
        </Button>
      </div>

      {/* Employee selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <Label>Select Employee</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder="Select an employee to view salary" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.profiles?.full_name} - {emp.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedEmployee ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Select an Employee</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Choose an employee above to view or add salary structures
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
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
      ) : structures?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Salary Structures</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Add a salary structure for this employee
            </p>
            <Button onClick={handleOpenCreate} disabled={!profiles?.length}>
              <Plus className="h-4 w-4 mr-2" />
              Add Salary Structure
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {structures?.map((structure) => (
            <Card key={structure.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {getEmployeeName(structure.employee_id)}
                    </CardTitle>
                    <CardDescription className="mt-1 capitalize">
                      {structure.salary_type} salary
                    </CardDescription>
                  </div>
                  <Badge variant={structure.effective_to ? "secondary" : "default"}>
                    {structure.effective_to ? 'Inactive' : 'Active'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Salary:</span>
                    <span className="font-medium">
                      {structure.base_salary_amount.toLocaleString()} / {structure.salary_period}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Effective:</span>
                    <span>{format(new Date(structure.effective_from), 'dd MMM yyyy')}</span>
                  </div>
                  {structure.components && structure.components.length > 0 && (
                    <div className="pt-2 border-t mt-2">
                      <p className="text-muted-foreground mb-1">Components:</p>
                      {structure.components.map(comp => (
                        <div key={comp.id} className="flex justify-between text-xs">
                          <span>{comp.name}</span>
                          <span>{comp.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Salary Structure</DialogTitle>
            <DialogDescription>
              Configure salary details for an employee
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.profiles?.full_name} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_salary">Base Salary *</Label>
                <Input
                  id="base_salary"
                  type="number"
                  value={formData.base_salary_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_salary_amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="50000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary_period">Period</Label>
                <Select
                  value={formData.salary_period}
                  onValueChange={(value: SalaryPeriod) => setFormData(prev => ({ ...prev, salary_period: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALARY_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary_type">Salary Type</Label>
              <Select
                value={formData.salary_type}
                onValueChange={(value: SalaryType) => setFormData(prev => ({ ...prev, salary_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective_from">Effective From</Label>
              <DatePicker
                value={formData.effective_from}
                onChange={(value) => setFormData(prev => ({ ...prev, effective_from: value }))}
                placeholder="Select effective date"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createStructure.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
