import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChannelBadge } from './ChannelBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, ExternalLink, Info, Zap, ArrowLeft, CheckCircle2, Clock, Copy, Check, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { InboxChannelType } from '@/types/inbox';
import { CHANNEL_META } from '@/types/inbox';

const channelsWithOAuth = new Set<InboxChannelType>(['whatsapp', 'messenger', 'instagram', 'tiktok']);

interface OAuthMeta {
  title: string;
  description: string;
  steps: string[];
  oauthUrl: string;
  oauthLabel: string;
  scopes: string;
  note: string;
}

const oauthMeta: Partial<Record<InboxChannelType, OAuthMeta>> = {
  whatsapp: {
    title: 'WhatsApp Embedded Signup',
    description: 'Connect your WhatsApp Business account directly through Meta\'s Embedded Signup flow — no need to copy tokens manually.',
    steps: [
      'Click "Start Integration" to open Meta\'s login window.',
      'Log in with your Facebook account and select your Business portfolio.',
      'Choose or create a WhatsApp Business Account and phone number.',
      'Grant the requested permissions and close the popup.',
    ],
    oauthUrl: 'https://developers.facebook.com/docs/whatsapp/embedded-signup',
    oauthLabel: 'Learn about Meta Embedded Signup',
    scopes: 'whatsapp_business_management, whatsapp_business_messaging',
    note: 'This requires your Meta App to be approved as a Tech Provider. The integration will be available once platform approval is complete.',
  },
  messenger: {
    title: 'Facebook Messenger OAuth',
    description: 'Connect your Facebook Page directly via Meta OAuth — we\'ll request the necessary page permissions automatically.',
    steps: [
      'Click "Start Integration" to open Facebook Login.',
      'Log in and select the Facebook Page you want to connect.',
      'Grant the requested permissions (pages_messaging, pages_manage_metadata).',
      'You\'ll be redirected back automatically once authorized.',
    ],
    oauthUrl: 'https://developers.facebook.com/docs/messenger-platform/getting-started',
    oauthLabel: 'Messenger Platform Docs',
    scopes: 'pages_messaging, pages_manage_metadata, pages_read_engagement',
    note: 'Your Meta App must pass App Review for these permissions before going live.',
  },
  instagram: {
    title: 'Instagram Direct OAuth',
    description: 'Connect your Instagram Business account via Meta OAuth to manage DMs directly from your inbox.',
    steps: [
      'Click "Start Integration" to open Facebook Login.',
      'Select the Facebook Page linked to your Instagram Business account.',
      'Grant permissions for instagram_manage_messages and pages_manage_metadata.',
      'Your Instagram account will be connected automatically.',
    ],
    oauthUrl: 'https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login',
    oauthLabel: 'Instagram API Docs',
    scopes: 'instagram_manage_messages, pages_manage_metadata, instagram_basic',
    note: 'Your Instagram account must be a Business or Professional account linked to a Facebook Page.',
  },
  tiktok: {
    title: 'TikTok OAuth Integration',
    description: 'Connect your TikTok account directly via TikTok\'s OAuth flow to manage comments and messages.',
    steps: [
      'Click "Start Integration" to open TikTok authorization.',
      'Log in with your TikTok account.',
      'Authorize the requested permissions for messaging access.',
      'You\'ll be redirected back once authorization is complete.',
    ],
    oauthUrl: 'https://developers.tiktok.com/doc/oauth-user-access-token-management',
    oauthLabel: 'TikTok OAuth Docs',
    scopes: 'user.info.basic, direct_message',
    note: 'TikTok messaging API access requires partner-level approval from TikTok. Contact TikTok developer support to apply.',
  },
};

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

const channelInstructions: Partial<Record<InboxChannelType, ChannelInstruction>> & Record<Exclude<InboxChannelType, 'sms' | 'gmail'>, ChannelInstruction> = {
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
  const [showOAuthDialog, setShowOAuthDialog] = useState(false);
  const [oauthWaiting, setOauthWaiting] = useState(false);
  const [emailMethod, setEmailMethod] = useState<'imap' | 'forwarding'>('imap');
  const [copiedForwarding, setCopiedForwarding] = useState(false);

  if (!channelType) return null;
  const fields = channelFields[channelType] || [];
  const meta = CHANNEL_META[channelType];
  const instructions = channelInstructions[channelType];
  const hasOAuth = channelsWithOAuth.has(channelType);
  const oauth = hasOAuth ? oauthMeta[channelType] : null;
  const isEmail = channelType === 'email';

  const orgShort = currentOrg?.id ? currentOrg.id.slice(0, 8) : 'org';
  const forwardingAddress = `inbox-${orgShort}@inbound.globalyos.app`;

  const handleCopyForwarding = () => {
    navigator.clipboard.writeText(forwardingAddress);
    setCopiedForwarding(true);
    toast.success('Forwarding address copied');
    setTimeout(() => setCopiedForwarding(false), 2000);
  };

  const handleSave = async () => {
    if (!currentOrg?.id || !displayName.trim()) return;
    setSaving(true);
    try {
      const finalCredentials = isEmail && emailMethod === 'forwarding'
        ? { method: 'forwarding', forwarding_address: forwardingAddress }
        : { ...credentials, ...(isEmail ? { method: 'imap' } : {}) };
      const { error } = await supabase.from('inbox_channels').insert({
        organization_id: currentOrg.id,
        channel_type: channelType as Exclude<InboxChannelType, 'sms'>,
        display_name: displayName.trim(),
        credentials: finalCredentials,
        webhook_status: 'pending',
        is_active: true,
        config: {},
      } as any);
      if (error) throw error;
      toast.success(`${meta.label} channel connected`);
      qc.invalidateQueries({ queryKey: ['inbox-channels'] });
      onOpenChange(false);
      setDisplayName('');
      setCredentials({});
      setEmailMethod('imap');
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect channel');
    } finally {
      setSaving(false);
    }
  };

  const handleStartOAuth = () => {
    if (oauth?.oauthUrl) {
      window.open(oauth.oauthUrl, '_blank', 'noopener,noreferrer');
      setOauthWaiting(true);
    }
  };

  return (
    <>
      <Dialog open={open && !showOAuthDialog} onOpenChange={onOpenChange}>
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

            {isEmail ? (
              <Tabs value={emailMethod} onValueChange={(v) => setEmailMethod(v as 'imap' | 'forwarding')}>
                <TabsList className="w-full">
                  <TabsTrigger value="imap" className="flex-1 gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    IMAP Connection
                  </TabsTrigger>
                  <TabsTrigger value="forwarding" className="flex-1 gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Email Forwarding
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="imap" className="space-y-4 mt-3">
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
                </TabsContent>
                <TabsContent value="forwarding" className="space-y-4 mt-3">
                  <div className="space-y-2">
                    <Label>Your forwarding address</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={forwardingAddress}
                        className="font-mono text-xs bg-muted/50"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={handleCopyForwarding} className="shrink-0">
                        {copiedForwarding ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20 p-3 space-y-2">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Setup Instructions</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-blue-700 dark:text-blue-400">
                      <li>Copy the forwarding address above.</li>
                      <li>Go to your email provider's forwarding settings.</li>
                      <li>Add this address as a forwarding destination.</li>
                      <li>Confirm the forwarding (some providers send a verification email).</li>
                    </ol>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a href="https://support.google.com/mail/answer/10957" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
                        <ExternalLink className="h-2.5 w-2.5" /> Gmail Guide
                      </a>
                      <a href="https://support.microsoft.com/en-us/office/turn-on-automatic-forwarding-10bd5fe2-ec46-4398-a422-87e919d547e0" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
                        <ExternalLink className="h-2.5 w-2.5" /> Outlook Guide
                      </a>
                      <a href="https://help.yahoo.com/kb/SLN22028.html" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200">
                        <ExternalLink className="h-2.5 w-2.5" /> Yahoo Guide
                      </a>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    💡 Once forwarding is active, incoming emails will appear as conversations in your inbox automatically.
                  </p>
                </TabsContent>
              </Tabs>
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

          <DialogFooter className={hasOAuth ? 'flex !justify-between' : ''}>
            {hasOAuth && (
              <Button
                variant="secondary"
                onClick={() => { setShowOAuthDialog(true); setOauthWaiting(false); }}
                className="gap-1.5"
              >
                <Zap className="h-4 w-4" />
                Integrate Directly
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !displayName.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Connect
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {hasOAuth && oauth && (
        <Dialog open={showOAuthDialog} onOpenChange={(v) => { if (!v) { setShowOAuthDialog(false); setOauthWaiting(false); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChannelBadge channel={channelType} size="md" />
                {oauth.title}
              </DialogTitle>
              <DialogDescription>{oauth.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">How it works</p>
                <div className="space-y-2.5">
                  {oauth.steps.map((step, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold">
                        {i + 1}
                      </span>
                      <p className="text-sm text-foreground leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md bg-muted/50 border border-border p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Permissions requested</p>
                <p className="text-xs text-foreground font-mono">{oauth.scopes}</p>
              </div>

              {oauthWaiting && (
                <div className="rounded-md border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-3 flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Waiting for authorization...</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">Complete the process in the new tab, then return here.</p>
                  </div>
                </div>
              )}

              <div className="rounded-md bg-muted/30 border border-border p-3 flex gap-2 items-start">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">{oauth.note}</p>
              </div>

              <a
                href={oauth.oauthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                {oauth.oauthLabel}
              </a>
            </div>

            <DialogFooter className="flex !justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowOAuthDialog(false); setOauthWaiting(false); }}
                className="gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Manual Setup
              </Button>
              <Button onClick={handleStartOAuth} className="gap-1.5">
                {oauthWaiting ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Open Again
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Start Integration
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};