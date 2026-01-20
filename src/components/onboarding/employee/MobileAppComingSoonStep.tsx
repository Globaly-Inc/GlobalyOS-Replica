/**
 * Employee Onboarding - Mobile App Coming Soon + Complete Step
 * Final step with mobile preview and completion
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, Smartphone, CheckCircle2, Wifi, Bell, MapPin, PartyPopper } from 'lucide-react';

interface MobileAppComingSoonStepProps {
  employeeName: string;
  orgName: string;
  onFinish: () => void;
  onBack?: () => void;
  isCompleting: boolean;
}

export function MobileAppComingSoonStep({ 
  employeeName, 
  orgName, 
  onFinish, 
  onBack,
  isCompleting 
}: MobileAppComingSoonStepProps) {
  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      {/* Celebration header */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background pt-8 pb-6 px-6 text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-bounce">
          <PartyPopper className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          You're All Set, {employeeName}! 🎉
        </h1>
        <p className="text-muted-foreground">
          Welcome to {orgName}. Your onboarding is complete!
        </p>
      </div>

      <CardContent className="pt-6 pb-8 px-6 space-y-6">
        {/* Completion checklist */}
        <div className="space-y-2">
          {[
            'Profile completed',
            'Timezone configured',
            'Features explored',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>

        {/* Mobile app teaser */}
        <div className="relative p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-4 right-4 flex gap-1">
            <Wifi className="h-4 w-4 text-white/50" />
            <Bell className="h-4 w-4 text-white/50" />
          </div>
          
          <div className="flex items-center gap-6">
            {/* Phone mockup */}
            <div className="relative">
              <div className="w-20 h-36 bg-slate-700 rounded-2xl border-4 border-slate-600 flex items-center justify-center">
                <Smartphone className="h-10 w-10 text-slate-400" />
              </div>
              {/* Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-slate-600 rounded-full" />
            </div>

            <div className="flex-1">
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Coming Soon
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Mobile App
              </h3>
              <p className="text-sm text-slate-300">
                Take GlobalyOS with you. Check in, apply for leave, and stay connected on the go.
              </p>

              {/* Platform badges */}
              <div className="flex gap-2 mt-3">
                <span className="px-2 py-1 text-xs font-medium rounded bg-white/10 text-white/70">
                  iOS
                </span>
                <span className="px-2 py-1 text-xs font-medium rounded bg-white/10 text-white/70">
                  Android
                </span>
              </div>
            </div>
          </div>

          {/* Location pin decoration */}
          <MapPin className="absolute bottom-4 right-4 h-5 w-5 text-white/20" />
        </div>

        {/* Quick reminder */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            You can always access your profile, attendance, and more from the{' '}
            <span className="font-medium text-foreground">header menu</span>.
          </p>
        </div>

        <div className="flex gap-3">
          {onBack && (
            <Button 
              variant="outline" 
              onClick={onBack}
              disabled={isCompleting}
              className="h-14 px-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <Button 
            onClick={onFinish} 
            disabled={isCompleting}
            className="flex-1 h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all" 
            size="lg"
          >
            {isCompleting ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Finishing up...
              </>
            ) : (
              <>
                Go to Home
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
