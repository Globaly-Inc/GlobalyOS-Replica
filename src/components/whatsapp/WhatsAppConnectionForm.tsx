import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Check, Plug, Unplug, Copy, ExternalLink, Loader2, Phone, Shield } from 'lucide-react';

export const WhatsAppConnectionForm = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [displayName, setDisplayName] = useState('');

  const { data: account, isLoading } = useQuery({
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

  const isConnected = account?.status === 'connected';

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('wa-connect', {
        body: {
          action: 'connect',
          organization_id: currentOrg?.id,
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
          access_token: accessToken,
          display_name: displayName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Connected', description: 'WhatsApp Business Account connected successfully.' });
      queryClient.invalidateQueries({ queryKey: ['wa-account'] });
      setAccessToken('');
    },
    onError: (err: any) => {
      toast({ title: 'Connection failed', description: err.message, variant: 'destructive' });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('wa-connect', {
        body: { action: 'disconnect', organization_id: currentOrg?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Disconnected', description: 'WhatsApp account disconnected.' });
      queryClient.invalidateQueries({ queryKey: ['wa-account'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wa-webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: 'Copied', description: 'Webhook URL copied to clipboard.' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Connection Status
              </CardTitle>
              <CardDescription>
                {isConnected
                  ? `Connected to ${account?.display_name || account?.display_phone || 'WhatsApp'}`
                  : 'Connect your WhatsApp Business Account to get started'}
              </CardDescription>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? (
                <><Check className="h-3 w-3 mr-1" /> Connected</>
              ) : (
                'Not Connected'
              )}
            </Badge>
          </div>
        </CardHeader>
        {isConnected && (
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">WABA ID:</span>
                <p className="font-mono">{account?.waba_id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone Number ID:</span>
                <p className="font-mono">{account?.phone_number_id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Display Phone:</span>
                <p>{account?.display_phone || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Connected At:</span>
                <p>{account?.connected_at ? new Date(account.connected_at).toLocaleDateString() : '—'}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                <Unplug className="h-4 w-4 mr-2" />
                {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Connect Form (if not connected) */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Connect WhatsApp Business Account
            </CardTitle>
            <CardDescription>
              Enter your Meta App credentials. You can find these in the{' '}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Meta Developer Dashboard <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="waba-id">WhatsApp Business Account ID</Label>
                <Input
                  id="waba-id"
                  placeholder="e.g. 123456789012345"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone-id">Phone Number ID</Label>
                <Input
                  id="phone-id"
                  placeholder="e.g. 123456789012345"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name (optional)</Label>
              <Input
                id="display-name"
                placeholder="e.g. Acme Support"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-token">Permanent Access Token</Label>
              <Input
                id="access-token"
                type="password"
                placeholder="System User access token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                <Shield className="h-3 w-3 inline mr-1" />
                This token is stored securely and never exposed to the client.
              </p>
            </div>
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={!wabaId || !phoneNumberId || !accessToken || connectMutation.isPending}
            >
              {connectMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
              ) : (
                <><Plug className="h-4 w-4 mr-2" /> Connect Account</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Paste this URL into your Meta App's WhatsApp webhook settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Verify Token:</Label>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              (configured as WHATSAPP_WEBHOOK_VERIFY_TOKEN secret)
            </code>
          </div>
          <p className="text-xs text-muted-foreground">
            Subscribe to the <strong>messages</strong> webhook field in your Meta App dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
