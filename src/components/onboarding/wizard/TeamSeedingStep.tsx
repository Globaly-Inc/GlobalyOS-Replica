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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Users, Plus, Trash2, SkipForward, Crown } from 'lucide-react';
import { useEmploymentTypes } from '@/hooks/useEmploymentTypes';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  email: string;
  full_name: string;
  department?: string;
  position?: string;
  employment_type?: string;
  role: 'admin' | 'hr' | 'manager' | 'member';
  office_id?: string;
  manager_id?: string;
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

  // Get departments and positions from previous step
  const departments = departmentsRoles?.departments || [];
  const allPositions = departmentsRoles?.positions || [];

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

  const updateMember = (index: number, field: keyof TeamMember, value: string) => {
    setMembers(members.map((member, i) => {
      if (i !== index) return member;
      if (field === 'department') {
        return { ...member, department: value, position: '' };
      }
      return { ...member, [field]: value };
    }));
  };

  const getPositionsForMember = (memberDepartment: string) => {
    if (!memberDepartment) return allPositions;
    return allPositions.filter(p => p.department === memberDepartment);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Just save valid members - invitations will be sent on final completion
    const validMembers = members.filter(m => m.email && m.full_name && isValidEmail(m.email));
    onSave(validMembers);
  };

  const hasValidMembers = members.some(m => m.email && m.full_name && isValidEmail(m.email));

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
              const memberPositions = getPositionsForMember(member.department || '');
              const availableManagers = managerOptions.filter(
                (opt) => opt.id !== `member-${index}` // Exclude self from manager list
              );
              
              return (
                <Card key={index} className="p-4">
                  {/* Row 1: Name, Email, Office, Manager, Delete */}
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 mb-3">
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
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Office</Label>
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
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Manager</Label>
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
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember(index)}
                        className="h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Row 2: Department, Position, Employment Type, Role */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Department</Label>
                      <Select
                        value={member.department || ''}
                        onValueChange={(v) => updateMember(index, 'department', v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.length > 0 ? (
                            departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="Executive">Executive</SelectItem>
                              <SelectItem value="Operations">Operations</SelectItem>
                              <SelectItem value="Sales">Sales</SelectItem>
                              <SelectItem value="Marketing">Marketing</SelectItem>
                              <SelectItem value="General">General</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Position</Label>
                      <Select
                        value={member.position || ''}
                        onValueChange={(v) => updateMember(index, 'position', v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          {memberPositions.length > 0 ? (
                            memberPositions.map((pos, idx) => (
                              <SelectItem key={`${pos.name}-${idx}`} value={pos.name}>
                                {pos.name}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="Team Member">Team Member</SelectItem>
                              <SelectItem value="Manager">Manager</SelectItem>
                              <SelectItem value="Specialist">Specialist</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Type</Label>
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
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Role</Label>
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
