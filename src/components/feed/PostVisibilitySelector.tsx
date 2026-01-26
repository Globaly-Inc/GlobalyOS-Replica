import { useState, useEffect, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Globe, Building2, Briefcase, FolderKanban, ChevronDown, Search, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccessScope = 'company' | 'offices' | 'departments' | 'projects';

interface Office {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface PostVisibilitySelectorProps {
  accessScope: AccessScope;
  onAccessScopeChange: (scope: AccessScope) => void;
  selectedOfficeIds: string[];
  onOfficeIdsChange: (ids: string[]) => void;
  selectedDepartments: string[];
  onDepartmentsChange: (depts: string[]) => void;
  selectedProjectIds: string[];
  onProjectIdsChange: (ids: string[]) => void;
  currentEmployeeOfficeId?: string | null;
  canPostToAllOffices?: boolean;
}

const SCOPE_OPTIONS: { value: AccessScope; label: string; icon: typeof Globe }[] = [
  { value: 'company', label: 'Everyone', icon: Globe },
  { value: 'offices', label: 'Specific Offices', icon: Building2 },
  { value: 'departments', label: 'Specific Departments', icon: Briefcase },
  { value: 'projects', label: 'Specific Projects', icon: FolderKanban },
];

export const PostVisibilitySelector = ({
  accessScope,
  onAccessScopeChange,
  selectedOfficeIds,
  onOfficeIdsChange,
  selectedDepartments,
  onDepartmentsChange,
  selectedProjectIds,
  onProjectIdsChange,
  currentEmployeeOfficeId,
  canPostToAllOffices = false,
}: PostVisibilitySelectorProps) => {
  const { currentOrg } = useOrganization();
  const [offices, setOffices] = useState<Office[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!currentOrg?.id) return;

    const loadData = async () => {
      const { data: officesData } = await supabase
        .from("offices")
        .select("id, name")
        .eq("organization_id", currentOrg.id)
        .order("name");
      if (officesData) setOffices(officesData);

      const { data: deptData } = await supabase
        .from("employees")
        .select("department")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active");
      if (deptData) {
        const uniqueDepts = [...new Set(deptData.map(e => e.department).filter(Boolean))];
        setDepartments(uniqueDepts.sort());
      }

      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", currentOrg.id)
        .order("name");
      if (projectsData) setProjects(projectsData);
    };

    loadData();
  }, [currentOrg?.id]);

  // Reset search when popover closes
  useEffect(() => {
    if (!popoverOpen) setSearchQuery("");
  }, [popoverOpen]);

  const handleScopeChange = (scope: AccessScope) => {
    onAccessScopeChange(scope);
    if (scope !== 'offices') onOfficeIdsChange([]);
    if (scope !== 'departments') onDepartmentsChange([]);
    if (scope !== 'projects') onProjectIdsChange([]);
    setSearchQuery("");
  };

  const toggleOffice = (officeId: string) => {
    onOfficeIdsChange(
      selectedOfficeIds.includes(officeId)
        ? selectedOfficeIds.filter(id => id !== officeId)
        : [...selectedOfficeIds, officeId]
    );
  };

  const toggleDepartment = (dept: string) => {
    onDepartmentsChange(
      selectedDepartments.includes(dept)
        ? selectedDepartments.filter(d => d !== dept)
        : [...selectedDepartments, dept]
    );
  };

  const toggleProject = (projectId: string) => {
    onProjectIdsChange(
      selectedProjectIds.includes(projectId)
        ? selectedProjectIds.filter(id => id !== projectId)
        : [...selectedProjectIds, projectId]
    );
  };

  const currentScopeOption = SCOPE_OPTIONS.find(o => o.value === accessScope)!;
  const ScopeIcon = currentScopeOption.icon;

  const getTriggerLabel = () => {
    if (accessScope === 'company') return 'Everyone';
    return currentScopeOption.label;
  };

  // Get selected items with names for tags
  const getSelectedItems = (): { id: string; name: string }[] => {
    switch (accessScope) {
      case 'offices':
        return offices.filter(o => selectedOfficeIds.includes(o.id));
      case 'departments':
        return selectedDepartments.map(d => ({ id: d, name: d }));
      case 'projects':
        return projects.filter(p => selectedProjectIds.includes(p.id));
      default:
        return [];
    }
  };

  const handleRemoveItem = (id: string) => {
    switch (accessScope) {
      case 'offices':
        onOfficeIdsChange(selectedOfficeIds.filter(i => i !== id));
        break;
      case 'departments':
        onDepartmentsChange(selectedDepartments.filter(d => d !== id));
        break;
      case 'projects':
        onProjectIdsChange(selectedProjectIds.filter(i => i !== id));
        break;
    }
  };

  // Filter offices based on permissions
  const availableOffices = useMemo(() => {
    if (canPostToAllOffices) {
      return offices; // Owner/Admin/HR see all offices
    }
    // Regular members: only their own office
    if (currentEmployeeOfficeId) {
      return offices.filter(o => o.id === currentEmployeeOfficeId);
    }
    return []; // No office assigned = can't post to specific offices
  }, [offices, canPostToAllOffices, currentEmployeeOfficeId]);

  // Filter scope options based on available offices
  const availableScopeOptions = useMemo(() => {
    return SCOPE_OPTIONS.filter(option => {
      if (option.value === 'offices') {
        return availableOffices.length > 0;
      }
      return true;
    });
  }, [availableOffices]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return { offices: availableOffices, departments, projects };
    }
    return {
      offices: availableOffices.filter(o => o.name.toLowerCase().includes(query)),
      departments: departments.filter(d => d.toLowerCase().includes(query)),
      projects: projects.filter(p => p.name.toLowerCase().includes(query)),
    };
  }, [searchQuery, availableOffices, departments, projects]);

  const getItemsForScope = () => {
    switch (accessScope) {
      case 'offices': return filteredItems.offices;
      case 'departments': return filteredItems.departments;
      case 'projects': return filteredItems.projects;
      default: return [];
    }
  };

  const items = getItemsForScope();
  const selectedItems = getSelectedItems();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2 font-normal justify-between"
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Visible to:</span>
              <ScopeIcon className="h-4 w-4" />
              <span>{getTriggerLabel()}</span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          {/* Scope Selection */}
          <div className="p-2 border-b space-y-0.5">
            {availableScopeOptions.map(option => {
              const Icon = option.icon;
              const isSelected = accessScope === option.value;
              return (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                    isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                  onClick={() => handleScopeChange(option.value)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm flex-1">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4" />}
                </div>
              );
            })}
          </div>

          {/* Search & Items (only for non-company scopes) */}
          {accessScope !== 'company' && (
            <>
              {/* Search Input */}
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${accessScope}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="max-h-[180px] overflow-y-auto p-2 space-y-0.5">
                {accessScope === 'offices' && filteredItems.offices.map(office => (
                  <div
                    key={office.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => toggleOffice(office.id)}
                  >
                    <Checkbox checked={selectedOfficeIds.includes(office.id)} className="pointer-events-none" />
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate">{office.name}</span>
                  </div>
                ))}
                {accessScope === 'departments' && filteredItems.departments.map(dept => (
                  <div
                    key={dept}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => toggleDepartment(dept)}
                  >
                    <Checkbox checked={selectedDepartments.includes(dept)} className="pointer-events-none" />
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate">{dept}</span>
                  </div>
                ))}
                {accessScope === 'projects' && filteredItems.projects.map(project => (
                  <div
                    key={project.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => toggleProject(project.id)}
                  >
                    <Checkbox checked={selectedProjectIds.includes(project.id)} className="pointer-events-none" />
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate">{project.name}</span>
                  </div>
                ))}
                
                {/* Empty states */}
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchQuery ? `No ${accessScope} match "${searchQuery}"` : `No ${accessScope} found`}
                  </p>
                )}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Selected items as removable tags */}
      {selectedItems.map(item => (
        <Badge 
          key={item.id} 
          variant="secondary" 
          className="gap-1 pr-1"
        >
          <span className="truncate max-w-[120px]">{item.name}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveItem(item.id);
            }}
            className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
};