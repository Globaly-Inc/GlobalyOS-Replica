import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, X, UserPlus, Loader2 } from 'lucide-react';
import { useEmployees } from '@/services/useEmployees';
import { useUpdateKpiOwner, useLogKpiActivity } from '@/services/useKpi';
import { toast } from 'sonner';

interface Owner {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

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
  currentOwners: Owner[];
}

export function EditKpiOwnersDialog({ 
  open, 
  onOpenChange, 
  kpiId, 
  currentOwners 
}: EditKpiOwnersDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(
    currentOwners.length > 0 ? currentOwners[0] : null
  );
  
  const { data: employeesData, isLoading: employeesLoading } = useEmployees();
  const updateOwner = useUpdateKpiOwner();
  const logActivity = useLogKpiActivity();

  // Cast employees to proper type
  const employees = (employeesData as unknown as Employee[]) || [];

  const filteredEmployees = useMemo(() => {
    if (!employees || !searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return employees
      .filter(emp => 
        emp.profiles?.full_name?.toLowerCase().includes(query) ||
        emp.position?.toLowerCase().includes(query) ||
        emp.department?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [employees, searchQuery]);

  const handleSelectOwner = async (employee: Employee) => {
    const newOwner: Owner = {
      id: employee.id,
      full_name: employee.profiles?.full_name || 'Unknown',
      avatar_url: employee.profiles?.avatar_url || null,
    };
    
    try {
      await updateOwner.mutateAsync({
        kpiId,
        employeeId: employee.id,
      });
      
      // Log the activity
      await logActivity.mutateAsync({
        kpiId,
        actionType: 'owner_added',
        description: `Changed owner to ${newOwner.full_name}`,
        oldValue: selectedOwner ? { owner: selectedOwner.full_name } : undefined,
        newValue: { owner: newOwner.full_name },
      });
      
      setSelectedOwner(newOwner);
      setSearchQuery('');
      toast.success(`Owner changed to ${newOwner.full_name}`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update owner');
    }
  };

  const handleRemoveOwner = async () => {
    if (!selectedOwner) return;
    
    try {
      await updateOwner.mutateAsync({
        kpiId,
        employeeId: null,
      });
      
      await logActivity.mutateAsync({
        kpiId,
        actionType: 'owner_removed',
        description: `Removed owner ${selectedOwner.full_name}`,
        oldValue: { owner: selectedOwner.full_name },
      });
      
      setSelectedOwner(null);
      toast.success('Owner removed');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to remove owner');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage KPI Owner</DialogTitle>
          <DialogDescription>
            Assign an employee as the owner of this KPI
          </DialogDescription>
        </DialogHeader>
        
        {/* Current Owner */}
        {selectedOwner && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Current Owner</label>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedOwner.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedOwner.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedOwner.full_name}</p>
                  <Badge variant="secondary" className="text-xs">Primary Owner</Badge>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive"
                onClick={handleRemoveOwner}
                disabled={updateOwner.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Search */}
        <div className="space-y-3">
          <label className="text-sm font-medium">
            {selectedOwner ? 'Change Owner' : 'Assign Owner'}
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
                      onClick={() => handleSelectOwner(employee)}
                      disabled={updateOwner.isPending}
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
      </DialogContent>
    </Dialog>
  );
}
