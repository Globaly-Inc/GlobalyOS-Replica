import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { WhatsAppConnectionForm } from '@/components/whatsapp/WhatsAppConnectionForm';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Clock, Shield, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import AuditLogViewer from '@/components/whatsapp/AuditLogViewer';

const WhatsAppSettingsPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();

  const { data: account } = useQuery({
    queryKey: ['wa-account', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from('wa_accounts')
        .select('*')
        .eq('organization_id', orgId!)
        .maybeSingle();
      return data;
    },
  });

  const [frequencyCap, setFrequencyCap] = useState('10');
  const [businessHours, setBusinessHours] = useState({
    start: '09:00',
    end: '18:00',
    timezone: 'UTC',
    days: 'mon,tue,wed,thu,fri',
  });

  useEffect(() => {
    if (account) {
      setFrequencyCap(String(account.frequency_cap_per_day ?? 10));
      const bh = account.business_hours as Record<string, unknown> | null;
      if (bh) {
        setBusinessHours({
          start: String(bh.start || '09:00'),
          end: String(bh.end || '18:00'),
          timezone: String(bh.timezone || 'UTC'),
          days: String(bh.days || 'mon,tue,wed,thu,fri'),
        });
      }
    }
  }, [account]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!account?.id) throw new Error('No account');
      const { error } = await supabase
        .from('wa_accounts')
        .update({
          frequency_cap_per_day: parseInt(frequencyCap) || 10,
          business_hours: businessHours,
        })
        .eq('id', account.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: ['wa-account'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const isConnected = account?.status === 'connected';

  return (
    <>
      <WhatsAppSubNav />
      <PageBody>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">WhatsApp Settings</h1>
            <p className="text-muted-foreground mt-1">
              Connect and configure your WhatsApp Business Account.
            </p>
          </div>

          <WhatsAppConnectionForm />

          {isConnected && (
            <>
              <Separator />

              {/* Business Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4" /> Business Hours
                  </CardTitle>
                  <CardDescription>
                    Set your operating hours for out-of-hours automation triggers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={businessHours.start}
                        onChange={(e) => setBusinessHours({ ...businessHours, start: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={businessHours.end}
                        onChange={(e) => setBusinessHours({ ...businessHours, end: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Working Days</Label>
                      <Input
                        value={businessHours.days}
                        onChange={(e) => setBusinessHours({ ...businessHours, days: e.target.value })}
                        placeholder="mon,tue,wed,thu,fri"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Comma-separated: mon,tue,wed,thu,fri</p>
                    </div>
                    <div>
                      <Label>Timezone</Label>
                      <Input
                        value={businessHours.timezone}
                        onChange={(e) => setBusinessHours({ ...businessHours, timezone: e.target.value })}
                        placeholder="UTC"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4" /> Compliance Settings
                  </CardTitle>
                  <CardDescription>
                    Configure messaging limits and consent enforcement.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="max-w-xs">
                    <Label>Daily Message Frequency Cap (per contact)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={frequencyCap}
                      onChange={(e) => setFrequencyCap(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum outbound messages per contact per day. Blocked sends are logged in the audit trail.
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1.5">
                    <p className="font-medium text-foreground">Enforced Rules:</p>
                    <ul className="text-muted-foreground text-xs space-y-1 list-disc list-inside">
                      <li>Opted-out contacts are blocked from all outbound messages</li>
                      <li>24h service window: only templates allowed after window closes</li>
                      <li>Frequency cap limits daily messages per contact</li>
                      <li>All blocked sends are logged to the audit trail</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>

              <Separator />

              {/* Audit Log */}
              <AuditLogViewer orgId={orgId} />
            </>
          )}
        </div>
      </PageBody>
    </>
  );
};

export default WhatsAppSettingsPage;
