import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useInboxChannels } from '@/hooks/useInbox';
import { ChannelBadge } from '@/components/inbox/ChannelBadge';
import { ConnectChannelDialog } from '@/components/inbox/ConnectChannelDialog';
import { InboxSubNav } from '@/components/inbox/InboxSubNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Settings, Wifi, WifiOff, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { InboxChannelType } from '@/types/inbox';
import { CHANNEL_META } from '@/types/inbox';

const availableChannels: { type: InboxChannelType; description: string }[] = [
  { type: 'whatsapp', description: 'Connect your WhatsApp Business account via Meta Cloud API' },
  { type: 'telegram', description: 'Connect a Telegram Bot to receive and send messages' },
  { type: 'messenger', description: 'Connect your Facebook Page to manage Messenger conversations' },
  { type: 'instagram', description: 'Manage Instagram DMs from your connected page' },
  { type: 'tiktok', description: 'Monitor and respond to TikTok comments' },
  { type: 'email', description: 'Connect an email inbox for support conversations' },
];

const InboxChannelsPage = () => {
  const { data: channels = [], isLoading } = useInboxChannels();
  const [connectChannel, setConnectChannel] = useState<InboxChannelType | null>(null);
  const qc = useQueryClient();

  const toggleAutoReply = async (channelId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('inbox_channels')
      .update({ ai_auto_reply_enabled: enabled })
      .eq('id', channelId);
    if (error) {
      toast.error('Failed to update');
    } else {
      toast.success(enabled ? 'AI auto-reply enabled' : 'AI auto-reply disabled');
      qc.invalidateQueries({ queryKey: ['inbox-channels'] });
    }
  };

  return (
    <div>
      <InboxSubNav />
      <div className="container px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Channels</h1>
          <p className="text-sm text-muted-foreground mt-1">Connect messaging platforms to your inbox</p>
        </div>
      </div>

      {/* Connected channels */}
      {channels.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Connected</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {channels.map((ch) => (
              <Card key={ch.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChannelBadge channel={ch.channel_type as InboxChannelType} size="md" />
                      <div>
                        <CardTitle className="text-sm">{ch.display_name}</CardTitle>
                        <CardDescription className="text-xs">
                          {CHANNEL_META[ch.channel_type as InboxChannelType]?.label}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={ch.webhook_status === 'connected' ? 'default' : 'secondary'} className="text-[10px]">
                      {ch.webhook_status === 'connected' ? (
                        <><Wifi className="h-3 w-3 mr-1" /> Connected</>
                      ) : (
                        <><WifiOff className="h-3 w-3 mr-1" /> {ch.webhook_status}</>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Last webhook: {ch.last_webhook_at
                        ? format(new Date(ch.last_webhook_at), 'MMM d, HH:mm')
                        : 'Never'}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <Settings className="h-3 w-3 mr-1" /> Configure
                    </Button>
                  </div>
                  {ch.last_error && (
                    <p className="text-xs text-destructive truncate">{ch.last_error}</p>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-violet-500" />
                      <Label className="text-xs font-medium cursor-pointer">AI Auto-Reply</Label>
                    </div>
                    <Switch
                      checked={(ch as any).ai_auto_reply_enabled || false}
                      onCheckedChange={(checked) => toggleAutoReply(ch.id, checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available channels */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Available Channels</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {availableChannels
            .filter((ac) => !channels.some((c) => c.channel_type === ac.type))
            .map((ac) => (
              <Card key={ac.type} className="border border-dashed">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <ChannelBadge channel={ac.type} size="md" />
                    <div>
                      <CardTitle className="text-sm">{CHANNEL_META[ac.type].label}</CardTitle>
                      <CardDescription className="text-xs">{ac.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setConnectChannel(ac.type)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Connect
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      <ConnectChannelDialog
        open={!!connectChannel}
        onOpenChange={(open) => !open && setConnectChannel(null)}
        channelType={connectChannel}
      />
      </div>
    </div>
  );
};

export default InboxChannelsPage;
