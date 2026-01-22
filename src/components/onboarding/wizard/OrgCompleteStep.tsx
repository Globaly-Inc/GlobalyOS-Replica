/**
 * Organization Onboarding - Complete Step
 * Shows summary before setup, then animated progress screen on completion
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, ArrowLeft, Mail, Calendar, Clock, Sparkles } from 'lucide-react';
import { SetupProgressScreen } from './SetupProgressScreen';

interface TeamMember {
  email: string;
  full_name: string;
  position?: string;
  department?: string;
  role?: string;
  office_id?: string;
}

interface Office {
  id?: string;
  name: string;
  public_holidays_enabled?: boolean;
  address_components?: {
    country_code?: string;
  };
}

interface OwnerProfile {
  office_id?: string;
}

interface OrgCompleteStepProps {
  orgName: string;
  teamMembersCount: number;
  teamMembers: TeamMember[];
  offices?: Office[];
  employeeId?: string;
  ownerProfile?: OwnerProfile;
  organizationId: string;
  orgSlug?: string;
  onFinish: () => void;
  onBack: () => void;
  isCompleting: boolean;
}

export function OrgCompleteStep({ 
  orgName, 
  teamMembersCount, 
  teamMembers,
  offices,
  employeeId,
  ownerProfile,
  organizationId,
  orgSlug,
  onFinish, 
  onBack, 
  isCompleting 
}: OrgCompleteStepProps) {
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Calculate what will happen during setup
  const hasOfficesWithHolidays = offices?.some(o => o.public_holidays_enabled) ?? false;
  const hasTeamMembersWithOffices = teamMembers.some(m => m.office_id);

  const handleCompleteSetup = () => {
    setIsSettingUp(true);
  };

  // Show animated progress screen when setup is triggered
  if (isSettingUp) {
    return (
      <SetupProgressScreen
        orgName={orgName}
        teamMembersCount={teamMembersCount}
        organizationId={organizationId}
        teamMembers={teamMembers}
        offices={offices}
        employeeId={employeeId}
        ownerProfile={ownerProfile}
        orgSlug={orgSlug}
        onComplete={onFinish}
      />
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl">You're All Set! 🎉</CardTitle>
        <CardDescription className="text-base">
          <span className="font-medium text-foreground">{orgName}</span> is ready to go
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">When you click Complete Setup:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {teamMembersCount > 0 && (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                {teamMembersCount} team member{teamMembersCount > 1 ? 's' : ''} will receive invitation emails
              </li>
            )}
            {hasOfficesWithHolidays && (
              <li className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                Public holidays will be set up for your offices
              </li>
            )}
            {hasTeamMembersWithOffices && (
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                Work schedules will be assigned to team members
              </li>
            )}
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
              Explore your new workspace and customize settings
            </li>
          </ul>
        </div>

        <div className="flex gap-3 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onBack} 
            className="flex-1 h-12" 
            size="lg"
            disabled={isCompleting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={handleCompleteSetup} 
            disabled={isCompleting} 
            className="flex-1 h-12" 
            size="lg"
          >
            {isCompleting ? 'Completing...' : 'Complete Setup'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
