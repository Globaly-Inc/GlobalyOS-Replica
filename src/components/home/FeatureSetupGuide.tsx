import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { OrgLink } from '@/components/OrgLink';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Inbox,
  Phone,
  UserPlus,
  X,
} from 'lucide-react';
import { useFeatureFlags, FeatureName } from '@/hooks/useFeatureFlags';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface FeatureCheck {
  key: FeatureName;
  label: string;
  description: string;
  settingsPath: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FEATURE_CHECKS: FeatureCheck[] = [
  {
    key: 'hiring',
    label: 'Hiring',
    description: 'Set up your hiring pipeline and stages',
    settingsPath: '/settings/hiring',
    icon: UserPlus,
  },
  {
    key: 'omnichannel_inbox',
    label: 'Omni-Channel Inbox',
    description: 'Connect your first messaging channel',
    settingsPath: '/settings/inbox',
    icon: Inbox,
  },
  {
    key: 'telephony',
    label: 'Telephony',
    description: 'Provision a phone number for SMS & calls',
    settingsPath: '/settings/telephony',
    icon: Phone,
  },
  {
    key: 'workflows',
    label: 'Workflows',
    description: 'Create your first workflow template',
    settingsPath: '/settings/workflows',
    icon: ClipboardCheck,
  },
];

const DISMISS_STORAGE_KEY = 'globalyos_dismissed_setup_features';

function getDismissedFeatures(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export const FeatureSetupGuide = () => {
  const { isEnabled } = useFeatureFlags();
  const { currentOrg } = useOrganization();
  const [isOpen, setIsOpen] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>(getDismissedFeatures);

  const orgId = currentOrg?.id;

  // Query readiness for all features in one hook
  const { data: readiness } = useQuery({
    queryKey: ['feature-setup-readiness', orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      const results: Record<string, boolean> = {};

      // Check hiring pipelines
      const { count: pipelineCount } = await supabase
        .from('org_pipelines')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!);
      results.hiring = (pipelineCount ?? 0) > 0;

      // Check inbox channels
      const { count: channelCount } = await supabase
        .from('inbox_channels')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!);
      results.omnichannel_inbox = (channelCount ?? 0) > 0;

      // Check phone numbers
      const { count: phoneCount } = await supabase
        .from('org_phone_numbers')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!)
        .neq('status', 'released');
      results.telephony = (phoneCount ?? 0) > 0;

      // Check workflow templates
      const { count: workflowCount } = await supabase
        .from('workflow_templates')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!);
      results.workflows = (workflowCount ?? 0) > 0;

      return results;
    },
  });

  // Filter to only enabled but not-yet-configured features
  const incompleteFeatures = FEATURE_CHECKS.filter((f) => {
    if (!isEnabled(f.key)) return false;
    if (dismissed.includes(f.key)) return false;
    if (readiness && readiness[f.key]) return false;
    return true;
  });

  const enabledFeatures = FEATURE_CHECKS.filter((f) => isEnabled(f.key));
  const configuredCount = enabledFeatures.filter(
    (f) => readiness?.[f.key] || dismissed.includes(f.key)
  ).length;
  const totalCount = enabledFeatures.length;

  const handleDismiss = (key: string) => {
    const updated = [...dismissed, key];
    setDismissed(updated);
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(updated));
  };

  // Don't render if no enabled features need setup
  if (totalCount === 0 || incompleteFeatures.length === 0) return null;

  const progressPercent = totalCount > 0 ? (configuredCount / totalCount) * 100 : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 pb-2 text-left">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-foreground">Complete Your Setup</h3>
              <span className="text-xs text-muted-foreground ml-1">
                {configuredCount} of {totalCount} features configured
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <div className="px-4 pb-2">
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-1 space-y-2">
            {incompleteFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.key}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="rounded-md bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <OrgLink to={feature.settingsPath}>Set up</OrgLink>
                  </Button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(feature.key);
                    }}
                    className="text-muted-foreground hover:text-foreground p-1"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
