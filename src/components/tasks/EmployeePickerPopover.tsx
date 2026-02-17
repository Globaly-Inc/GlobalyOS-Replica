import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEmployees } from '@/services/useEmployees';

interface EmployeePickerPopoverProps {
  value?: string | null;
  onChange: (employeeId: string | null) => void;
  children: React.ReactNode;
}

export const EmployeePickerPopover = ({ value, onChange, children }: EmployeePickerPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: employees = [] } = useEmployees({ status: 'active', includeOffice: false });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter((e: any) => {
      const name = e.profiles?.full_name?.toLowerCase() || '';
      const email = e.profiles?.email?.toLowerCase() || '';
      return name.includes(q) || email.includes(q);
    });
  }, [employees, search]);

  const handleSelect = (empId: string | null) => {
    onChange(empId);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="h-7 text-xs pl-7"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="max-h-[200px]">
          <div className="p-1">
            {value && (
              <button
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md hover:bg-muted transition-colors text-muted-foreground"
                onClick={() => handleSelect(null)}
              >
                <X className="h-3 w-3" />
                Unassign
              </button>
            )}
            {filtered.map((emp: any) => {
              const name = emp.profiles?.full_name || 'Unknown';
              const avatar = emp.profiles?.avatar_url;
              const isSelected = emp.id === value;
              return (
                <button
                  key={emp.id}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md transition-colors ${
                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => handleSelect(emp.id)}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={avatar || undefined} />
                    <AvatarFallback className="text-[8px]">{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{name}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No employees found</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
