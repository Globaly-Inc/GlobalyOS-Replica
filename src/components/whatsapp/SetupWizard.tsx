import { Check, Circle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { OrgLink } from '@/components/OrgLink';
import type { SetupStep } from '@/types/whatsapp';

export const SetupWizard = () => {
  const { currentOrg } = useOrganization();

  const { data: account } = useQuery({
    queryKey: ['wa-account', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return null;
      const { data } = await supabase
        .from('wa_accounts')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .maybeSingle();
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  const { data: templateCount } = useQuery({
    queryKey: ['wa-template-count', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return 0;
      const { count } = await supabase
        .from('wa_templates')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrg.id);
      return count ?? 0;
    },
    enabled: !!currentOrg?.id,
  });

  const { data: contactCount } = useQuery({
    queryKey: ['wa-contact-count', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return 0;
      const { count } = await supabase
        .from('wa_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrg.id);
      return count ?? 0;
    },
    enabled: !!currentOrg?.id,
  });

  const isConnected = account?.status === 'connected';

  const steps: SetupStep[] = [
    {
      key: 'connect',
      title: 'Connect WhatsApp Business Account',
      description: 'Link your WABA and phone number to start sending and receiving messages.',
      completed: isConnected,
    },
    {
      key: 'webhook',
      title: 'Configure Webhook',
      description: 'Set up the webhook URL in your Meta App Dashboard to receive messages.',
      completed: isConnected && !!account?.webhook_secret,
    },
    {
      key: 'verify',
      title: 'Verify Connection',
      description: 'Send a test event to confirm your webhook is receiving messages.',
      completed: isConnected,
    },
    {
      key: 'template',
      title: 'Create First Template',
      description: 'Create a message template for outbound messaging.',
      completed: (templateCount ?? 0) > 0,
    },
    {
      key: 'contacts',
      title: 'Import or Add Contacts',
      description: 'Add WhatsApp contacts with proper consent.',
      completed: (contactCount ?? 0) > 0,
    },
    {
      key: 'test',
      title: 'Send Test Message',
      description: 'Send your first WhatsApp message to verify everything works.',
      completed: false,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Getting Started</h2>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {steps.length} steps completed
          </p>
        </div>
        <div className="h-2 w-48 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {steps.map((step, index) => (
          <Card key={step.key} className={step.completed ? 'border-primary/30 bg-primary/5' : ''}>
            <CardContent className="flex items-center gap-4 py-4">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  step.completed
                    ? 'bg-primary text-primary-foreground'
                    : 'border-2 border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {step.completed ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    step.completed ? 'text-foreground' : 'text-foreground'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {!step.completed && (
                <OrgLink to="/crm/whatsapp/settings">
                  <Button variant="outline" size="sm" className="shrink-0">
                    <ArrowRight className="h-3 w-3 mr-1" />
                    Start
                  </Button>
                </OrgLink>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
