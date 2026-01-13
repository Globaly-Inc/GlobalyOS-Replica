/**
 * Employee Onboarding - Complete Step
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface EmployeeCompleteStepProps {
  employeeName: string;
  orgName: string;
  onFinish: () => void;
  isCompleting: boolean;
}

export function EmployeeCompleteStep({ employeeName, orgName, onFinish, isCompleting }: EmployeeCompleteStepProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl">You're All Set, {employeeName}! 🎉</CardTitle>
        <CardDescription className="text-base">
          Welcome to {orgName}. Your onboarding is complete.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button onClick={onFinish} disabled={isCompleting} className="w-full h-12 text-base" size="lg">
          {isCompleting ? 'Finishing...' : 'Go to Home'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
