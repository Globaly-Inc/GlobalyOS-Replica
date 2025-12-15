import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Globe, ChevronDown, X, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Employee {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email?: string;
  };
}

interface WikiInviteMemberProps {
  employees: Employee[];
  excludedEmployeeIds: string[];
  onInvite: (employeeIds: string[], permission: 'view' | 'edit') => void;
  isInviting: boolean;
}

export const WikiInviteMember = ({
  employees,
  excludedEmployeeIds,
  onInvite,
  isInviting,
}: WikiInviteMemberProps) => {
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const availableEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        !excludedEmployeeIds.includes(emp.id) &&
        !selectedEmployees.some((s) => s.id === emp.id)
    );
  }, [employees, excludedEmployeeIds, selectedEmployees]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return availableEmployees;
    const query = searchQuery.toLowerCase();
    return availableEmployees.filter(
      (emp) =>
        emp.profiles?.full_name?.toLowerCase().includes(query) ||
        emp.profiles?.email?.toLowerCase().includes(query)
    );
  }, [availableEmployees, searchQuery]);

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployees((prev) => [...prev, employee]);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const handleRemoveSelected = (employeeId: string) => {
    setSelectedEmployees((prev) => prev.filter((e) => e.id !== employeeId));
  };

  const handleInvite = () => {
    if (selectedEmployees.length === 0) return;
    onInvite(
      selectedEmployees.map((e) => e.id),
      permission
    );
    setSelectedEmployees([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">Invite Members</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Add team members to give them access</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-stretch gap-2">
        {/* Member selection input */}
        <div className="flex-1">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <div
                className={cn(
                  "flex flex-wrap items-center gap-1.5 min-h-10 px-3 py-2 rounded-md border border-input bg-background cursor-text",
                  "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                )}
                onClick={() => setSearchOpen(true)}
              >
                {selectedEmployees.map((emp) => (
                  <Badge
                    key={emp.id}
                    variant="secondary"
                    className="gap-1 pl-1.5 pr-1 py-0.5 bg-primary/10 text-primary border-primary/20"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {emp.profiles?.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{emp.profiles?.full_name?.split(' ')[0]}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSelected(emp.id);
                      }}
                      className="hover:bg-primary/20 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={selectedEmployees.length === 0 ? "Search members..." : ""}
                  className="flex-1 min-w-20 border-0 p-0 h-6 focus-visible:ring-0 shadow-none"
                  onFocus={() => setSearchOpen(true)}
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search members..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>No members found</CommandEmpty>
                  <CommandGroup>
                    {filteredEmployees.slice(0, 10).map((emp) => (
                      <CommandItem
                        key={emp.id}
                        value={emp.profiles?.full_name || emp.id}
                        onSelect={() => handleSelectEmployee(emp)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {emp.profiles?.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm">{emp.profiles?.full_name}</span>
                          {emp.profiles?.email && (
                            <span className="text-xs text-muted-foreground">{emp.profiles.email}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Permission dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-1.5 shrink-0">
              <Globe className="h-4 w-4" />
              <span>can {permission}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setPermission('edit')}
              className={cn(permission === 'edit' && "bg-muted")}
            >
              can edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setPermission('view')}
              className={cn(permission === 'view' && "bg-muted")}
            >
              can view
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Invite button */}
        <Button
          onClick={handleInvite}
          disabled={selectedEmployees.length === 0 || isInviting}
          className="shrink-0"
        >
          {isInviting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Invite"
          )}
        </Button>
      </div>
    </div>
  );
};
