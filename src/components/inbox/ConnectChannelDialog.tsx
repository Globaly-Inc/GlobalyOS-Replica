import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChannelBadge } from './ChannelBadge';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { InboxChannelType } from '@/types/inbox';
import { CHANNEL_META } from '@/types/inbox';

interface ConnectChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelType: InboxChannelType | null;
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

export const ConnectChannelDialog = ({ open, onOpenChange, channelType }: ConnectChannelDialogProps) => {
  const { currentOrg } = useOrganization();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!channelType) return null;
  const fields = channelFields[channelType] || [];
  const meta = CHANNEL_META[channelType];

  const handleSave = async () => {
    if (!currentOrg?.id || !displayName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('inbox_channels').insert({
        organization_id: currentOrg.id,
        channel_type: channelType,
        display_name: displayName.trim(),
        credentials,
        webhook_status: 'pending',
        is_active: true,
        config: {},
      });
      if (error) throw error;
      toast.success(`${meta.label} channel connected`);
      qc.invalidateQueries({ queryKey: ['inbox-channels'] });
      onOpenChange(false);
      setDisplayName('');
      setCredentials({});
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect channel');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChannelBadge channel={channelType} size="md" />
            Connect {meta.label}
          </DialogTitle>
          <DialogDescription>
            Enter your API credentials to connect this channel to your inbox.
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

          {fields.map((field) => (
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
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !displayName.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
