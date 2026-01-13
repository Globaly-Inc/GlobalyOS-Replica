/**
 * Employee Onboarding - Welcome Step
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, MapPin, Briefcase } from 'lucide-react';

interface EmployeeWelcomeStepProps {
  employeeName: string;
  orgName: string;
  position?: string;
  department?: string;
  officeName?: string;
  officeLocation?: string;
  avatarUrl?: string | null;
  onContinue: () => void;
}

export function EmployeeWelcomeStep({
  employeeName,
  orgName,
  position,
  department,
  officeName,
  officeLocation,
  avatarUrl,
  onContinue,
}: EmployeeWelcomeStepProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <Avatar className="h-20 w-20 mx-auto mb-4">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-2xl bg-primary/10 text-primary">
            {employeeName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <CardTitle className="text-2xl">
          Welcome to {orgName}, {employeeName}! 🎉
        </CardTitle>
        <CardDescription className="text-base">
          We're excited to have you on the team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          {position && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-primary" />
              <span>{position}{department ? ` • ${department}` : ''}</span>
            </div>
          )}
          {(officeName || officeLocation) && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{officeName}{officeLocation ? ` • ${officeLocation}` : ''}</span>
            </div>
          )}
        </div>

        <Button onClick={onContinue} className="w-full h-12 text-base" size="lg">
          Start Onboarding
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
