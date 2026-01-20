/**
 * Employee Onboarding - Leave Request Guide Step
 * How to apply for leave
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Calendar, FileText, UserCheck, Clock, CalendarDays } from 'lucide-react';

interface LeaveGuideStepProps {
  onContinue: () => void;
}

export function LeaveGuideStep({ onContinue }: LeaveGuideStepProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <CalendarDays className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">Request Time Off</CardTitle>
        <CardDescription className="text-base">
          Need a break? Here's how to apply for leave
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Visual flow */}
        <div className="flex items-center justify-center gap-2">
          {[
            { step: 1, label: 'Select' },
            { step: 2, label: 'Submit' },
            { step: 3, label: 'Approved' },
          ].map((item, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {item.step}
                </div>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              {i < 2 && (
                <div className="w-8 h-0.5 bg-primary/30 mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Key points */}
        <div className="space-y-3">
          {[
            {
              icon: Calendar,
              title: 'Select your dates',
              description: 'Choose when you need time off and the leave type.',
              color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
            },
            {
              icon: FileText,
              title: 'Add a reason',
              description: 'Let your manager know why you\'re requesting leave.',
              color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
            },
            {
              icon: UserCheck,
              title: 'Manager review',
              description: 'Your request will be sent to your manager for approval.',
              color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            },
            {
              icon: Clock,
              title: 'Track your balance',
              description: 'View remaining leave days anytime in your profile.',
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

        {/* Leave types hint */}
        <div className="flex flex-wrap justify-center gap-2">
          {['Annual Leave', 'Sick Leave', 'Personal', 'Work From Home'].map((type) => (
            <span 
              key={type} 
              className="px-3 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground"
            >
              {type}
            </span>
          ))}
        </div>

        <Button onClick={onContinue} className="w-full h-12 text-base font-semibold" size="lg">
          Got It
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );
}
