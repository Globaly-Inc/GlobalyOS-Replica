import { useState, useMemo } from "react";
import { Search, X, Check, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  office_id?: string | null;
  department_id?: string | null;
  position?: string | null;
  employee_projects?: { project_id: string }[];
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
}

interface SearchableMemberPickerProps {
  employees: Employee[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  showPosition?: boolean;
}

const SearchableMemberPicker = ({
  employees,
  selectedIds,
  onSelect,
  onRemove,
  placeholder = "Search and select members...",
  emptyMessage = "No members found",
  showPosition = true,
}: SearchableMemberPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Filter employees based on search and exclude already selected
  const filteredEmployees = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    return employees
      .filter(emp => !selectedIds.includes(emp.id))
      .filter(emp => {
        if (!searchLower) return true;
        const name = emp.profiles?.full_name?.toLowerCase() || "";
        const email = emp.profiles?.email?.toLowerCase() || "";
        const position = (emp.position || "").toLowerCase();
        return name.includes(searchLower) || email.includes(searchLower) || position.includes(searchLower);
      });
  }, [employees, selectedIds, search]);

  // Get selected employees for badge display
  const selectedEmployees = useMemo(() => {
    return employees.filter(emp => selectedIds.includes(emp.id));
  }, [employees, selectedIds]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setSearch("");
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10 px-3 py-2"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">{placeholder}</span>
            </div>
            {selectedIds.length > 0 && (
              <Badge variant="secondary" className="ml-2 shrink-0">
                {selectedIds.length} selected
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border shadow-lg" 
          align="start"
          sideOffset={4}
        >
          {/* Search input */}
          <div className="flex items-center border-b px-3 py-2 bg-background">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 bg-transparent"
              autoFocus
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setSearch("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Member list */}
          <ScrollArea className="max-h-[280px]">
            {filteredEmployees.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                {search ? `No results for "${search}"` : emptyMessage}
              </div>
            ) : (
              <div className="p-1">
                {filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelect(emp.id)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-left",
                      "hover:bg-accent transition-colors",
                      "focus:outline-none focus:bg-accent"
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={emp.profiles?.avatar_url || ''} />
                      <AvatarFallback className="text-xs bg-muted">
                        {emp.profiles?.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {emp.profiles?.full_name}
                      </p>
                      {showPosition && emp.position && (
                        <p className="text-xs text-muted-foreground truncate">
                          {emp.position}
                        </p>
                      )}
                    </div>
                    <Check className="h-4 w-4 shrink-0 opacity-0" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer with count */}
          {filteredEmployees.length > 0 && (
            <div className="border-t px-3 py-2 text-xs text-muted-foreground bg-muted/30">
              {filteredEmployees.length} member{filteredEmployees.length !== 1 ? 's' : ''} available
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Selected members as badges */}
      {selectedEmployees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEmployees.map((emp) => (
            <Badge 
              key={emp.id} 
              variant="secondary" 
              className="gap-1.5 pr-1 py-1 h-auto"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={emp.profiles?.avatar_url || ''} />
                <AvatarFallback className="text-[10px]">
                  {emp.profiles?.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[100px] truncate text-xs">
                {emp.profiles?.full_name?.split(' ')[0]}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-destructive/20 rounded-full"
                onClick={() => onRemove(emp.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchableMemberPicker;
