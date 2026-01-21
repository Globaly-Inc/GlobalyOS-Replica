/**
 * Employee Onboarding - Profile Access Guide Step
 * How to access and update their profile
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, User, Shield, Loader2, Lock, LayoutDashboard } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileGuideStepProps {
  employeeName: string;
  avatarUrl?: string | null;
  onContinue: () => void;
  onBack?: () => void;
  isNavigating?: boolean;
}

export function ProfileGuideStep({ employeeName, avatarUrl, onContinue, onBack, isNavigating = false }: ProfileGuideStepProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-4">
        <Avatar className="mx-auto mb-4 h-20 w-20 border-4 border-primary/20">
          <AvatarImage src={avatarUrl || undefined} alt={employeeName} />
          <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
            {employeeName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <CardTitle className="text-2xl">Your Profile, Your Work ID</CardTitle>
        <CardDescription className="text-base">
          One place for your professional presence in the company
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Key points */}
        <div className="space-y-3">
          {[
            {
              icon: User,
              title: 'Update your profile',
              description: 'Add a professional photo and keep your contact info, emergency contacts, and more up to date.',
              color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            },
            {
              icon: Lock,
              title: 'Your privacy is protected',
              description: 'Personal details like salary, ID numbers, and emergency contacts are only visible to you, your manager, and HR/Admin.',
              color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
            },
            {
              icon: LayoutDashboard,
              title: '360 View of Your Work',
              description: 'Access your KPIs, OKRs, reviews, attendance history, and time-off balance in one unified view.',
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

        {/* Privacy highlight callout */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-foreground text-sm">Built-in Privacy Protection</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Team members can only see your work email and basic job info. Sensitive data like salary, banking details, tax numbers, and emergency contacts are restricted to authorized personnel only.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {onBack && (
            <Button variant="outline" onClick={onBack} disabled={isNavigating} className="h-12 px-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <Button onClick={onContinue} disabled={isNavigating} className="flex-1 h-12 text-base font-semibold" size="lg">
            {isNavigating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Please wait...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
