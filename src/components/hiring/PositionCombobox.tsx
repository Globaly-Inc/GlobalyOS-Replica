import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePositions, useCreatePosition } from '@/hooks/usePositions';
import { useDepartments } from '@/hooks/useOrganizationData';
import { toast } from 'sonner';

interface PositionComboboxProps {
  value: string;
  onChange: (value: string) => void;
  departmentId?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function PositionCombobox({
  value,
  onChange,
  departmentId,
  placeholder = 'Select or create position...',
  disabled = false,
}: PositionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newPositionDepartmentId, setNewPositionDepartmentId] = useState<string | undefined>(departmentId);
  
  const { data: positions = [], isLoading } = usePositions(departmentId);
  const { data: departments = [], isLoading: isDepartmentsLoading } = useDepartments();
  const createPosition = useCreatePosition();

  // Reset department selection when popover closes or departmentId prop changes
  useEffect(() => {
    setNewPositionDepartmentId(departmentId);
  }, [departmentId, open]);

  // Filter positions based on search
  const filteredPositions = useMemo(() => {
    if (!search) return positions;
    const searchLower = search.toLowerCase();
    return positions.filter(p => p.name.toLowerCase().includes(searchLower));
  }, [positions, search]);

  // Check if we can create a new position (search doesn't match any existing)
  const canCreate = useMemo(() => {
    if (!search.trim()) return false;
    const searchLower = search.toLowerCase().trim();
    return !positions.some(p => p.name.toLowerCase() === searchLower);
  }, [positions, search]);

  // Get display value
  const selectedPosition = positions.find(p => p.name === value);
  const displayValue = selectedPosition?.name || value;

  const handleCreate = async () => {
    if (!search.trim()) return;
    
    try {
      const newPosition = await createPosition.mutateAsync({
        name: search.trim(),
        department_id: newPositionDepartmentId,
      });
      onChange(newPosition.name);
      setSearch('');
      setNewPositionDepartmentId(departmentId);
      setOpen(false);
      toast.success(`Position "${newPosition.name}" created`);
    } catch (error) {
      toast.error('Failed to create position');
    }
  };

  const handleSelect = (positionName: string) => {
    onChange(positionName === value ? '' : positionName);
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state when closing
      setSearch('');
      setNewPositionDepartmentId(departmentId);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {displayValue || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search positions..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                  No positions found.
                </CommandEmpty>
                
                {filteredPositions.length > 0 && (
                  <CommandGroup heading="Existing Positions">
                    {filteredPositions.map((position) => (
                      <CommandItem
                        key={position.id}
                        value={position.name}
                        onSelect={() => handleSelect(position.name)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === position.name ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {position.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {canCreate && (
                  <>
                    {filteredPositions.length > 0 && <CommandSeparator />}
                    <CommandGroup heading="Create New">
                      <div className="px-2 py-2 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          {createPosition.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Plus className="h-4 w-4 text-primary" />
                          )}
                          <span className="font-medium text-primary">
                            Create "{search.trim()}"
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            Department:
                          </span>
                          <Select
                            value={newPositionDepartmentId || '_none'}
                            onValueChange={(val) => setNewPositionDepartmentId(val === '_none' ? undefined : val)}
                            disabled={isDepartmentsLoading}
                          >
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">
                                <span className="text-muted-foreground">No department</span>
                              </SelectItem>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Button
                          size="sm"
                          className="w-full h-8"
                          onClick={handleCreate}
                          disabled={createPosition.isPending}
                        >
                          {createPosition.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Position'
                          )}
                        </Button>
                      </div>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
