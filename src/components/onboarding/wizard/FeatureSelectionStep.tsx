/**
 * Organization Onboarding - Feature Selection Step
 * Features are categorized: Core (always on), Default (on by default), Optional, Coming Soon
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Users, 
  Calendar, 
  FileText, 
  MessageSquare,
  PieChart, 
  Clock,
  GitBranch,
  Wallet,
  Lock,
  ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureSelectionStepProps {
  initialFeatures: string[];
  onSave: (features: string[]) => void;
  onBack: () => void;
  isSaving: boolean;
}

interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isCore?: boolean;
  defaultEnabled: boolean;
  comingSoon?: boolean;
  featureFlag?: string;
}

const FEATURES: FeatureDefinition[] = [
  // Core Features - Always enabled, cannot be toggled
  {
    id: 'hr',
    name: 'Team Directory & HR',
    description: 'Employee profiles, org chart, and HR management',
    icon: Users,
    isCore: true,
    defaultEnabled: true,
  },
  {
    id: 'feed',
    name: 'Social Team Feeds',
    description: 'Share updates, celebrate wins, and post announcements',
    icon: Sparkles,
    isCore: true,
    defaultEnabled: true,
  },
  // Default Features - Enabled by default, can be toggled
  {
    id: 'attendance',
    name: 'Attendance Tracking',
    description: 'Track work hours, clock-in/out, and attendance records',
    icon: Clock,
    defaultEnabled: true,
  },
  {
    id: 'leave',
    name: 'Leave Management',
    description: 'Handle time-off requests, policies, and approvals',
    icon: Calendar,
    defaultEnabled: true,
  },
  {
    id: 'wiki',
    name: 'Wiki & Knowledge Base',
    description: 'Create and share documents, policies, and how-tos',
    icon: FileText,
    defaultEnabled: true,
  },
  {
    id: 'kpi',
    name: 'KPI & Performance Reviews',
    description: 'Track goals, key results, and performance metrics',
    icon: PieChart,
    defaultEnabled: true,
  },
  // Coming Soon Features - Gated by Super Admin
  {
    id: 'tasks',
    name: 'Task Management',
    description: 'Create, assign, and track tasks and projects',
    icon: ListTodo,
    comingSoon: true,
    featureFlag: 'tasks',
    defaultEnabled: false,
  },
  {
    id: 'chat',
    name: 'Team Chat',
    description: 'Real-time messaging with spaces and direct messages',
    icon: MessageSquare,
    comingSoon: true,
    featureFlag: 'chat',
    defaultEnabled: false,
  },
  {
    id: 'workflows',
    name: 'Onboarding & Offboarding Workflows',
    description: 'Automated workflows for employee lifecycle',
    icon: GitBranch,
    comingSoon: true,
    featureFlag: 'workflows',
    defaultEnabled: false,
  },
  {
    id: 'payroll',
    name: 'Payroll',
    description: 'Salary processing, payslips, and tax calculations',
    icon: Wallet,
    comingSoon: true,
    featureFlag: 'payroll',
    defaultEnabled: false,
  },
];

// Get default enabled features
export const getDefaultEnabledFeatures = (): string[] => {
  return FEATURES.filter(f => f.defaultEnabled && !f.comingSoon).map(f => f.id);
};

export function FeatureSelectionStep({ initialFeatures, onSave, onBack, isSaving }: FeatureSelectionStepProps) {
  // Initialize with core features always included
const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(() => {
  // If no initial features provided, use defaults
  const initial = initialFeatures.length > 0 
    ? new Set(initialFeatures)
    : new Set(getDefaultEnabledFeatures());
  // Always ensure core features are enabled
  FEATURES.filter(f => f.isCore).forEach(f => initial.add(f.id));
  // Always ensure coming soon features are disabled
  FEATURES.filter(f => f.comingSoon).forEach(f => initial.delete(f.id));
  return initial;
});

  const toggleFeature = (feature: FeatureDefinition) => {
    // Cannot toggle core or coming soon features
    if (feature.isCore || feature.comingSoon) return;
    
    const newSet = new Set(enabledFeatures);
    if (newSet.has(feature.id)) {
      newSet.delete(feature.id);
    } else {
      newSet.add(feature.id);
    }
    setEnabledFeatures(newSet);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Always include core features
    const features = Array.from(enabledFeatures);
    FEATURES.filter(f => f.isCore).forEach(f => {
      if (!features.includes(f.id)) features.push(f.id);
    });
    onSave(features);
  };


  const renderFeatureItem = (feature: FeatureDefinition) => {
    const Icon = feature.icon;
    const isEnabled = enabledFeatures.has(feature.id);
    const isDisabled = feature.isCore || feature.comingSoon;

    return (
      <div
        key={feature.id}
        className={cn(
          'flex items-center gap-4 p-4 rounded-lg border transition-all',
          feature.comingSoon
            ? 'border-border bg-muted/20 opacity-60'
            : isEnabled
              ? 'border-primary/50 bg-primary/5'
              : 'border-border bg-muted/30 hover:bg-muted/50',
          !isDisabled && 'cursor-pointer'
        )}
        onClick={() => !isDisabled && toggleFeature(feature)}
      >
        <div
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
            feature.comingSoon
              ? 'bg-muted'
              : isEnabled 
                ? 'bg-primary/20' 
                : 'bg-background'
          )}
        >
          <Icon className={cn(
            'h-5 w-5', 
            feature.comingSoon
              ? 'text-muted-foreground'
              : isEnabled 
                ? 'text-primary' 
                : 'text-muted-foreground'
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "font-medium text-sm",
              feature.comingSoon && "text-muted-foreground"
            )}>
              {feature.name}
            </span>
            {feature.isCore && (
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                <Lock className="h-3 w-3 mr-1" />
                Core
              </Badge>
            )}
            {feature.comingSoon && (
              <Badge variant="outline" className="text-xs">
                Coming Soon
              </Badge>
            )}
          </div>
          <p className={cn(
            "text-xs",
            feature.comingSoon ? "text-muted-foreground/70" : "text-muted-foreground"
          )}>
            {feature.description}
          </p>
        </div>

        <Switch
          checked={isEnabled}
          onCheckedChange={() => toggleFeature(feature)}
          onClick={(e) => e.stopPropagation()}
          disabled={isDisabled}
          className={cn(
            feature.isCore && "opacity-50",
            feature.comingSoon && "opacity-30 cursor-not-allowed"
          )}
        />
      </div>
    );
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FEATURES.map(renderFeatureItem)}
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
