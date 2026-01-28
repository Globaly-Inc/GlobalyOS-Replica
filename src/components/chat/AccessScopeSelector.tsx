import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Briefcase, FolderOpen, Users, Settings2, Lightbulb, RefreshCw, X } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SearchableMemberPicker from "./SearchableMemberPicker";

export type AccessScope = 'company' | 'custom' | 'members';

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

interface AccessScopeSelectorProps {
  value: AccessScope;
  onChange: (scope: AccessScope) => void;
  // Multi-criteria for 'custom' scope
  selectedOfficeIds: string[];
  onOfficeIdsChange: (ids: string[]) => void;
  selectedDepartmentIds: string[];
  onDepartmentIdsChange: (ids: string[]) => void;
  selectedProjectIds: string[];
  onProjectIdsChange: (ids: string[]) => void;
  // For custom scope - which criteria are enabled
  officesEnabled: boolean;
  onOfficesEnabledChange: (enabled: boolean) => void;
  departmentsEnabled: boolean;
  onDepartmentsEnabledChange: (enabled: boolean) => void;
  projectsEnabled: boolean;
  onProjectsEnabledChange: (enabled: boolean) => void;
  // Member selection (for 'members' scope and additional invites)
  selectedMemberIds: string[];
  onMemberIdsChange: (ids: string[]) => void;
  currentEmployeeId?: string;
  // NEW: For inviting additional members alongside Group Access
  inviteAdditionalMembers: boolean;
  onInviteAdditionalMembersChange: (enabled: boolean) => void;
}

const AccessScopeSelector = ({
  value,
  onChange,
  selectedOfficeIds,
  onOfficeIdsChange,
  selectedDepartmentIds,
  onDepartmentIdsChange,
  selectedProjectIds,
  onProjectIdsChange,
  officesEnabled,
  onOfficesEnabledChange,
  departmentsEnabled,
  onDepartmentsEnabledChange,
  projectsEnabled,
  onProjectsEnabledChange,
  selectedMemberIds,
  onMemberIdsChange,
  currentEmployeeId,
  inviteAdditionalMembers,
  onInviteAdditionalMembersChange,
}: AccessScopeSelectorProps) => {
  const { currentOrg } = useOrganization();

  // Fetch offices
  const { data: offices = [] } = useQuery({
    queryKey: ['offices', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('offices')
        .select('id, name')
        .eq('organization_id', currentOrg.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('organization_id', currentOrg.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', currentOrg.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch employees with details for member selection and group filtering
  const { data: employeesWithDetails = [] } = useQuery({
    queryKey: ['employees-for-space-with-details', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id, 
          office_id, 
          department_id,
          position,
          profiles!inner(full_name, avatar_url, email),
          employee_projects(project_id)
        `)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!currentOrg?.id,
  });

  // Filter out current employee from selectable members
  const selectableEmployees = employeesWithDetails.filter(emp => emp.id !== currentEmployeeId);

  // Calculate which employees match the group criteria (for filtering in additional invites)
  const groupMemberIds = useMemo(() => {
    if (value !== 'custom') return [];
    
    // If no criteria enabled, no one matches
    const hasCriteria = (officesEnabled && selectedOfficeIds.length > 0) ||
                        (departmentsEnabled && selectedDepartmentIds.length > 0) ||
                        (projectsEnabled && selectedProjectIds.length > 0);
    if (!hasCriteria) return [];
    
    let candidates = [...employeesWithDetails];
    
    // Filter by offices if enabled (AND logic)
    if (officesEnabled && selectedOfficeIds.length > 0) {
      candidates = candidates.filter(e => selectedOfficeIds.includes(e.office_id || ''));
    }
    
    // Filter by departments if enabled (AND logic)
    if (departmentsEnabled && selectedDepartmentIds.length > 0) {
      candidates = candidates.filter(e => selectedDepartmentIds.includes(e.department_id || ''));
    }
    
    // Filter by projects if enabled (AND logic)
    if (projectsEnabled && selectedProjectIds.length > 0) {
      candidates = candidates.filter(e => 
        e.employee_projects?.some(p => selectedProjectIds.includes(p.project_id))
      );
    }
    
    return candidates.map(e => e.id);
  }, [value, employeesWithDetails, officesEnabled, selectedOfficeIds, departmentsEnabled, selectedDepartmentIds, projectsEnabled, selectedProjectIds]);

  const handleAddOffice = (officeId: string) => {
    if (!selectedOfficeIds.includes(officeId)) {
      onOfficeIdsChange([...selectedOfficeIds, officeId]);
    }
  };

  const handleRemoveOffice = (officeId: string) => {
    onOfficeIdsChange(selectedOfficeIds.filter(id => id !== officeId));
  };

  const handleAddDepartment = (departmentId: string) => {
    if (!selectedDepartmentIds.includes(departmentId)) {
      onDepartmentIdsChange([...selectedDepartmentIds, departmentId]);
    }
  };

  const handleRemoveDepartment = (departmentId: string) => {
    onDepartmentIdsChange(selectedDepartmentIds.filter(id => id !== departmentId));
  };

  const handleAddProject = (projectId: string) => {
    if (!selectedProjectIds.includes(projectId)) {
      onProjectIdsChange([...selectedProjectIds, projectId]);
    }
  };

  const handleRemoveProject = (projectId: string) => {
    onProjectIdsChange(selectedProjectIds.filter(id => id !== projectId));
  };

  const handleAddMember = (memberId: string) => {
    if (!selectedMemberIds.includes(memberId)) {
      onMemberIdsChange([...selectedMemberIds, memberId]);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    onMemberIdsChange(selectedMemberIds.filter(id => id !== memberId));
  };

  // Build dynamic help text for AND logic
  const buildCriteriaText = () => {
    const parts: string[] = [];
    
    if (officesEnabled && selectedOfficeIds.length > 0) {
      const names = selectedOfficeIds.map(id => offices.find(o => o.id === id)?.name).filter(Boolean);
      if (names.length > 0) parts.push(names.join(' or '));
    }
    
    if (departmentsEnabled && selectedDepartmentIds.length > 0) {
      const names = selectedDepartmentIds.map(id => departments.find(d => d.id === id)?.name).filter(Boolean);
      if (names.length > 0) parts.push(names.join(' or '));
    }
    
    if (projectsEnabled && selectedProjectIds.length > 0) {
      const names = selectedProjectIds.map(id => projects.find(p => p.id === id)?.name).filter(Boolean);
      if (names.length > 0) parts.push(names.join(' or '));
    }
    
    if (parts.length === 0) return null;
    if (parts.length === 1) return `Members must be in ${parts[0]}.`;
    return `Members must be in ${parts.join(' AND ')}.`;
  };

  const criteriaText = buildCriteriaText();

  const scopeOptions = [
    {
      value: 'company' as AccessScope,
      label: 'Company-wide',
      description: `Anyone in ${currentOrg?.name || 'organization'} can find, view, and join`,
      icon: Building2,
      showAutoSync: true,
    },
    {
      value: 'custom' as AccessScope,
      label: 'Group Access',
      description: 'Only employees matching criteria can access',
      icon: Settings2,
      showAutoSync: true,
    },
    {
      value: 'members' as AccessScope,
      label: 'Invite members manually',
      description: 'Only invited members can access',
      icon: Users,
      showAutoSync: false,
    },
  ];

  // Get employees that can be selected for additional invites (not in group)
  const additionalInviteEmployees = selectableEmployees.filter(
    emp => !groupMemberIds.includes(emp.id) && !selectedMemberIds.includes(emp.id)
  );

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Access settings</Label>

      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as AccessScope)}
        className="space-y-2"
      >
        {scopeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;

          return (
            <div key={option.value} className="space-y-2">
              <div 
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => onChange(option.value)}
              >
                <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={option.value} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    {option.showAutoSync && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium">
                        <RefreshCw className="h-2.5 w-2.5" />
                        Auto Sync
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>

              {/* Custom access criteria (Group Access) */}
              {isSelected && option.value === 'custom' && (
                <div className="ml-10 space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                  {/* Office checkbox & selector */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="offices-enabled"
                        checked={officesEnabled}
                        onCheckedChange={(checked) => {
                          onOfficesEnabledChange(!!checked);
                          if (!checked) onOfficeIdsChange([]);
                        }}
                      />
                      <Label htmlFor="offices-enabled" className="flex items-center gap-2 cursor-pointer">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        Office
                      </Label>
                    </div>
                    {officesEnabled && (
                      <div className="ml-6 space-y-2">
                        <Select onValueChange={handleAddOffice}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select offices..." />
                          </SelectTrigger>
                          <SelectContent>
                            {offices
                              .filter(office => !selectedOfficeIds.includes(office.id))
                              .map(office => (
                                <SelectItem key={office.id} value={office.id}>
                                  {office.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {selectedOfficeIds.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedOfficeIds.map(id => {
                              const office = offices.find(o => o.id === id);
                              return office ? (
                                <Badge key={id} variant="secondary" className="gap-1">
                                  {office.name}
                                  <X 
                                    className="h-3 w-3 cursor-pointer" 
                                    onClick={() => handleRemoveOffice(id)} 
                                  />
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Department checkbox & selector */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="departments-enabled"
                        checked={departmentsEnabled}
                        onCheckedChange={(checked) => {
                          onDepartmentsEnabledChange(!!checked);
                          if (!checked) onDepartmentIdsChange([]);
                        }}
                      />
                      <Label htmlFor="departments-enabled" className="flex items-center gap-2 cursor-pointer">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        Department
                      </Label>
                    </div>
                    {departmentsEnabled && (
                      <div className="ml-6 space-y-2">
                        <Select onValueChange={handleAddDepartment}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select departments..." />
                          </SelectTrigger>
                          <SelectContent>
                            {departments
                              .filter(dept => !selectedDepartmentIds.includes(dept.id))
                              .map(dept => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {selectedDepartmentIds.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedDepartmentIds.map(id => {
                              const dept = departments.find(d => d.id === id);
                              return dept ? (
                                <Badge key={id} variant="secondary" className="gap-1">
                                  {dept.name}
                                  <X 
                                    className="h-3 w-3 cursor-pointer" 
                                    onClick={() => handleRemoveDepartment(id)} 
                                  />
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Project checkbox & selector */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="projects-enabled"
                        checked={projectsEnabled}
                        onCheckedChange={(checked) => {
                          onProjectsEnabledChange(!!checked);
                          if (!checked) onProjectIdsChange([]);
                        }}
                      />
                      <Label htmlFor="projects-enabled" className="flex items-center gap-2 cursor-pointer">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        Project
                      </Label>
                    </div>
                    {projectsEnabled && (
                      <div className="ml-6 space-y-2">
                        <Select onValueChange={handleAddProject}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select projects..." />
                          </SelectTrigger>
                          <SelectContent>
                            {projects
                              .filter(project => !selectedProjectIds.includes(project.id))
                              .map(project => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {selectedProjectIds.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedProjectIds.map(id => {
                              const project = projects.find(p => p.id === id);
                              return project ? (
                                <Badge key={id} variant="secondary" className="gap-1">
                                  {project.name}
                                  <X 
                                    className="h-3 w-3 cursor-pointer" 
                                    onClick={() => handleRemoveProject(id)} 
                                  />
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dynamic AND logic explanation */}
                  {criteriaText && (
                    <Alert className="bg-primary/5 border-primary/20">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <AlertDescription className="text-sm">
                        {criteriaText}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Also invite specific members section */}
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Checkbox
                        id="invite-additional"
                        checked={inviteAdditionalMembers}
                        onCheckedChange={(checked) => onInviteAdditionalMembersChange(!!checked)}
                      />
                      <Label htmlFor="invite-additional" className="cursor-pointer text-sm">
                        Also invite specific members
                      </Label>
                    </div>
                    
                    {inviteAdditionalMembers && (
                      <div className="ml-6 space-y-2">
                        <p className="text-xs text-muted-foreground mb-2">
                          Select additional members who aren't covered by the group criteria
                        </p>
                        <SearchableMemberPicker
                          employees={additionalInviteEmployees}
                          selectedIds={selectedMemberIds}
                          onSelect={handleAddMember}
                          onRemove={handleRemoveMember}
                          placeholder="Search members not in group..."
                          emptyMessage="No additional members available"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Member selector for 'members' scope */}
              {isSelected && option.value === 'members' && (
                <div className="ml-10">
                  <SearchableMemberPicker
                    employees={selectableEmployees}
                    selectedIds={selectedMemberIds}
                    onSelect={handleAddMember}
                    onRemove={handleRemoveMember}
                    placeholder="Search and select team members..."
                    emptyMessage="No team members available"
                  />
                </div>
              )}
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
};

export default AccessScopeSelector;
