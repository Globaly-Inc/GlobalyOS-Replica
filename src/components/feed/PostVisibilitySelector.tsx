import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Globe, Building2, Briefcase, FolderKanban, ChevronDown, X } from "lucide-react";

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
    // Open popover for non-company scopes
    if (scope !== 'company') {
      setPopoverOpen(true);
    }
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

  const getScopeIcon = (scope: AccessScope) => {
    switch (scope) {
      case 'company': return <Globe className="h-4 w-4" />;
      case 'offices': return <Building2 className="h-4 w-4" />;
      case 'departments': return <Briefcase className="h-4 w-4" />;
      case 'projects': return <FolderKanban className="h-4 w-4" />;
    }
  };

  const getScopeLabel = (scope: AccessScope) => {
    switch (scope) {
      case 'company': return 'Everyone';
      case 'offices': return 'Specific Offices';
      case 'departments': return 'Specific Departments';
      case 'projects': return 'Specific Projects';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Horizontal row with scope selector and item selector */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Scope selector */}
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">Visible to:</span>
          <Select value={accessScope} onValueChange={(v) => handleScopeChange(v as AccessScope)}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {getScopeIcon(accessScope)}
                  <span>{getScopeLabel(accessScope)}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>Everyone</span>
                </div>
              </SelectItem>
              <SelectItem value="offices">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>Specific Offices</span>
                </div>
              </SelectItem>
              <SelectItem value="departments">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span>Specific Departments</span>
                </div>
              </SelectItem>
              <SelectItem value="projects">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  <span>Specific Projects</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Item selector (inline with scope) */}
        {accessScope !== 'company' && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-2 font-normal"
              >
                {getScopeIcon(accessScope)}
                <span className="text-muted-foreground">{getSelectionLabel()}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
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
        )}
      </div>

      {/* Selected items as badges */}
      {(selectedOfficeIds.length > 0 || selectedDepartments.length > 0 || selectedProjectIds.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {getSelectedBadges()}
        </div>
      )}
    </div>
  );
};
