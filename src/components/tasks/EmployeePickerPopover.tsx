import { useState } from 'react';
import { X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEmployees } from '@/services/useEmployees';

interface EmployeePickerPopoverProps {
  value?: string | null;
  onChange: (employeeId: string | null) => void;
  children: React.ReactNode;
}

export const EmployeePickerPopover = ({ value, onChange, children }: EmployeePickerPopoverProps) => {
  const [open, setOpen] = useState(false);
  const { data: employees = [] } = useEmployees({ status: 'active', includeOffice: false });

  const handleSelect = (empId: string | null) => {
    onChange(empId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search employees..." />
          <CommandList>
            <CommandEmpty>No employees found.</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem onSelect={() => handleSelect(null)} value="__unassign__">
                  <X className="h-3 w-3 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Unassign</span>
                </CommandItem>
              )}
              {employees.map((emp: any) => {
                const name = emp.profiles?.full_name || 'Unknown';
                const avatar = emp.profiles?.avatar_url;
                const isSelected = emp.id === value;
                return (
                  <CommandItem
                    key={emp.id}
                    value={name}
                    onSelect={() => handleSelect(emp.id)}
                    className={isSelected ? 'bg-primary/10 text-primary' : ''}
                  >
                    <Avatar className="h-5 w-5 mr-2">
                      <AvatarImage src={avatar || undefined} />
                      <AvatarFallback className="text-[8px]">{name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
