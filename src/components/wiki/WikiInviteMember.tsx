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
  PopoverTrigger,
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

type SelectionType = 'everyone' | 'office' | 'department' | 'project' | 'member';

interface Selection {
  type: SelectionType;
  id: string;
  label: string;
}

interface WikiInviteMemberProps {
  employees: Employee[];
  offices: Office[];
  departments: string[];
  projects: Project[];
  excludedEmployeeIds: string[];
  onInvite: (employeeIds: string[], permission: 'view' | 'edit') => void;
  isInviting: boolean;
}

export const WikiInviteMember = ({
  employees,
  offices,
  departments,
  projects,
  excludedEmployeeIds,
  onInvite,
  isInviting,
}: WikiInviteMemberProps) => {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const resolveEmployeeIds = (): string[] => {
    const employeeIds = new Set<string>();
    
    selections.forEach(selection => {
      switch (selection.type) {
        case 'everyone':
          availableEmployees.forEach(emp => employeeIds.add(emp.id));
          break;
        case 'office':
          employees
            .filter(emp => emp.office_id === selection.id && !excludedEmployeeIds.includes(emp.id))
            .forEach(emp => employeeIds.add(emp.id));
          break;
        case 'department':
          employees
            .filter(emp => emp.department === selection.id && !excludedEmployeeIds.includes(emp.id))
            .forEach(emp => employeeIds.add(emp.id));
          break;
        case 'project':
          // Projects need to be resolved via employee_projects junction - for now add all
          // This would need a lookup table in real implementation
          break;
        case 'member':
          if (!excludedEmployeeIds.includes(selection.id)) {
            employeeIds.add(selection.id);
          }
          break;
      }
    });

    return Array.from(employeeIds);
  };

  const handleInvite = () => {
    if (selections.length === 0) return;
    const employeeIds = resolveEmployeeIds();
    if (employeeIds.length === 0) {
      return;
    }
    onInvite(employeeIds, permission);
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
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">Invite Members</span>
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

      <div className="flex items-stretch gap-2">
        {/* Selection input */}
        <div className="flex-1">
          <Popover open={searchOpen} onOpenChange={setSearchOpen} modal={false}>
            <PopoverTrigger asChild>
              <div
                className={cn(
                  "flex flex-wrap items-center gap-1.5 min-h-10 px-3 py-2 rounded-md border border-input bg-background cursor-text",
                  "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
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
                  className="flex-1 min-w-20 border-0 p-0 h-6 focus-visible:ring-0 shadow-none"
                  onFocus={() => setSearchOpen(true)}
                />
              </div>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[350px] p-0 bg-popover z-50" 
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                // Don't close when clicking inside the trigger
                const target = e.target as HTMLElement;
                if (target.closest('[data-radix-popover-trigger]')) {
                  e.preventDefault();
                }
              }}
            >
              <Command shouldFilter={false}>
                <CommandInput 
                  placeholder="Search..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  autoFocus
                />
                <CommandList className="max-h-[300px]">
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
                            <span className="text-sm">{project.name}</span>
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
                    </>
                  )}
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
          disabled={selections.length === 0 || isInviting}
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
