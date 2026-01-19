/**
 * Organization Onboarding - Team Members Seeding Step
 * Enhanced with department/position dropdowns from previous steps
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Users, Plus, Trash2, UserPlus, SkipForward, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useEmploymentTypes } from '@/hooks/useEmploymentTypes';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface TeamSeedingStepProps {
  initialMembers: TeamMember[];
  departmentsRoles?: DepartmentsRolesData;
  onSave: (members: TeamMember[]) => void;
  onBack: () => void;
  onSkip: () => void;
  isSaving: boolean;
  organizationId: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to all settings' },
  { value: 'hr', label: 'HR', description: 'Manage employees and leave' },
  { value: 'manager', label: 'Manager', description: 'Manage team members' },
  { value: 'member', label: 'Member', description: 'Standard employee access' },
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
  onSave, 
  onBack, 
  onSkip, 
  isSaving, 
  organizationId 
}: TeamSeedingStepProps) {
  const { data: employmentTypes = [], isLoading: loadingEmploymentTypes } = useEmploymentTypes(true);
  const { toast } = useToast();
  
  const [members, setMembers] = useState<TeamMember[]>(
    initialMembers.length > 0 ? initialMembers : []
  );
  const [offices, setOffices] = useState<Office[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<Record<string, 'pending' | 'success' | 'error'>>({});

  // Get departments and positions from previous step
  const departments = departmentsRoles?.departments || [];
  const allPositions = departmentsRoles?.positions || [];

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
    const member = members[index];
    setMembers(members.filter((_, i) => i !== index));
    // Clear sending status for removed member
    if (member.email) {
      setSendingStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[member.email];
        return newStatus;
      });
    }
  };

  const updateMember = (index: number, field: keyof TeamMember, value: string) => {
    setMembers(members.map((member, i) => {
      if (i !== index) return member;
      
      // If department changes, reset position
      if (field === 'department') {
        return { ...member, department: value, position: '' };
      }
      
      return { ...member, [field]: value };
    }));
  };

  // Get positions filtered by department for a specific member
  const getPositionsForMember = (memberDepartment: string) => {
    if (!memberDepartment) return allPositions;
    return allPositions.filter(p => p.department === memberDepartment);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out incomplete members
    const validMembers = members.filter(m => m.email && m.full_name && isValidEmail(m.email));
    
    if (validMembers.length === 0) {
      onSave([]);
      return;
    }
    
    setIsSending(true);
    const results = { success: [] as string[], failed: [] as string[] };
    
    // Initialize all as pending
    const initialStatus: Record<string, 'pending' | 'success' | 'error'> = {};
    validMembers.forEach(m => {
      initialStatus[m.email] = 'pending';
    });
    setSendingStatus(initialStatus);
    
    // Send invitations in parallel (batch of 3 to avoid rate limits)
    for (let i = 0; i < validMembers.length; i += 3) {
      const batch = validMembers.slice(i, i + 3);
      
      await Promise.all(batch.map(async (member) => {
        try {
          const nameParts = member.full_name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const { error } = await supabase.functions.invoke('invite-team-member', {
            body: {
              email: member.email.trim().toLowerCase(),
              fullName: member.full_name.trim(),
              firstName,
              lastName,
              position: member.position || 'Team Member',
              department: member.department || 'General',
              role: member.role,
              employmentType: member.employment_type || 'employee',
              organizationId,
              officeId: member.office_id || null,
              isNewHire: true,
              // Required fields with defaults
              phone: '',
              street: '',
              city: '',
              state: '',
              country: '',
            }
          });
          
          if (error) throw error;
          results.success.push(member.email);
          setSendingStatus(prev => ({ ...prev, [member.email]: 'success' }));
        } catch (err) {
          console.error('Failed to invite:', member.email, err);
          results.failed.push(member.email);
          setSendingStatus(prev => ({ ...prev, [member.email]: 'error' }));
        }
      }));
    }
    
    // Show results
    if (results.success.length > 0) {
      toast({
        title: `${results.success.length} invitation${results.success.length > 1 ? 's' : ''} sent!`,
        description: 'Team members will receive an email with login instructions.',
      });
    }
    
    if (results.failed.length > 0) {
      toast({
        title: `${results.failed.length} invitation${results.failed.length > 1 ? 's' : ''} failed`,
        description: 'You can retry from the Team page later.',
        variant: 'destructive',
      });
    }
    
    setIsSending(false);
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {members.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <UserPlus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                No team members added yet
              </p>
              <Button type="button" variant="outline" onClick={addMember}>
                <Plus className="mr-2 h-4 w-4" />
                Add Team Member
              </Button>
            </div>
          ) : (
            <>
              {members.map((member, index) => {
                const memberPositions = getPositionsForMember(member.department || '');
                
                return (
                  <div
                    key={index}
                    className="p-4 rounded-lg border bg-muted/30 space-y-4 relative"
                  >
                    {/* Status indicator */}
                    {sendingStatus[member.email] && (
                      <div className="absolute top-4 right-12">
                        {sendingStatus[member.email] === 'pending' && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {sendingStatus[member.email] === 'success' && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                        {sendingStatus[member.email] === 'error' && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Team Member {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(index)}
                        className="text-destructive hover:text-destructive"
                        disabled={isSending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Row 1: Name and Email */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input
                          value={member.full_name}
                          onChange={(e) => updateMember(index, 'full_name', e.target.value)}
                          placeholder="John Doe"
                          disabled={isSending}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={member.email}
                          onChange={(e) => updateMember(index, 'email', e.target.value)}
                          placeholder="john@company.com"
                          disabled={isSending}
                        />
                      </div>
                    </div>

                    {/* Row 2: Office and Department */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Office</Label>
                        <Select
                          value={member.office_id || ''}
                          onValueChange={(value) => updateMember(index, 'office_id', value)}
                          disabled={loadingOffices || isSending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={loadingOffices ? "Loading..." : "Select office"} />
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

                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Select
                          value={member.department || ''}
                          onValueChange={(value) => updateMember(index, 'department', value)}
                          disabled={isSending}
                        >
                          <SelectTrigger>
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
                    </div>

                    {/* Row 3: Position and Employment Type */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <Select
                          value={member.position || ''}
                          onValueChange={(value) => updateMember(index, 'position', value)}
                          disabled={isSending}
                        >
                          <SelectTrigger>
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

                      <div className="space-y-2">
                        <Label>Employment Type</Label>
                        <Select
                          value={member.employment_type || ''}
                          onValueChange={(value) => updateMember(index, 'employment_type', value)}
                          disabled={loadingEmploymentTypes || isSending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={loadingEmploymentTypes ? "Loading..." : "Select type"} />
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
                    </div>

                    {/* Row 4: Role */}
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={member.role}
                        onValueChange={(value: TeamMember['role']) => updateMember(index, 'role', value)}
                        disabled={isSending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{role.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  — {role.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={addMember}
                className="w-full"
                disabled={isSending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Team Member
              </Button>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={isSending}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            {members.length === 0 || !hasValidMembers ? (
              <Button type="button" variant="secondary" onClick={onSkip} className="flex-1" disabled={isSending}>
                Skip for now
                <SkipForward className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSaving || isSending} className="flex-1">
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending invites...
                  </>
                ) : (
                  <>
                    Send Invites & Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            You can always invite more team members later from the Team page
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
