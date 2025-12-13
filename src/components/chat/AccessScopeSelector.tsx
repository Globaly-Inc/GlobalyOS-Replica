import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, Briefcase, FolderOpen, Users } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export type AccessScope = 'company' | 'offices' | 'projects' | 'members';

interface Employee {
  id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
}

interface AccessScopeSelectorProps {
  value: AccessScope;
  onChange: (scope: AccessScope) => void;
  selectedOfficeIds: string[];
  onOfficeIdsChange: (ids: string[]) => void;
  selectedProjectIds: string[];
  onProjectIdsChange: (ids: string[]) => void;
  selectedMemberIds: string[];
  onMemberIdsChange: (ids: string[]) => void;
  currentEmployeeId?: string;
}

const AccessScopeSelector = ({
  value,
  onChange,
  selectedOfficeIds,
  onOfficeIdsChange,
  selectedProjectIds,
  onProjectIdsChange,
  selectedMemberIds,
  onMemberIdsChange,
  currentEmployeeId,
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

  // Fetch employees for member selection
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-space', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('employees')
        .select(`id, profiles!inner(full_name, avatar_url, email)`)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!currentOrg?.id,
  });

  // Filter out current employee from selectable members
  const selectableEmployees = employees.filter(emp => emp.id !== currentEmployeeId);

  const handleAddOffice = (officeId: string) => {
    if (!selectedOfficeIds.includes(officeId)) {
      onOfficeIdsChange([...selectedOfficeIds, officeId]);
    }
  };

  const handleRemoveOffice = (officeId: string) => {
    onOfficeIdsChange(selectedOfficeIds.filter(id => id !== officeId));
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

  const scopeOptions = [
    {
      value: 'company' as AccessScope,
      label: 'Company-wide',
      description: `Anyone in ${currentOrg?.name || 'organization'} can find, view, and join`,
      icon: Building2,
    },
    {
      value: 'offices' as AccessScope,
      label: 'Office-wise',
      description: 'Only employees from selected offices can access',
      icon: Briefcase,
    },
    {
      value: 'projects' as AccessScope,
      label: 'Project-wise',
      description: 'Only team members assigned to selected projects can access',
      icon: FolderOpen,
    },
    {
      value: 'members' as AccessScope,
      label: 'Members',
      description: 'Only invited members can access',
      icon: Users,
    },
  ];

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
                  <Label htmlFor={option.value} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>

              {/* Office selector */}
              {isSelected && option.value === 'offices' && (
                <div className="ml-10 space-y-2">
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

              {/* Project selector */}
              {isSelected && option.value === 'projects' && (
                <div className="ml-10 space-y-2">
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

              {/* Member selector */}
              {isSelected && option.value === 'members' && (
                <div className="ml-10 space-y-2">
                  <Select onValueChange={handleAddMember}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select team members..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="max-h-[200px]">
                        {selectableEmployees
                          .filter(emp => !selectedMemberIds.includes(emp.id))
                          .map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={emp.profiles?.avatar_url || ''} />
                                  <AvatarFallback className="text-xs">
                                    {emp.profiles?.full_name?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                {emp.profiles?.full_name}
                              </div>
                            </SelectItem>
                          ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  {selectedMemberIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedMemberIds.map(id => {
                        const emp = employees.find(e => e.id === id);
                        return emp ? (
                          <Badge key={id} variant="secondary" className="gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={emp.profiles?.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {emp.profiles?.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            {emp.profiles?.full_name?.split(' ')[0]}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => handleRemoveMember(id)} 
                            />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
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
