/**
 * Organization Onboarding - Welcome Step
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Settings2, Sparkles, ArrowRight } from 'lucide-react';

interface OrgWelcomeStepProps {
  ownerName: string;
  orgName: string;
  onContinue: () => void;
}

const SETUP_ITEMS = [
  {
    icon: Building2,
    title: 'Organization Details',
    description: 'Set up your company profile, logo, and basic information',
  },
  {
    icon: Users,
    title: 'Add Your Team',
    description: 'Invite your first team members to join GlobalyOS',
  },
  {
    icon: Settings2,
    title: 'Configure Features',
    description: 'Enable the modules your team needs most',
  },
  {
    icon: Sparkles,
    title: 'Quick HR Settings',
    description: 'Set up work weeks, leave policies, and more',
  },
];

export function OrgWelcomeStep({ ownerName, orgName, onContinue }: OrgWelcomeStepProps) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl md:text-3xl">
          Welcome to GlobalyOS, {ownerName.split(' ')[0]}! 🎉
        </CardTitle>
        <CardDescription className="text-base mt-2">
          Let's set up <span className="font-medium text-foreground">{orgName}</span> so your team can hit the ground running.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            In the next few minutes, you'll:
          </p>
          <div className="grid gap-3">
            {SETUP_ITEMS.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-background flex items-center justify-center shrink-0 shadow-sm">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={onContinue} 
            className="w-full h-12 text-base"
            size="lg"
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Takes about 5 minutes • You can always change settings later
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
