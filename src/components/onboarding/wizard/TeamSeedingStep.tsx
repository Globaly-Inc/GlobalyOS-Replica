/**
 * Organization Onboarding - Team Members Seeding Step
 * Table format with owner profile at top (read-only) and editable team member rows
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  { value: 'admin', label: 'Admin' },
  { value: 'hr', label: 'HR' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
];

const emptyMember: TeamMember = {
  email: '',
  full_name: '',
  department: '',
  position: '',
  employment_type: '',
  role: 'member',
  office_id: '',
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
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[160px]">Name</TableHead>
                  <TableHead className="w-[180px]">Email</TableHead>
                  <TableHead className="w-[120px]">Office</TableHead>
                  <TableHead className="w-[130px]">Department</TableHead>
                  <TableHead className="w-[130px]">Position</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[90px]">Role</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Owner Row - Read Only */}
                <TableRow className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={ownerProfile?.avatar_url} />
                        <AvatarFallback className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          {ownerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-medium text-sm truncate">{ownerName || 'You'}</span>
                        <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm truncate max-w-[180px]">
                    {ownerEmail}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {ownerOfficeName || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {ownerProfile?.department || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {ownerProfile?.position || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    Employee
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-xs">
                      Owner
                    </Badge>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>

                {/* Editable Team Member Rows */}
                {members.map((member, index) => {
                  const memberPositions = getPositionsForMember(member.department || '');
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="p-2">
                        <Input
                          value={member.full_name}
                          onChange={(e) => updateMember(index, 'full_name', e.target.value)}
                          placeholder="Full name"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          type="email"
                          value={member.email}
                          onChange={(e) => updateMember(index, 'email', e.target.value)}
                          placeholder="email@company.com"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Select
                          value={member.office_id || ''}
                          onValueChange={(v) => updateMember(index, 'office_id', v)}
                          disabled={loadingOffices}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {offices.map((office) => (
                              <SelectItem key={office.id} value={office.id}>
                                {office.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Select
                          value={member.department || ''}
                          onValueChange={(v) => updateMember(index, 'department', v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select" />
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
                      </TableCell>
                      <TableCell className="p-2">
                        <Select
                          value={member.position || ''}
                          onValueChange={(v) => updateMember(index, 'position', v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select" />
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
                      </TableCell>
                      <TableCell className="p-2">
                        <Select
                          value={member.employment_type || ''}
                          onValueChange={(v) => updateMember(index, 'employment_type', v)}
                          disabled={loadingEmploymentTypes}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {employmentTypes.map((type) => (
                              <SelectItem key={type.id} value={type.name}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Select
                          value={member.role}
                          onValueChange={(v: TeamMember['role']) => updateMember(index, 'role', v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            {members.length === 0 || !hasValidMembers ? (
              <Button type="button" variant="secondary" onClick={onSkip} className="flex-1">
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
