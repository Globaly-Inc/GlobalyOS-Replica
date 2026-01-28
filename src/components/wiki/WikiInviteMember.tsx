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
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Globe, ChevronDown, X, Loader2, Info, Building2, Users, FolderKanban, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTeamPresence } from "@/services/useTeamData";

interface Employee {
  id: string;
  user_id: string;
  office_id?: string | null;
  department?: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email?: string;
  };
}

interface Office {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

export type SelectionType = 'everyone' | 'office' | 'department' | 'project' | 'member';

export interface Selection {
  type: SelectionType;
  id: string;
  label: string;
}

interface WikiAddMemberProps {
  employees: Employee[];
  offices: Office[];
  departments: string[];
  projects: Project[];
  employeeProjects: { employee_id: string; project_id: string }[];
  excludedEmployeeIds: string[];
  onAdd: (selections: Selection[], permission: 'view' | 'edit') => void;
  isAdding: boolean;
}

export const WikiAddMember = ({
  employees,
  offices,
  departments,
  projects,
  employeeProjects,
  excludedEmployeeIds,
  onAdd,
  isAdding,
}: WikiAddMemberProps) => {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get online statuses for employees
  const employeeIds = useMemo(() => employees.map(e => e.id), [employees]);
  const onlineStatuses = useTeamPresence(employeeIds);

  // Count employees per group
  const employeeCountByOffice = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(emp => {
      if (emp.office_id) {
        counts[emp.office_id] = (counts[emp.office_id] || 0) + 1;
      }
    });
    return counts;
  }, [employees]);

  const employeeCountByDepartment = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(emp => {
      if (emp.department) {
        counts[emp.department] = (counts[emp.department] || 0) + 1;
      }
    });
    return counts;
  }, [employees]);

  const employeeCountByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    employeeProjects.forEach(ep => {
      counts[ep.project_id] = (counts[ep.project_id] || 0) + 1;
    });
    return counts;
  }, [employeeProjects]);

  const availableEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        !excludedEmployeeIds.includes(emp.id) &&
        !selections.some((s) => s.type === 'member' && s.id === emp.id)
    );
  }, [employees, excludedEmployeeIds, selections]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    // Filter offices
    const filteredOffices = offices.filter(o => 
      o.name.toLowerCase().includes(query) &&
      !selections.some(s => s.type === 'office' && s.id === o.id)
    );

    // Filter departments
    const filteredDepartments = departments.filter(d => 
      d.toLowerCase().includes(query) &&
      !selections.some(s => s.type === 'department' && s.id === d)
    );

    // Filter projects
    const filteredProjects = projects.filter(p => 
      p.name.toLowerCase().includes(query) &&
      !selections.some(s => s.type === 'project' && s.id === p.id)
    );

    // Filter members
    const filteredMembers = availableEmployees.filter(emp =>
      emp.profiles?.full_name?.toLowerCase().includes(query) ||
      emp.profiles?.email?.toLowerCase().includes(query)
    );

    // Show "Everyone" option
    const showEveryone = !selections.some(s => s.type === 'everyone') &&
      ('everyone'.includes(query) || 'all'.includes(query) || !query);

    return {
      showEveryone,
      offices: filteredOffices,
      departments: filteredDepartments,
      projects: filteredProjects,
      members: filteredMembers,
    };
  }, [searchQuery, offices, departments, projects, availableEmployees, selections]);

  const handleSelect = (selection: Selection) => {
    setSelections(prev => [...prev, selection]);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const handleRemoveSelection = (selection: Selection) => {
    setSelections(prev => prev.filter(s => !(s.type === selection.type && s.id === selection.id)));
  };

  const handleAdd = () => {
    if (selections.length === 0) return;
    onAdd(selections, permission);
    setSelections([]);
  };

  const getSelectionIcon = (type: SelectionType) => {
    switch (type) {
      case 'everyone': return <Users className="h-3 w-3" />;
      case 'office': return <Building2 className="h-3 w-3" />;
      case 'department': return <Users className="h-3 w-3" />;
      case 'project': return <FolderKanban className="h-3 w-3" />;
      case 'member': return <User className="h-3 w-3" />;
    }
  };

  const getSelectionColor = (type: SelectionType) => {
    switch (type) {
      case 'everyone': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
      case 'office': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'department': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'project': return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      case 'member': return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const hasResults = filteredItems.showEveryone || 
    filteredItems.offices.length > 0 || 
    filteredItems.departments.length > 0 || 
    filteredItems.projects.length > 0 || 
    filteredItems.members.length > 0;

  return (
    <div className="space-y-3 w-full overflow-hidden">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">Add People</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Add team members, offices, departments, or projects</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Row 1: Search input - full width */}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverAnchor asChild>
          <div
            className={cn(
              "flex flex-wrap items-center gap-1.5 min-h-10 px-3 py-2 rounded-md border border-input bg-background cursor-text"
            )}
            onClick={() => setSearchOpen(true)}
          >
            {selections.map((sel, idx) => (
              <Badge
                key={`${sel.type}-${sel.id}-${idx}`}
                variant="secondary"
                className={cn("gap-1 pl-1.5 pr-1 py-0.5 border", getSelectionColor(sel.type))}
              >
                {getSelectionIcon(sel.type)}
                <span className="text-xs">{sel.label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveSelection(sel);
                  }}
                  className="hover:bg-foreground/10 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={selections.length === 0 ? "Search members, offices, departments..." : ""}
              className="flex-1 min-w-20 border-0 p-0 h-6 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent"
              onFocus={() => setSearchOpen(true)}
              onBlur={(e) => {
                // Only close if clicking outside the popover
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (!relatedTarget?.closest('[data-radix-popover-content-wrapper]')) {
                  setTimeout(() => setSearchOpen(false), 150);
                }
              }}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover z-50 max-h-[300px] overflow-hidden" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false} className="h-full">
            <CommandList className="max-h-[280px] overflow-y-auto">
              {!hasResults && <CommandEmpty>No results found</CommandEmpty>}
              
              {/* Quick Actions - Everyone */}
              {filteredItems.showEveryone && (
                <CommandGroup heading="Quick Actions">
                  <CommandItem
                    value="everyone"
                    onSelect={() => handleSelect({ type: 'everyone', id: 'everyone', label: `Everyone (${availableEmployees.length})` })}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Everyone</span>
                      <span className="text-xs text-muted-foreground">{availableEmployees.length} members</span>
                    </div>
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Offices */}
              {filteredItems.offices.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Offices">
                    {filteredItems.offices.map(office => (
                      <CommandItem
                        key={office.id}
                        value={`office-${office.name}`}
                        onSelect={() => handleSelect({ type: 'office', id: office.id, label: office.name })}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div className="h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm">{office.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {employeeCountByOffice[office.id] || 0} members
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Departments */}
              {filteredItems.departments.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Departments">
                    {filteredItems.departments.map(dept => (
                      <CommandItem
                        key={dept}
                        value={`dept-${dept}`}
                        onSelect={() => handleSelect({ type: 'department', id: dept, label: dept })}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div className="h-7 w-7 rounded-full bg-purple-500/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm">{dept}</span>
                          <span className="text-xs text-muted-foreground">
                            {employeeCountByDepartment[dept] || 0} members
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Projects */}
              {filteredItems.projects.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Projects">
                    {filteredItems.projects.map(project => (
                      <CommandItem
                        key={project.id}
                        value={`project-${project.name}`}
                        onSelect={() => handleSelect({ type: 'project', id: project.id, label: project.name })}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <FolderKanban className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm">{project.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {employeeCountByProject[project.id] || 0} members
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Members */}
              {filteredItems.members.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Members">
                    {filteredItems.members.slice(0, 10).map(emp => (
                      <CommandItem
                        key={emp.id}
                        value={`member-${emp.profiles?.full_name || emp.id}`}
                        onSelect={() => handleSelect({ 
                          type: 'member', 
                          id: emp.id, 
                          label: emp.profiles?.full_name?.split(' ')[0] || 'Member'
                        })}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div className="relative">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {emp.profiles?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          {onlineStatuses[emp.id] && (
                            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-background" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm">{emp.profiles?.full_name}</span>
                          {emp.profiles?.email && (
                            <span className="text-xs text-muted-foreground">{emp.profiles.email}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                    {filteredItems.members.length > 10 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        +{filteredItems.members.length - 10} more members
                      </div>
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Row 2: Permission dropdown + Invite button - full width */}
      <div className="flex items-center gap-2 w-full">
        {/* Permission dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-1.5 flex-1">
              <Globe className="h-4 w-4" />
              <span>can {permission}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
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

        {/* Add button */}
        <Button
          onClick={handleAdd}
          disabled={selections.length === 0 || isAdding}
          className="flex-1"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Add"
          )}
        </Button>
      </div>
    </div>
  );
};
