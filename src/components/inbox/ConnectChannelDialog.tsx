import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChannelBadge } from './ChannelBadge';
import { Loader2, ExternalLink, Info } from 'lucide-react';
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

interface ChannelInstruction {
  steps: string[];
  portalUrl: string;
  portalLabel: string;
  note?: string;
}

const channelInstructions: Record<InboxChannelType, ChannelInstruction> = {
  whatsapp: {
    steps: [
      'Go to the Meta Developer Portal and create a new App with "Business" type (or select an existing one).',
      'Add the "WhatsApp" product to your app.',
      'Navigate to WhatsApp > API Setup to find your Phone Number ID and WhatsApp Business Account ID.',
      'Generate an Access Token on the same page. For production, create a permanent System User token via Meta Business Suite > Business Settings > System Users.',
    ],
    portalUrl: 'https://developers.facebook.com/apps/',
    portalLabel: 'Meta Developer Portal',
    note: 'Temporary tokens expire after 24 hours. For production use, generate a permanent token from a System User in Meta Business Suite.',
  },
  telegram: {
    steps: [
      'Open Telegram and search for @BotFather.',
      'Send /newbot and follow the prompts to choose a name and username (must end in "bot").',
      'BotFather will reply with your Bot Token — copy it and paste it below.',
    ],
    portalUrl: 'https://t.me/BotFather',
    portalLabel: 'Open BotFather in Telegram',
    note: 'This is the simplest channel to set up — no developer portal or app review needed.',
  },
  messenger: {
    steps: [
      'Go to the Meta Developer Portal and create or select your Meta App.',
      'Add the "Messenger" product to your app.',
      'In Messenger Settings, select your Facebook Page and generate a Page Access Token.',
      'Find your Page ID from your Facebook Page\'s "About" section or Page Settings.',
    ],
    portalUrl: 'https://developers.facebook.com/apps/',
    portalLabel: 'Meta Developer Portal',
    note: 'Your app must be switched to Live mode for public use. OAuth-based connection is planned for a future release.',
  },
  instagram: {
    steps: [
      'Use the same Meta App as Messenger (or create one) and add the "Instagram" product.',
      'Enable the instagram_manage_messages permission in App Review.',
      'Use the Graph API Explorer to generate a Page Access Token for your linked Facebook Page.',
      'Find your Instagram Business Account ID via the API or in Meta Business Suite > Accounts.',
    ],
    portalUrl: 'https://developers.facebook.com/apps/',
    portalLabel: 'Meta Developer Portal',
    note: 'Prerequisite: Your Instagram account must be a Business or Professional account linked to a Facebook Page.',
  },
  tiktok: {
    steps: [
      'Go to the TikTok Developer Portal and create a developer account.',
      'Create a new app and activate the relevant solution (e.g., Content Posting, Marketing).',
      'Copy your Client Key and Client Secret from the app dashboard.',
      'Generate a Client Access Token via the TikTok OAuth endpoint.',
    ],
    portalUrl: 'https://developers.tiktok.com/',
    portalLabel: 'TikTok Developer Portal',
    note: 'TikTok messaging API access requires partner-level approval. OAuth-based connection is planned for a future release.',
  },
  email: {
    steps: [
      'For Gmail: Enable 2-Step Verification on your Google Account, then generate an App Password.',
      'For Outlook/Office 365: Use imap-mail.outlook.com as the IMAP host with your email and password.',
      'For other providers: Find the IMAP host in your email provider\'s documentation and use your email credentials.',
    ],
    portalUrl: 'https://myaccount.google.com/apppasswords',
    portalLabel: 'Google App Passwords (Gmail)',
    note: 'Common IMAP hosts: imap.gmail.com (Gmail), imap-mail.outlook.com (Outlook), imap.mail.yahoo.com (Yahoo). OAuth for Gmail/Outlook is planned as a future option.',
  },
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
  const instructions = channelInstructions[channelType];

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChannelBadge channel={channelType} size="md" />
            Connect {meta.label}
          </DialogTitle>
          <DialogDescription>
            Enter your API credentials to connect this channel to your inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-300">
            <Info className="h-4 w-4 shrink-0" />
            How to get your credentials
          </div>
          <ol className="list-decimal list-inside space-y-1 text-xs text-blue-700 dark:text-blue-400">
            {instructions.steps.map((step, i) => (
              <li key={i} className="leading-relaxed">{step}</li>
            ))}
          </ol>
          <a
            href={instructions.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            {instructions.portalLabel}
          </a>
          {instructions.note && (
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              💡 {instructions.note}
            </p>
          )}
        </div>

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
