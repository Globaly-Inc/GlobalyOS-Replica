/**
 * Organization Onboarding - Team Members Seeding Step
 * Full-width card layout with details in 2 rows, manager selection, and role descriptions
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ArrowLeft, ArrowRight, Users, Plus, Trash2, SkipForward, Crown, Check, ChevronsUpDown } from 'lucide-react';
import { useEmploymentTypes } from '@/hooks/useEmploymentTypes';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Position {
  name: string;
  department: string;
}

interface TeamMember {
  email: string;
  full_name: string;
  department?: string;
  position?: string;
  employment_type?: string;
  role: 'admin' | 'hr' | 'manager' | 'member';
  office_id?: string;
  manager_id?: string;
  is_new_hire: boolean;
}

interface Office {
  id: string;
  name: string;
}

interface DepartmentsRolesData {
  departments: string[];
  positions: Array<{ name: string; department: string }>;
}

interface OwnerProfileData {
  position?: string;
  department?: string;
  join_date?: string;
  avatar_url?: string;
  office_id?: string;
}

interface TeamSeedingStepProps {
  initialMembers: TeamMember[];
  departmentsRoles?: DepartmentsRolesData;
  ownerProfile?: OwnerProfileData;
  ownerName: string;
  ownerEmail: string;
  onSave: (members: TeamMember[]) => void;
  onBack: () => void;
  onSkip: () => void;
  isSaving: boolean;
  organizationId: string;
}

const ROLES = [
  { 
    value: 'admin', 
    label: 'Admin',
    description: 'Full access to all settings, team management, and data'
  },
  { 
    value: 'hr', 
    label: 'HR',
    description: 'Manage employees, leave, attendance, and HR policies'
  },
  { 
    value: 'manager', 
    label: 'Manager',
    description: 'View team reports, approve leave, and manage direct reports'
  },
  { 
    value: 'member', 
    label: 'Member',
    description: 'Standard access to personal profile and team features'
  },
];

const emptyMember: TeamMember = {
  email: '',
  full_name: '',
  department: '',
  position: '',
  employment_type: '',
  role: 'member',
  office_id: '',
  manager_id: '',
  is_new_hire: false,
};

export function TeamSeedingStep({ 
  initialMembers, 
  departmentsRoles,
  ownerProfile,
  ownerName,
  ownerEmail,
  onSave, 
  onBack, 
  onSkip, 
  isSaving, 
  organizationId 
}: TeamSeedingStepProps) {
  const { data: employmentTypes = [], isLoading: loadingEmploymentTypes } = useEmploymentTypes(true);
  
  const [members, setMembers] = useState<TeamMember[]>(
    initialMembers.length > 0 ? initialMembers : []
  );
  const [offices, setOffices] = useState<Office[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);

  // Local state for departments and positions (including custom additions)
  const [localDepartments, setLocalDepartments] = useState<string[]>(departmentsRoles?.departments || []);
  const [localPositions, setLocalPositions] = useState<Position[]>(departmentsRoles?.positions || []);

  // Dropdown open states and search values per member
  const [departmentOpenStates, setDepartmentOpenStates] = useState<Record<number, boolean>>({});
  const [positionOpenStates, setPositionOpenStates] = useState<Record<number, boolean>>({});
  const [departmentSearches, setDepartmentSearches] = useState<Record<number, string>>({});
  const [positionSearches, setPositionSearches] = useState<Record<number, string>>({});

  // Sync with parent data when it changes
  useEffect(() => {
    if (departmentsRoles?.departments) {
      setLocalDepartments(prev => {
        const combined = new Set([...departmentsRoles.departments, ...prev]);
        return Array.from(combined);
      });
    }
  }, [departmentsRoles?.departments]);

  useEffect(() => {
    if (departmentsRoles?.positions) {
      setLocalPositions(prev => {
        const existingKeys = new Set(prev.map(p => `${p.name}::${p.department}`));
        const newPositions = departmentsRoles.positions.filter(
          p => !existingKeys.has(`${p.name}::${p.department}`)
        );
        return [...prev, ...newPositions];
      });
    }
  }, [departmentsRoles?.positions]);

  // Owner display helpers
  const ownerInitials = useMemo(() => {
    if (!ownerName) return '?';
    const parts = ownerName.trim().split(' ');
    return parts.length > 1 
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  }, [ownerName]);

  const ownerOfficeName = useMemo(() => {
    if (!ownerProfile?.office_id || !offices.length) return null;
    return offices.find(o => o.id === ownerProfile.office_id)?.name;
  }, [ownerProfile?.office_id, offices]);

  // Manager options: Owner + all team members with names
  const managerOptions = useMemo(() => {
    const options: Array<{ id: string; name: string; isOwner?: boolean }> = [];
    
    // Add owner as first option
    options.push({
      id: 'owner',
      name: ownerName || 'Owner',
      isOwner: true
    });
    
    // Add all team members with names
    members.forEach((m, index) => {
      if (m.full_name) {
        options.push({
          id: `member-${index}`,
          name: m.full_name
        });
      }
    });
    
    return options;
  }, [members, ownerName]);

  // Fetch offices created in previous step
  useEffect(() => {
    const loadOffices = async () => {
      if (!organizationId) return;
      setLoadingOffices(true);
      try {
        const { data } = await supabase
          .from('offices')
          .select('id, name')
          .eq('organization_id', organizationId)
          .order('name');
        if (data) setOffices(data);
      } catch (error) {
        console.error('Failed to load offices:', error);
      } finally {
        setLoadingOffices(false);
      }
    };
    loadOffices();
  }, [organizationId]);

  const addMember = () => {
    setMembers([...members, { ...emptyMember }]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof TeamMember, value: string | boolean) => {
    setMembers(members.map((member, i) => {
      if (i !== index) return member;
      if (field === 'department') {
        return { ...member, department: value as string, position: '' };
      }
      if (field === 'is_new_hire') {
        return { ...member, is_new_hire: value as boolean };
      }
      return { ...member, [field]: value };
    }));
  };

  const getPositionsForMember = (memberDepartment: string) => {
    if (!memberDepartment) return localPositions;
    return localPositions.filter(p => p.department === memberDepartment);
  };

  // Add custom department
  const addCustomDepartment = async (memberIndex: number, deptName: string) => {
    const trimmedName = deptName.trim();
    if (!trimmedName) return;

    // Add to local state for immediate UI update
    if (!localDepartments.includes(trimmedName)) {
      setLocalDepartments(prev => [...prev, trimmedName]);
    }

    // Update member's department
    updateMember(memberIndex, 'department', trimmedName);

    // Close dropdown & clear search
    setDepartmentOpenStates(prev => ({ ...prev, [memberIndex]: false }));
    setDepartmentSearches(prev => ({ ...prev, [memberIndex]: '' }));

    // Record for AI learning (fire and forget)
    recordLearning('department', trimmedName);
  };

  // Add custom position
  const addCustomPosition = async (memberIndex: number, posName: string, department: string) => {
    const trimmedName = posName.trim();
    if (!trimmedName || !department) return;

    // Add to local positions
    const newPos: Position = { name: trimmedName, department };
    if (!localPositions.find(p => p.name === trimmedName && p.department === department)) {
      setLocalPositions(prev => [...prev, newPos]);
    }

    // Insert into positions table for this org
    try {
      await supabase.from('positions').insert({
        organization_id: organizationId,
        name: trimmedName,
        department: department,
      });
    } catch (error) {
      console.error('Failed to save position to database:', error);
    }

    // Update member
    updateMember(memberIndex, 'position', trimmedName);

    // Close & clear
    setPositionOpenStates(prev => ({ ...prev, [memberIndex]: false }));
    setPositionSearches(prev => ({ ...prev, [memberIndex]: '' }));

    // Record for AI learning
    recordLearning('position', trimmedName, department);
  };

  // Record custom additions for AI learning
  const recordLearning = async (type: 'department' | 'position', name: string, department?: string) => {
    try {
      await supabase.functions.invoke('save-org-structure-learning', {
        body: {
          businessCategory: 'General Business', // Could be enhanced with actual org industry
          companySize: 'small',
          selectedDepartments: type === 'department' ? [name] : [],
          selectedPositions: type === 'position' ? [{ name, department }] : [],
          customDepartments: type === 'department' ? [name] : [],
          customPositions: type === 'position' ? [name] : [],
          organizationId,
        }
      });
    } catch (err) {
      console.error('Failed to save learning:', err);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidMember = (m: TeamMember) => {
    return (
      m.email &&
      m.full_name &&
      isValidEmail(m.email) &&
      m.department &&
      m.position &&
      m.employment_type &&
      m.office_id &&
      m.manager_id &&
      m.role
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Just save valid members - invitations will be sent on final completion
    const validMembers = members.filter(isValidMember);
    onSave(validMembers);
  };

  const hasValidMembers = members.some(isValidMember);

  // Filter departments based on search
  const getFilteredDepartments = (index: number) => {
    const search = (departmentSearches[index] || '').toLowerCase();
    if (!search) return localDepartments;
    return localDepartments.filter(dept => dept.toLowerCase().includes(search));
  };

  // Filter positions based on search and department
  const getFilteredPositions = (index: number, department: string) => {
    const search = (positionSearches[index] || '').toLowerCase();
    const deptPositions = getPositionsForMember(department);
    if (!search) return deptPositions;
    return deptPositions.filter(pos => pos.name.toLowerCase().includes(search));
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Invite Your Team</CardTitle>
        <CardDescription>
          Add team members to invite. They'll receive a personalized email with login instructions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Owner Card - Read Only */}
          <Card className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={ownerProfile?.avatar_url} />
                <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                  {ownerInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{ownerName || 'You'}</span>
                  <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-xs">
                    Owner
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground truncate block">{ownerEmail}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Office</span>
                <span className="font-medium">{ownerOfficeName || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Department</span>
                <span className="font-medium">{ownerProfile?.department || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Position</span>
                <span className="font-medium">{ownerProfile?.position || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Type</span>
                <span className="font-medium">Employee</span>
              </div>
            </div>
          </Card>

          {/* Team Member Cards */}
          <div className="space-y-3">
            {members.map((member, index) => {
              const filteredDepartments = getFilteredDepartments(index);
              const filteredPositions = getFilteredPositions(index, member.department || '');
              const availableManagers = managerOptions.filter(
                (opt) => opt.id !== `member-${index}` // Exclude self from manager list
              );
              const departmentSearch = departmentSearches[index] || '';
              const positionSearch = positionSearches[index] || '';
              const showAddDepartment = departmentSearch && !filteredDepartments.some(
                d => d.toLowerCase() === departmentSearch.toLowerCase()
              );
              const showAddPosition = positionSearch && member.department && !filteredPositions.some(
                p => p.name.toLowerCase() === positionSearch.toLowerCase()
              );
              
              return (
                <Card key={index} className="p-4">
                  {/* Row 0: Member Type Selection + Delete */}
                  <div className="flex items-center justify-between mb-3">
                    <RadioGroup
                      value={member.is_new_hire ? 'new_hire' : 'existing'}
                      onValueChange={(v) => updateMember(index, 'is_new_hire', v === 'new_hire')}
                      className="flex items-center gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing" id={`existing-${index}`} />
                        <Label htmlFor={`existing-${index}`} className="text-sm font-normal cursor-pointer">
                          Existing Team
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new_hire" id={`new-hire-${index}`} />
                        <Label htmlFor={`new-hire-${index}`} className="text-sm font-normal cursor-pointer">
                          New Hire
                        </Label>
                      </div>
                    </RadioGroup>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember(index)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Row 1: Name, Email, Office, Manager */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Name *</Label>
                      <Input
                        value={member.full_name}
                        onChange={(e) => updateMember(index, 'full_name', e.target.value)}
                        placeholder="Full name"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Email *</Label>
                      <Input
                        type="email"
                        value={member.email}
                        onChange={(e) => updateMember(index, 'email', e.target.value)}
                        placeholder="email@company.com"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Office *</Label>
                      <Select
                        value={member.office_id || ''}
                        onValueChange={(v) => updateMember(index, 'office_id', v)}
                        disabled={loadingOffices}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select office" />
                        </SelectTrigger>
                        <SelectContent>
                          {offices.map((office) => (
                            <SelectItem key={office.id} value={office.id}>
                              {office.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Manager *</Label>
                      <Select
                        value={member.manager_id || ''}
                        onValueChange={(v) => updateMember(index, 'manager_id', v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableManagers.map((mgr) => (
                            <SelectItem key={mgr.id} value={mgr.id}>
                              <div className="flex items-center gap-2">
                                <span>{mgr.name}</span>
                                {mgr.isOwner && <Crown className="h-3 w-3 text-amber-500" />}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Row 2: Department, Position, Employment Type, Role */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Department - Searchable Combobox */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Department *</Label>
                      <Popover
                        open={departmentOpenStates[index] || false}
                        onOpenChange={(open) => setDepartmentOpenStates(prev => ({ ...prev, [index]: open }))}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={departmentOpenStates[index] || false}
                            className="w-full h-9 justify-between font-normal"
                          >
                            <span className="truncate">
                              {member.department || 'Select department...'}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search or add new..."
                              value={departmentSearch}
                              onValueChange={(val) => setDepartmentSearches(prev => ({ ...prev, [index]: val }))}
                            />
                            <CommandList className="max-h-[200px]">
                              {filteredDepartments.length === 0 && !showAddDepartment && (
                                <CommandEmpty>No departments found.</CommandEmpty>
                              )}
                              <CommandGroup>
                                {filteredDepartments.map((dept) => (
                                  <CommandItem
                                    key={dept}
                                    value={dept}
                                    onSelect={() => {
                                      updateMember(index, 'department', dept);
                                      setDepartmentOpenStates(prev => ({ ...prev, [index]: false }));
                                      setDepartmentSearches(prev => ({ ...prev, [index]: '' }));
                                    }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', member.department === dept ? 'opacity-100' : 'opacity-0')} />
                                    {dept}
                                  </CommandItem>
                                ))}
                                {showAddDepartment && (
                                  <CommandItem
                                    value={`add-${departmentSearch}`}
                                    onSelect={() => addCustomDepartment(index, departmentSearch)}
                                    className="text-primary"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add "{departmentSearch}"
                                  </CommandItem>
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Position - Searchable Combobox */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Position *</Label>
                      <Popover
                        open={positionOpenStates[index] || false}
                        onOpenChange={(open) => setPositionOpenStates(prev => ({ ...prev, [index]: open }))}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={positionOpenStates[index] || false}
                            className="w-full h-9 justify-between font-normal"
                            disabled={!member.department}
                          >
                            <span className="truncate">
                              {member.position || (member.department ? 'Select position...' : 'Select department first')}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search or add new..."
                              value={positionSearch}
                              onValueChange={(val) => setPositionSearches(prev => ({ ...prev, [index]: val }))}
                            />
                            <CommandList className="max-h-[200px]">
                              {filteredPositions.length === 0 && !showAddPosition && (
                                <CommandEmpty>No positions found for this department.</CommandEmpty>
                              )}
                              <CommandGroup>
                                {filteredPositions.map((pos, idx) => (
                                  <CommandItem
                                    key={`${pos.name}-${idx}`}
                                    value={pos.name}
                                    onSelect={() => {
                                      updateMember(index, 'position', pos.name);
                                      setPositionOpenStates(prev => ({ ...prev, [index]: false }));
                                      setPositionSearches(prev => ({ ...prev, [index]: '' }));
                                    }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', member.position === pos.name ? 'opacity-100' : 'opacity-0')} />
                                    {pos.name}
                                  </CommandItem>
                                ))}
                                {showAddPosition && (
                                  <CommandItem
                                    value={`add-${positionSearch}`}
                                    onSelect={() => addCustomPosition(index, positionSearch, member.department!)}
                                    className="text-primary"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add "{positionSearch}"
                                  </CommandItem>
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Type *</Label>
                      <Select
                        value={member.employment_type || ''}
                        onValueChange={(v) => updateMember(index, 'employment_type', v)}
                        disabled={loadingEmploymentTypes}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {employmentTypes.map((type) => (
                            <SelectItem key={type.id} value={type.name}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Role *</Label>
                      <Select
                        value={member.role}
                        onValueChange={(v: TeamMember['role']) => updateMember(index, 'role', v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue>
                            {ROLES.find(r => r.value === member.role)?.label}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value} className="py-2">
                              <div className="flex flex-col">
                                <span className="font-medium">{role.label}</span>
                                <span className="text-xs text-muted-foreground">{role.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Add Team Member Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addMember}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Team Member
          </Button>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} disabled={isSaving} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            {members.length === 0 || !hasValidMembers ? (
              <Button type="button" variant="secondary" onClick={onSkip} disabled={isSaving} className="flex-1">
                Skip for now
                <SkipForward className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSaving} className="flex-1">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Invitations will be sent when you complete setup
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
