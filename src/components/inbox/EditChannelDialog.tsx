import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChannelBadge } from './ChannelBadge';
import { Loader2, Copy, Check, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { InboxChannelType } from '@/types/inbox';
import { CHANNEL_META } from '@/types/inbox';

interface EditChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: any | null;
}

const channelFields: Record<string, { label: string; placeholder: string; key: string }[]> = {
  whatsapp: [
    { label: 'Access Token', placeholder: 'EAA...', key: 'access_token' },
    { label: 'Phone Number ID', placeholder: '123456789...', key: 'phone_number_id' },
    { label: 'Business Account ID', placeholder: '987654321...', key: 'business_account_id' },
  ],
  telegram: [
    { label: 'Bot Token', placeholder: '123456:ABC-DEF...', key: 'bot_token' },
  ],
  messenger: [
    { label: 'Page Access Token', placeholder: 'EAA...', key: 'page_access_token' },
    { label: 'Page ID', placeholder: '123456789', key: 'page_id' },
  ],
  instagram: [
    { label: 'Page Access Token', placeholder: 'EAA...', key: 'page_access_token' },
    { label: 'Instagram Business Account ID', placeholder: '123456789', key: 'ig_account_id' },
  ],
  email: [
    { label: 'IMAP Host', placeholder: 'imap.gmail.com', key: 'imap_host' },
    { label: 'Email Address', placeholder: 'support@company.com', key: 'email' },
    { label: 'Password / App Password', placeholder: '••••••••', key: 'password' },
  ],
  tiktok: [
    { label: 'Access Token', placeholder: 'act.xxxxx', key: 'access_token' },
  ],
};

export const EditChannelDialog = ({ open, onOpenChange, channel }: EditChannelDialogProps) => {
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copiedForwarding, setCopiedForwarding] = useState(false);

  useEffect(() => {
    if (channel) {
      setDisplayName(channel.display_name || '');
      setCredentials(channel.credentials || {});
    }
  }, [channel]);

  if (!channel) return null;

  const channelType = channel.channel_type as InboxChannelType;
  const fields = channelFields[channelType] || [];
  const meta = CHANNEL_META[channelType];
  const isForwarding = channelType === 'email' && credentials?.method === 'forwarding';
  const forwardingAddress = credentials?.forwarding_address || '';

  const handleCopyForwarding = () => {
    navigator.clipboard.writeText(forwardingAddress);
    setCopiedForwarding(true);
    toast.success('Forwarding address copied');
    setTimeout(() => setCopiedForwarding(false), 2000);
  };

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('inbox_channels')
        .update({
          display_name: displayName.trim(),
          credentials,
        })
        .eq('id', channel.id);
      if (error) throw error;
      toast.success('Channel updated');
      qc.invalidateQueries({ queryKey: ['inbox-channels'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update channel');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChannelBadge channel={channelType} size="md" />
            Edit {meta.label} Channel
          </DialogTitle>
          <DialogDescription>
            Update the display name or credentials for this channel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              placeholder={`e.g. ${meta.label} - Support`}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {isForwarding ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Forwarding Address</Label>
                <div className="flex gap-2">
                  <Input readOnly value={forwardingAddress} className="font-mono text-xs bg-muted/50" />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopyForwarding} className="shrink-0">
                    {copiedForwarding ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20 p-3 space-y-2">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Forwarding is active</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Emails forwarded to this address will appear in your inbox. Make sure your email provider is still forwarding to this address.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a href="https://support.google.com/mail/answer/10957" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
                    <ExternalLink className="h-2.5 w-2.5" /> Gmail Guide
                  </a>
                  <a href="https://support.microsoft.com/en-us/office/turn-on-automatic-forwarding-10bd5fe2-ec46-4398-a422-87e919d547e0" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
                    <ExternalLink className="h-2.5 w-2.5" /> Outlook Guide
                  </a>
                </div>
              </div>
            </div>
          ) : (
            fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  type={field.key.includes('token') || field.key.includes('password') ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={credentials[field.key] || ''}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !displayName.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
