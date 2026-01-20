/**
 * Employee Onboarding - Profile Access Guide Step
 * How to access and update their profile
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, User, Camera, Shield, Settings, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ProfileGuideStepProps {
  employeeName: string;
  onContinue: () => void;
  onBack?: () => void;
}

export function ProfileGuideStep({ employeeName, onContinue, onBack }: ProfileGuideStepProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <User className="h-8 w-8 text-purple-600" />
        </div>
        <CardTitle className="text-2xl">Access Your Profile</CardTitle>
        <CardDescription className="text-base">
          Your profile is your professional identity in GlobalyOS
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Visual hint - avatar in header */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full border-2 border-dashed border-primary/50">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {employeeName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{employeeName}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Click your avatar in the header to access your profile
        </p>

        {/* Key points */}
        <div className="space-y-3">
          {[
            {
              icon: Camera,
              title: 'Update your photo',
              description: 'Add a professional photo so your team can recognize you.',
              color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
            },
            {
              icon: User,
              title: 'Edit personal details',
              description: 'Keep your contact info, emergency contacts, and more up to date.',
              color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            },
            {
              icon: Shield,
              title: 'View your information',
              description: 'See your position, department, attendance history, and leave balance.',
              color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
            },
            {
              icon: Settings,
              title: 'Manage preferences',
              description: 'Control your notification settings and display options.',
              color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="h-12 px-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <Button onClick={onContinue} className="flex-1 h-12 text-base font-semibold" size="lg">
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
