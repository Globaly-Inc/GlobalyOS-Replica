/**
 * Organization Onboarding - Feature Selection Step
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ArrowRight, Sparkles, Users, Calendar, FileText, MessageSquare, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureSelectionStepProps {
  initialFeatures: string[];
  onSave: (features: string[]) => void;
  onBack: () => void;
  isSaving: boolean;
}

const FEATURES = [
  {
    id: 'hr',
    name: 'HR & Attendance',
    description: 'Track attendance, work hours, and employee records',
    icon: Users,
    recommended: true,
  },
  {
    id: 'leave',
    name: 'Leave Management',
    description: 'Handle time-off requests, policies, and approvals',
    icon: Calendar,
    recommended: true,
  },
  {
    id: 'feed',
    name: 'Team Feed & Wins',
    description: 'Share updates, celebrate wins, and post announcements',
    icon: Sparkles,
    recommended: true,
  },
  {
    id: 'wiki',
    name: 'Wiki & Knowledge Base',
    description: 'Create and share documents, policies, and how-tos',
    icon: FileText,
    recommended: true,
  },
  {
    id: 'chat',
    name: 'Team Chat',
    description: 'Real-time messaging with spaces and direct messages',
    icon: MessageSquare,
    recommended: true,
  },
  {
    id: 'kpi',
    name: 'KPIs & OKRs',
    description: 'Track goals, key results, and performance metrics',
    icon: PieChart,
    recommended: false,
  },
];

export function FeatureSelectionStep({ initialFeatures, onSave, onBack, isSaving }: FeatureSelectionStepProps) {
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(
    new Set(initialFeatures)
  );

  const toggleFeature = (featureId: string) => {
    const newSet = new Set(enabledFeatures);
    if (newSet.has(featureId)) {
      newSet.delete(featureId);
    } else {
      newSet.add(featureId);
    }
    setEnabledFeatures(newSet);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(Array.from(enabledFeatures));
  };

  const enableAll = () => {
    setEnabledFeatures(new Set(FEATURES.map(f => f.id)));
  };

  const enableRecommended = () => {
    setEnabledFeatures(new Set(FEATURES.filter(f => f.recommended).map(f => f.id)));
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Choose Your Features</CardTitle>
        <CardDescription>
          Enable the modules your team needs. You can change these anytime in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-2 justify-center">
            <Button type="button" variant="outline" size="sm" onClick={enableRecommended}>
              Enable Recommended
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={enableAll}>
              Enable All
            </Button>
          </div>

          <div className="space-y-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              const isEnabled = enabledFeatures.has(feature.id);

              return (
                <div
                  key={feature.id}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer',
                    isEnabled
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  )}
                  onClick={() => toggleFeature(feature.id)}
                >
                  <div
                    className={cn(
                      'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                      isEnabled ? 'bg-primary/20' : 'bg-background'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isEnabled ? 'text-primary' : 'text-muted-foreground')} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{feature.name}</span>
                      {feature.recommended && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>

                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => toggleFeature(feature.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving...' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
