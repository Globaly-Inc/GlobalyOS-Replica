/**
 * Organization Onboarding - Team Members Seeding Step
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Users, Plus, Trash2, UserPlus, SkipForward } from 'lucide-react';

interface TeamMember {
  email: string;
  full_name: string;
  position?: string;
  role: 'admin' | 'hr' | 'manager' | 'member';
}

interface TeamSeedingStepProps {
  initialMembers: TeamMember[];
  onSave: (members: TeamMember[]) => void;
  onBack: () => void;
  onSkip: () => void;
  isSaving: boolean;
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
  position: '',
  role: 'member',
};

export function TeamSeedingStep({ initialMembers, onSave, onBack, onSkip, isSaving }: TeamSeedingStepProps) {
  const [members, setMembers] = useState<TeamMember[]>(
    initialMembers.length > 0 ? initialMembers : []
  );

  const addMember = () => {
    setMembers([...members, { ...emptyMember }]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof TeamMember, value: string) => {
    setMembers(members.map((member, i) => 
      i === index ? { ...member, [field]: value } : member
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out incomplete members
    const validMembers = members.filter(m => m.email && m.full_name);
    onSave(validMembers);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
          Add team members to invite. They'll receive an email to join once setup is complete.
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
              {members.map((member, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-muted/30 space-y-4 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Team Member {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={member.full_name}
                        onChange={(e) => updateMember(index, 'full_name', e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={member.email}
                        onChange={(e) => updateMember(index, 'email', e.target.value)}
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Input
                        value={member.position || ''}
                        onChange={(e) => updateMember(index, 'position', e.target.value)}
                        placeholder="e.g., Product Manager"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={member.role}
                        onValueChange={(value: TeamMember['role']) => updateMember(index, 'role', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div>
                                <span className="font-medium">{role.label}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {role.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addMember}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Team Member
              </Button>
            </>
          )}

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
                {isSaving ? 'Saving...' : 'Continue'}
                <ArrowRight className="ml-2 h-4 w-4" />
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
