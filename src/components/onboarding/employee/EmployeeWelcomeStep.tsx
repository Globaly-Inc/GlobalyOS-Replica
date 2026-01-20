/**
 * Employee Onboarding - Welcome Step
 * Personalized welcome with owner name, org logo, and motivational content
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, MapPin, Briefcase, Sparkles, Loader2 } from 'lucide-react';

interface EmployeeWelcomeStepProps {
  employeeName: string;
  orgName: string;
  orgLogo?: string | null;
  ownerName?: string;
  position?: string;
  department?: string;
  officeName?: string;
  officeLocation?: string;
  avatarUrl?: string | null;
  onContinue: () => void;
  isNavigating?: boolean;
}

export function EmployeeWelcomeStep({
  employeeName,
  orgName,
  orgLogo,
  ownerName,
  position,
  department,
  officeName,
  officeLocation,
  avatarUrl,
  onContinue,
  isNavigating = false,
}: EmployeeWelcomeStepProps) {
  return (
    <Card className="border-0 shadow-xl overflow-hidden">
      {/* Header gradient */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background pt-8 pb-6 px-6">
        <div className="flex flex-col items-center text-center">
          {/* Org logo */}
          {orgLogo ? (
            <img 
              src={orgLogo} 
              alt={orgName} 
              className="h-20 w-20 rounded-2xl object-cover shadow-lg mb-4"
            />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-lg">
              <span className="text-primary font-bold text-3xl">
                {orgName?.charAt(0) || 'G'}
              </span>
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to {orgName}!
          </h1>
          
          {ownerName && (
            <p className="text-muted-foreground">
              You've been invited by <span className="font-medium text-foreground">{ownerName}</span>
            </p>
          )}
        </div>
      </div>

      <CardContent className="pt-6 pb-8 px-6 space-y-6">
        {/* Employee info card */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
          <Avatar className="h-16 w-16 ring-2 ring-primary/20">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-xl bg-primary text-primary-foreground font-semibold">
              {employeeName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-foreground truncate">
              Hey, {employeeName}! 👋
            </h2>
            
            <div className="mt-1 space-y-1">
              {position && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{position}{department ? ` • ${department}` : ''}</span>
                </div>
              )}
              {(officeName || officeLocation) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{officeName}{officeLocation ? ` • ${officeLocation}` : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Welcome message */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Let's get you started
          </div>
          
          <p className="text-muted-foreground max-w-md mx-auto">
            This quick onboarding will help you set up your profile, understand how to use GlobalyOS, 
            and get ready to collaborate with your team.
          </p>
        </div>

        {/* CTA Button */}
        <Button 
          onClick={onContinue}
          disabled={isNavigating}
          className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all" 
          size="lg"
        >
          {isNavigating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Please wait...
            </>
          ) : (
            <>
              Let's Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
