/**
 * Organization Onboarding - Complete Step
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, Users, Sparkles } from 'lucide-react';

interface OrgCompleteStepProps {
  orgName: string;
  teamMembersCount: number;
  onFinish: () => void;
  isCompleting: boolean;
}

export function OrgCompleteStep({ orgName, teamMembersCount, onFinish, isCompleting }: OrgCompleteStepProps) {
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
          <p className="text-sm font-medium">What's next:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {teamMembersCount > 0 && (
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {teamMembersCount} team member{teamMembersCount > 1 ? 's' : ''} will receive invitation emails
              </li>
            )}
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Explore your new workspace and customize settings
            </li>
          </ul>
        </div>

        <Button onClick={onFinish} disabled={isCompleting} className="w-full h-12 text-base" size="lg">
          {isCompleting ? 'Finishing...' : 'Go to Home'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
