import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, ChevronDown, ChevronUp, Loader2, Send, Clock, Sparkles, Mail, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageBody } from '@/components/ui/page-body';
import { toast } from 'sonner';
import { AudienceSelector } from '@/components/campaigns/AudienceSelector';
import { CampaignStatusBadge } from '@/components/campaigns/CampaignStatusBadge';
import { renderEmailHtml, hasFooterBlock } from '@/components/campaigns/HtmlRenderer';
import {
  useCampaign, useCreateCampaign, useUpdateCampaign,
  useSenderIdentities, useCreateSenderIdentity,
} from '@/services/useCampaigns';
import { supabase } from '@/integrations/supabase/client';
import type { AudienceSource, AudienceFilters, EmailCampaign, EmailBuilderState } from '@/types/campaigns';
import { DEFAULT_BUILDER_STATE } from '@/types/campaigns';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Step = 'recipients' | 'from' | 'subject' | 'content' | 'send';

const STEPS: { key: Step; label: string; description: string }[] = [
  { key: 'recipients', label: 'Recipients', description: 'Who will receive this email?' },
  { key: 'from',       label: 'From',       description: 'Who is sending this email?' },
  { key: 'subject',    label: 'Subject',    description: 'What\'s the subject line?' },
  { key: 'content',    label: 'Content',    description: 'Design your email' },
  { key: 'send',       label: 'Send',       description: 'Review and send' },
];

export default function CampaignSetupPage() {
  const { id, orgCode } = useParams<{ id?: string; orgCode: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const { data: existingCampaign, isLoading } = useCampaign(isNew ? null : id);
  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();
  const { data: identities = [] } = useSenderIdentities();
  const createIdentityMutation = useCreateSenderIdentity();

  const [campaignId, setCampaignId] = useState<string | null>(isNew ? null : id ?? null);
  const [campaign, setCampaign] = useState<Partial<EmailCampaign>>({
    name: 'Untitled Campaign',
    status: 'draft',
    audience_source: 'crm_contacts',
    audience_filters: {},
    track_opens: true,
    track_clicks: true,
  });
  const [openStep, setOpenStep] = useState<Step>('recipients');
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [newSenderName, setNewSenderName] = useState('');
  const [newSenderEmail, setNewSenderEmail] = useState('');
  const [showAddSender, setShowAddSender] = useState(false);

  useEffect(() => {
    if (existingCampaign) setCampaign(existingCampaign);
  }, [existingCampaign?.id]);

  const save = async (patch: Partial<EmailCampaign> = {}) => {
    const merged = { ...campaign, ...patch };
    if (!campaignId) {
      const c = await createMutation.mutateAsync(merged);
      setCampaignId(c.id);
      setCampaign(c);
      navigate(`/org/${orgCode}/crm/campaigns/${c.id}`, { replace: true });
      return c;
    } else {
      const c = await updateMutation.mutateAsync({ id: campaignId, ...merged });
      setCampaign(c);
      return c;
    }
  };

  const isStepComplete = (step: Step): boolean => {
    const c = campaign;
    if (step === 'recipients') return !!(c.audience_source);
    if (step === 'from') return !!(c.from_name && c.from_email);
    if (step === 'subject') return !!(c.subject);
    if (step === 'content') {
      const state = c.content_json as EmailBuilderState | undefined;
      return !!(state?.blocks && state.blocks.length > 0);
    }
    return false;
  };

  const allStepsComplete = (['recipients', 'from', 'subject', 'content'] as Step[]).every(isStepComplete);
  const hasFooter = campaign.content_json ? hasFooterBlock(campaign.content_json as EmailBuilderState) : false;

  const handleSendNow = async () => {
    if (!campaignId) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-campaign', {
        body: { campaignId },
      });
      if (error) throw error;
      toast.success('Campaign is sending! Check the report for progress.');
      navigate(`/org/${orgCode}/crm/campaigns/${campaignId}/report`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  const handleSendTest = async () => {
    if (!campaignId) return;
    try {
      const { error } = await supabase.functions.invoke('send-test-campaign-email', {
        body: { campaignId },
      });
      if (error) throw error;
      toast.success('Test email sent to your email address!');
    } catch {
      toast.error('Failed to send test email');
    }
  };

  const handleAiImprove = async () => {
    if (!campaign.subject) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-improve-subject', {
        body: { subject: campaign.subject, preview_text: campaign.preview_text, campaign_name: campaign.name },
      });
      if (error) throw error;
      setAiSuggestions(data?.suggestions ?? []);
    } catch {
      toast.error('Failed to get AI suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddSender = async () => {
    if (!newSenderName || !newSenderEmail) return;
    try {
      const identity = await createIdentityMutation.mutateAsync({ display_name: newSenderName, from_email: newSenderEmail });
      await save({ from_name: identity.display_name, from_email: identity.from_email });
      setShowAddSender(false);
      setNewSenderName('');
      setNewSenderEmail('');
      toast.success('Sender identity added');
    } catch {
      toast.error('Failed to add sender');
    }
  };

  if (!isNew && isLoading) {
    return (
      <PageBody>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/org/${orgCode}/crm/campaigns`)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Campaigns
          </Button>
          <div>
            <Input
              value={campaign.name ?? ''}
              onChange={e => setCampaign(c => ({ ...c, name: e.target.value }))}
              onBlur={() => campaignId && save()}
              className="text-lg font-semibold border-0 p-0 h-auto bg-transparent focus-visible:ring-0 w-72"
            />
          </div>
          <CampaignStatusBadge status={(campaign.status as any) ?? 'draft'} />
        </div>
        <Button size="sm" variant="outline" onClick={() => save()}>Save Draft</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Checklist steps */}
        <div className="lg:col-span-3 space-y-3">
          {STEPS.map((step) => {
            const complete = isStepComplete(step.key);
            const isOpen = openStep === step.key;

            return (
              <div key={step.key} className="bg-card rounded-xl border border-border overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                  onClick={() => setOpenStep(isOpen ? 'recipients' : step.key)}
                >
                  <div className="flex items-center gap-3">
                    {complete
                      ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />}
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                      {!isOpen && (
                        <p className="text-xs text-muted-foreground">
                          {step.key === 'from' && campaign.from_email
                            ? `${campaign.from_name} <${campaign.from_email}>`
                            : step.key === 'subject' && campaign.subject
                            ? campaign.subject
                            : step.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-border pt-4">
                    {/* RECIPIENTS */}
                    {step.key === 'recipients' && (
                      <AudienceSelector
                        source={(campaign.audience_source as AudienceSource) ?? 'crm_contacts'}
                        filters={(campaign.audience_filters as AudienceFilters) ?? {}}
                        onSourceChange={s => setCampaign(c => ({ ...c, audience_source: s }))}
                        onFiltersChange={f => setCampaign(c => ({ ...c, audience_filters: f }))}
                      />
                    )}

                    {/* FROM */}
                    {step.key === 'from' && (
                      <div className="space-y-4">
                        {identities.length > 0 && (
                          <div className="space-y-1.5">
                            <Label className="text-sm">Select Sender</Label>
                            <Select
                              value={campaign.from_email ?? ''}
                              onValueChange={v => {
                                const identity = identities.find(i => i.from_email === v);
                                if (identity) setCampaign(c => ({ ...c, from_name: identity.display_name, from_email: identity.from_email }));
                              }}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Choose a sender identity" />
                              </SelectTrigger>
                              <SelectContent>
                                {identities.map(i => (
                                  <SelectItem key={i.id} value={i.from_email}>{i.display_name} &lt;{i.from_email}&gt;</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {!showAddSender && (
                          <Button size="sm" variant="outline" onClick={() => setShowAddSender(true)}>+ Add Sender Identity</Button>
                        )}

                        {showAddSender && (
                          <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Display Name</Label>
                                <Input value={newSenderName} onChange={e => setNewSenderName(e.target.value)} className="h-8 text-sm" placeholder="Acme Corp" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">From Email</Label>
                                <Input value={newSenderEmail} onChange={e => setNewSenderEmail(e.target.value)} className="h-8 text-sm" placeholder="hello@acme.com" />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">Emails are delivered via GlobalyOS infrastructure</p>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleAddSender} disabled={!newSenderName || !newSenderEmail}>Add</Button>
                              <Button size="sm" variant="ghost" onClick={() => setShowAddSender(false)}>Cancel</Button>
                            </div>
                          </div>
                        )}

                        {campaign.from_email && (
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Reply-To (optional)</Label>
                            <Input
                              value={campaign.reply_to ?? ''}
                              onChange={e => setCampaign(c => ({ ...c, reply_to: e.target.value }))}
                              className="h-8 text-sm"
                              placeholder="replies@company.com"
                            />
                          </div>
                        )}

                        <Button size="sm" onClick={() => save()} disabled={!campaign.from_email}>Save</Button>
                      </div>
                    )}

                    {/* SUBJECT */}
                    {step.key === 'subject' && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Subject Line</Label>
                          <div className="flex gap-2">
                            <Input
                              value={campaign.subject ?? ''}
                              onChange={e => setCampaign(c => ({ ...c, subject: e.target.value }))}
                              className="h-9"
                              placeholder="Your subject line here…"
                            />
                            <Button size="sm" variant="outline" onClick={handleAiImprove} disabled={!campaign.subject || aiLoading} className="gap-1.5 shrink-0">
                              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                              AI
                            </Button>
                          </div>
                        </div>

                        {aiSuggestions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium">AI suggestions — click to use:</p>
                            {aiSuggestions.map((s, i) => (
                              <button
                                key={i}
                                className="w-full text-left text-sm p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                onClick={() => { setCampaign(c => ({ ...c, subject: s })); setAiSuggestions([]); }}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-sm">Preview Text</Label>
                          <Input
                            value={campaign.preview_text ?? ''}
                            onChange={e => setCampaign(c => ({ ...c, preview_text: e.target.value }))}
                            className="h-9"
                            placeholder="Short preview shown in email clients…"
                          />
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                          <p className="font-medium">Personalization tokens:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {['{{first_name}}', '{{last_name}}', '{{company_name}}', '{{email}}'].map(t => (
                              <code key={t} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{t}</code>
                            ))}
                          </div>
                        </div>

                        <Button size="sm" onClick={() => save()} disabled={!campaign.subject}>Save</Button>
                      </div>
                    )}

                    {/* CONTENT */}
                    {step.key === 'content' && (
                      <div className="space-y-4">
                        {campaign.content_json && (campaign.content_json as EmailBuilderState).blocks?.length > 0 ? (
                          <div className="p-3 rounded-lg border border-border bg-muted/30 flex items-center gap-3">
                            <Mail className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">Email designed</p>
                              <p className="text-xs text-muted-foreground">{(campaign.content_json as EmailBuilderState).blocks.length} blocks</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No content yet. Open the editor to design your email.</p>
                        )}

                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => {
                            const c = await save();
                            navigate(`/org/${orgCode}/crm/campaigns/${c.id}/builder`);
                          }}>
                            {campaign.content_json && (campaign.content_json as EmailBuilderState).blocks?.length > 0 ? 'Edit Email' : 'Design Email'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* SEND */}
                    {step.key === 'send' && (
                      <div className="space-y-4">
                        {!hasFooter && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Missing compliance footer</p>
                              <p className="text-xs">Add a Footer block to your email design. It's required for bulk email campaigns.</p>
                            </div>
                          </div>
                        )}

                        {!allStepsComplete && (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted border border-border">
                            <Circle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Complete all previous steps before sending.</p>
                          </div>
                        )}

                        <div className="flex gap-3 flex-wrap">
                          <Button size="sm" variant="outline" onClick={handleSendTest} disabled={!campaignId} className="gap-1.5">
                            <Mail className="h-3.5 w-3.5" /> Send Test Email
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSendNow}
                            disabled={!allStepsComplete || !hasFooter || sending}
                            className="gap-1.5"
                          >
                            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            Send Now
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: mini preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-4 rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium text-foreground">Email Preview</p>
            </div>
            {campaign.content_json && (campaign.content_json as EmailBuilderState).blocks?.length > 0 ? (
              <iframe
                srcDoc={renderEmailHtml(campaign.content_json as EmailBuilderState, true)}
                className="w-full border-0"
                style={{ height: 500 }}
                title="Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                <Mail className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Design your email to see a preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageBody>
  );
}
