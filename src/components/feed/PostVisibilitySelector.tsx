import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Globe, Building2, Briefcase, FolderKanban, ChevronDown, X } from "lucide-react";
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
}

export const PostVisibilitySelector = ({
  accessScope,
  onAccessScopeChange,
  selectedOfficeIds,
  onOfficeIdsChange,
  selectedDepartments,
  onDepartmentsChange,
  selectedProjectIds,
  onProjectIdsChange,
}: PostVisibilitySelectorProps) => {
  const { currentOrg } = useOrganization();
  const [offices, setOffices] = useState<Office[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (!currentOrg?.id) return;

    const loadData = async () => {
      // Load offices
      const { data: officesData } = await supabase
        .from("offices")
        .select("id, name")
        .eq("organization_id", currentOrg.id)
        .order("name");
      if (officesData) setOffices(officesData);

      // Load unique departments from employees
      const { data: deptData } = await supabase
        .from("employees")
        .select("department")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active");
      if (deptData) {
        const uniqueDepts = [...new Set(deptData.map(e => e.department).filter(Boolean))];
        setDepartments(uniqueDepts.sort());
      }

      // Load projects
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", currentOrg.id)
        .order("name");
      if (projectsData) setProjects(projectsData);
    };

    loadData();
  }, [currentOrg?.id]);

  const handleScopeChange = (scope: AccessScope) => {
    onAccessScopeChange(scope);
    // Clear selections when scope changes
    if (scope !== 'offices') onOfficeIdsChange([]);
    if (scope !== 'departments') onDepartmentsChange([]);
    if (scope !== 'projects') onProjectIdsChange([]);
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

  const getSelectionLabel = () => {
    switch (accessScope) {
      case 'offices':
        return selectedOfficeIds.length === 0 
          ? "Select offices..." 
          : `${selectedOfficeIds.length} office${selectedOfficeIds.length > 1 ? 's' : ''} selected`;
      case 'departments':
        return selectedDepartments.length === 0 
          ? "Select departments..." 
          : `${selectedDepartments.length} department${selectedDepartments.length > 1 ? 's' : ''} selected`;
      case 'projects':
        return selectedProjectIds.length === 0 
          ? "Select projects..." 
          : `${selectedProjectIds.length} project${selectedProjectIds.length > 1 ? 's' : ''} selected`;
      default:
        return "";
    }
  };

  const getSelectedBadges = () => {
    switch (accessScope) {
      case 'offices':
        return selectedOfficeIds.map(id => {
          const office = offices.find(o => o.id === id);
          return office ? (
            <Badge key={id} variant="secondary" className="gap-1">
              <Building2 className="h-3 w-3" />
              {office.name}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => toggleOffice(id)} />
            </Badge>
          ) : null;
        });
      case 'departments':
        return selectedDepartments.map(dept => (
          <Badge key={dept} variant="secondary" className="gap-1">
            <Briefcase className="h-3 w-3" />
            {dept}
            <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => toggleDepartment(dept)} />
          </Badge>
        ));
      case 'projects':
        return selectedProjectIds.map(id => {
          const project = projects.find(p => p.id === id);
          return project ? (
            <Badge key={id} variant="secondary" className="gap-1">
              <FolderKanban className="h-3 w-3" />
              {project.name}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => toggleProject(id)} />
            </Badge>
          ) : null;
        });
      default:
        return null;
    }
  };

  const scopeOptions = [
    { value: 'company' as const, label: 'Everyone', icon: Globe, description: 'Visible to all team members' },
    { value: 'offices' as const, label: 'Offices', icon: Building2, description: 'Specific office locations' },
    { value: 'departments' as const, label: 'Departments', icon: Briefcase, description: 'Specific departments' },
    { value: 'projects' as const, label: 'Projects', icon: FolderKanban, description: 'Specific project teams' },
  ];

  return (
    <div className="space-y-3">
      <Label>Who can see this?</Label>
      
      <RadioGroup value={accessScope} onValueChange={(v) => handleScopeChange(v as AccessScope)}>
        <div className="grid grid-cols-2 gap-2">
          {scopeOptions.map(({ value, label, icon: Icon }) => (
            <div
              key={value}
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                accessScope === value 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => handleScopeChange(value)}
            >
              <RadioGroupItem value={value} id={`scope-${value}`} className="sr-only" />
              <Icon className={cn("h-4 w-4", accessScope === value ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-sm font-medium", accessScope === value ? "text-primary" : "text-foreground")}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </RadioGroup>

      {/* Selection dropdowns for offices, departments, projects */}
      {accessScope !== 'company' && (
        <div className="space-y-2">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between font-normal h-auto min-h-10"
              >
                <span className="text-muted-foreground">{getSelectionLabel()}</span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                {accessScope === 'offices' && offices.map(office => (
                  <div
                    key={office.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => toggleOffice(office.id)}
                  >
                    <Checkbox checked={selectedOfficeIds.includes(office.id)} className="pointer-events-none" />
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{office.name}</span>
                  </div>
                ))}
                {accessScope === 'departments' && departments.map(dept => (
                  <div
                    key={dept}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => toggleDepartment(dept)}
                  >
                    <Checkbox checked={selectedDepartments.includes(dept)} className="pointer-events-none" />
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{dept}</span>
                  </div>
                ))}
                {accessScope === 'projects' && projects.map(project => (
                  <div
                    key={project.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => toggleProject(project.id)}
                  >
                    <Checkbox checked={selectedProjectIds.includes(project.id)} className="pointer-events-none" />
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{project.name}</span>
                  </div>
                ))}
                {accessScope === 'offices' && offices.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No offices found</p>
                )}
                {accessScope === 'departments' && departments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No departments found</p>
                )}
                {accessScope === 'projects' && projects.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No projects found</p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Selected badges */}
          {(selectedOfficeIds.length > 0 || selectedDepartments.length > 0 || selectedProjectIds.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {getSelectedBadges()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
