/**
 * Employee Onboarding - Check In/Out Guide Step
 * Interactive tutorial on attendance tracking
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, Clock, MapPin, Bell, History, LogIn, LogOut } from 'lucide-react';

interface CheckInGuideStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function CheckInGuideStep({ onContinue, onBack }: CheckInGuideStepProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Clock className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl">Check In & Check Out</CardTitle>
        <CardDescription className="text-base">
          Track your work hours effortlessly with GlobalyOS
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Visual demo */}
        <div className="flex justify-center gap-4">
          <div className="flex flex-col items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
            <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
              <LogIn className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Check In</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-800">
            <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
              <LogOut className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Check Out</span>
          </div>
        </div>

        {/* Key points */}
        <div className="space-y-3">
          {[
            {
              icon: Clock,
              title: 'Start your day',
              description: 'Click "Check In" when you begin working. It\'s that simple!',
              color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            },
            {
              icon: MapPin,
              title: 'Works anywhere',
              description: 'Check in from the office or when working remotely.',
              color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
            },
            {
              icon: Bell,
              title: 'Friendly reminders',
              description: 'Forgot to check in? We\'ll send you a gentle reminder.',
              color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            },
            {
              icon: History,
              title: 'View your history',
              description: 'Access your complete attendance history anytime in your profile.',
              color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
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

        {/* Tip */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-center">
            <span className="font-medium text-primary">💡 Pro tip:</span>{' '}
            <span className="text-muted-foreground">
              You can find the Check In button in the header or on your Home page.
            </span>
          </p>
        </div>

        <div className="flex gap-3">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="h-12 px-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <Button onClick={onContinue} className="flex-1 h-12 text-base font-semibold" size="lg">
            I Understand
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
