import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, X, UserPlus, Loader2, Star } from 'lucide-react';
import { useEmployees } from '@/services/useEmployees';
import { useUpdateIndividualKpiOwner, useAddKpiOwner, useRemoveKpiOwner, useSetPrimaryOwner, KpiOwner } from '@/services/useKpiOwners';
import { useLogKpiActivity } from '@/services/useKpi';
import { toast } from 'sonner';

interface Employee {
  id: string;
  position?: string;
  department?: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface EditKpiOwnersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpiId: string;
  currentOwners: KpiOwner[];
  scopeType: string;
}

export function EditKpiOwnersDialog({ 
  open, 
  onOpenChange, 
  kpiId, 
  currentOwners,
  scopeType
}: EditKpiOwnersDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: employeesData, isLoading: employeesLoading } = useEmployees();
  const updateIndividualOwner = useUpdateIndividualKpiOwner();
  const addOwner = useAddKpiOwner();
  const removeOwner = useRemoveKpiOwner();
  const setPrimaryOwner = useSetPrimaryOwner();
  const logActivity = useLogKpiActivity();

  const isIndividual = scopeType === 'individual';
  const employees = (employeesData as unknown as Employee[]) || [];

  // Filter out employees who are already owners
  const filteredEmployees = useMemo(() => {
    if (!employees || !searchQuery.trim()) return [];
    
    const ownerIds = new Set(currentOwners.map(o => o.employee_id));
    const query = searchQuery.toLowerCase();
    
    return employees
      .filter(emp => 
        !ownerIds.has(emp.id) && (
          emp.profiles?.full_name?.toLowerCase().includes(query) ||
          emp.position?.toLowerCase().includes(query) ||
          emp.department?.toLowerCase().includes(query)
        )
      )
      .slice(0, 10);
  }, [employees, searchQuery, currentOwners]);

  const handleAddOwner = async (employee: Employee) => {
    const fullName = employee.profiles?.full_name || 'Unknown';
    
    try {
      if (isIndividual) {
        // For individual KPIs, update the employee_id field
        await updateIndividualOwner.mutateAsync({
          kpiId,
          employeeId: employee.id,
        });
      } else {
        // For group/org KPIs, add to kpi_owners table
        await addOwner.mutateAsync({
          kpiId,
          employeeId: employee.id,
          isPrimary: currentOwners.length === 0, // First owner is primary
        });
      }
      
      await logActivity.mutateAsync({
        kpiId,
        actionType: 'owner_added',
        description: `Added ${fullName} as owner`,
        newValue: { owner: fullName },
      });
      
      setSearchQuery('');
      toast.success(`Added ${fullName} as owner`);
      
      if (isIndividual) {
        onOpenChange(false);
      }
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleRemoveOwner = async (owner: KpiOwner) => {
    try {
      if (isIndividual) {
        await updateIndividualOwner.mutateAsync({
          kpiId,
          employeeId: null,
        });
      } else {
        await removeOwner.mutateAsync({
          kpiId,
          employeeId: owner.employee_id,
        });
      }
      
      await logActivity.mutateAsync({
        kpiId,
        actionType: 'owner_removed',
        description: `Removed ${owner.full_name} as owner`,
        oldValue: { owner: owner.full_name },
      });
      
      toast.success(`Removed ${owner.full_name}`);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleSetPrimary = async (owner: KpiOwner) => {
    if (isIndividual || owner.is_primary) return;
    
    try {
      await setPrimaryOwner.mutateAsync({
        kpiId,
        employeeId: owner.employee_id,
      });
      
      await logActivity.mutateAsync({
        kpiId,
        actionType: 'primary_owner_changed',
        description: `Set ${owner.full_name} as primary owner`,
        newValue: { primary_owner: owner.full_name },
      });
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const isPending = updateIndividualOwner.isPending || addOwner.isPending || removeOwner.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isIndividual ? 'Manage KPI Owner' : 'Manage KPI Owners'}
          </DialogTitle>
          <DialogDescription>
            {isIndividual 
              ? 'Assign an employee as the owner of this KPI'
              : 'Add or remove owners for this KPI. Multiple owners can be assigned.'}
          </DialogDescription>
        </DialogHeader>
        
        {/* Current Owners */}
        {currentOwners.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {isIndividual ? 'Current Owner' : `Current Owners (${currentOwners.length})`}
            </label>
            <div className="space-y-2">
              {currentOwners.map((owner) => (
                <div 
                  key={owner.employee_id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={owner.avatar_url || undefined} />
                      <AvatarFallback>
                        {owner.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{owner.full_name}</p>
                      {owner.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isIndividual && !owner.is_primary && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSetPrimary(owner)}
                        disabled={isPending}
                        title="Set as primary"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveOwner(owner)}
                      disabled={isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Search - Only show if individual has no owner OR not individual */}
        {(!isIndividual || currentOwners.length === 0) && (
          <div className="space-y-3">
            <label className="text-sm font-medium">
              {currentOwners.length > 0 ? 'Add Another Owner' : 'Assign Owner'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Search Results */}
            {searchQuery.trim() && (
              <ScrollArea className="h-[200px] border rounded-lg">
                {employeesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No employees found
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredEmployees.map((employee) => (
                      <button
                        key={employee.id}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                        onClick={() => handleAddOwner(employee)}
                        disabled={isPending}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={employee.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {employee.profiles?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {employee.profiles?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {employee.position} • {employee.department}
                          </p>
                        </div>
                        <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
