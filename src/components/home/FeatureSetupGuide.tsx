import { useState } from 'react';
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
  Users,
  MessageSquare,
  ListTodo,
  DollarSign,
  BookOpen,
  FileText,
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
    key: 'crm',
    label: 'CRM',
    description: 'Add your first contact or company',
    settingsPath: '/crm',
    icon: Users,
  },
  {
    key: 'chat',
    label: 'Chat',
    description: 'Create your first chat channel',
    settingsPath: '/chat',
    icon: MessageSquare,
  },
  {
    key: 'tasks',
    label: 'Tasks',
    description: 'Create your first task board',
    settingsPath: '/tasks',
    icon: ListTodo,
  },
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
  {
    key: 'payroll',
    label: 'Payroll',
    description: 'Configure your payroll settings',
    settingsPath: '/settings/payroll',
    icon: DollarSign,
  },
  {
    key: 'accounting',
    label: 'Accounting',
    description: 'Set up your chart of accounts & ledger',
    settingsPath: '/accounting',
    icon: BookOpen,
  },
  {
    key: 'forms',
    label: 'Forms',
    description: 'Create your first form template',
    settingsPath: '/forms',
    icon: FileText,
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

  const { data: readiness } = useQuery({
    queryKey: ['feature-setup-readiness', orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      const results: Record<string, boolean> = {};

      // Hiring: pipelines
      const { count: pipelineCount } = await supabase
        .from('org_pipelines')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!);
      results.hiring = (pipelineCount ?? 0) > 0;

      // Omni-Channel Inbox: channels
      const { count: channelCount } = await supabase
        .from('inbox_channels')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!);
      results.omnichannel_inbox = (channelCount ?? 0) > 0;

      // Telephony: phone numbers
      const { count: phoneCount } = await supabase
        .from('org_phone_numbers')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!)
        .neq('status', 'released');
      results.telephony = (phoneCount ?? 0) > 0;

      // Workflows: templates
      const { count: workflowCount } = await supabase
        .from('workflow_templates')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!);
      results.workflows = (workflowCount ?? 0) > 0;

      // CRM: contacts
      const { count: crmCount } = await supabase
        .from('crm_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!);
      results.crm = (crmCount ?? 0) > 0;

      // Chat: channels (table may not exist)
      try {
        const { count: chatCount } = await supabase
          .from('chat_channels' as any)
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!);
        results.chat = (chatCount ?? 0) > 0;
      } catch { results.chat = false; }

      // Tasks: boards (table may not exist)
      try {
        const { count: taskCount } = await supabase
          .from('task_boards' as any)
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!);
        results.tasks = (taskCount ?? 0) > 0;
      } catch { results.tasks = false; }

      // Payroll: settings (table may not exist)
      try {
        const { count: payrollCount } = await supabase
          .from('payroll_settings' as any)
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!);
        results.payroll = (payrollCount ?? 0) > 0;
      } catch { results.payroll = false; }

      // Accounting: setups with active status
      const { count: accountingCount } = await supabase
        .from('accounting_setups')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!)
        .eq('status', 'active');
      results.accounting = (accountingCount ?? 0) > 0;

      // Forms: templates (table may not exist)
      try {
        const { count: formsCount } = await supabase
          .from('form_templates' as any)
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId!);
        results.forms = (formsCount ?? 0) > 0;
      } catch { results.forms = false; }

      return results;
    },
  });

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

  if (totalCount === 0 || incompleteFeatures.length === 0) return null;

  const progressPercent = totalCount > 0 ? (configuredCount / totalCount) * 100 : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 pb-1.5 text-left">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-foreground">Complete Your Setup</h3>
              <span className="text-[10px] text-muted-foreground">
                {configuredCount}/{totalCount}
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <div className="px-3 pb-1.5">
          <Progress value={progressPercent} className="h-1" />
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 space-y-1.5">
            {incompleteFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.key}
                  className="flex items-center gap-2 rounded-md border border-border bg-card p-2"
                >
                  <div className="rounded bg-primary/10 p-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{feature.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{feature.description}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" asChild>
                    <OrgLink to={feature.settingsPath}>Set up</OrgLink>
                  </Button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(feature.key);
                    }}
                    className="text-muted-foreground hover:text-foreground p-0.5"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
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
