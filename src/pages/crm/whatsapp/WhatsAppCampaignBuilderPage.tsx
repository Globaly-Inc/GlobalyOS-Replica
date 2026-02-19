import { useState } from 'react';
import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { useOrganization } from '@/hooks/useOrganization';
import { useWaTemplates, useCreateWaCampaign } from '@/hooks/useWhatsAppTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Send, Users, FileText, Eye, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { WaTemplate } from '@/types/whatsapp';

type Step = 'recipients' | 'content' | 'review';

const WhatsAppCampaignBuilderPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const { data: templates = [] } = useWaTemplates(orgId);
  const createMutation = useCreateWaCampaign();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('recipients');
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const approvedTemplates = templates.filter((t) => t.status === 'approved' || t.status === 'draft');
  const selectedTemplate = approvedTemplates.find((t) => t.id === selectedTemplateId);

  const getBodyText = (t: WaTemplate) => {
    const body = (t.components as any[])?.find((c: any) => c.type === 'BODY');
    return body?.text || '';
  };

  const canProceed = () => {
    if (step === 'recipients') return !!name.trim();
    if (step === 'content') return !!selectedTemplateId;
    return true;
  };

  const handleNext = () => {
    if (step === 'recipients') setStep('content');
    else if (step === 'content') setStep('review');
  };

  const handleBack = () => {
    if (step === 'content') setStep('recipients');
    else if (step === 'review') setStep('content');
  };

  const handleSend = () => {
    if (!orgId || !selectedTemplateId) return;
    const audienceTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    createMutation.mutate(
      {
        organization_id: orgId,
        name,
        template_id: selectedTemplateId,
        variable_mapping: {},
        audience_filters: audienceTags.length > 0 ? { tags: audienceTags } : {},
        audience_source: audienceTags.length > 0 ? 'tags' : 'all',
        scheduled_at: scheduledAt || null,
      },
      {
        onSuccess: () => {
          toast.success('Broadcast created!');
          navigate('/crm/whatsapp/campaigns');
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'recipients', label: 'Recipients', icon: <Users className="h-4 w-4" /> },
    { key: 'content', label: 'Content', icon: <FileText className="h-4 w-4" /> },
    { key: 'review', label: 'Review & Send', icon: <Eye className="h-4 w-4" /> },
  ];

  return (
    <>
      <WhatsAppSubNav />
      <PageBody>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/crm/whatsapp/campaigns')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">New Broadcast</h1>
              <p className="text-sm text-muted-foreground">Send a template message to your contacts</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                  step === s.key
                    ? 'bg-primary text-primary-foreground'
                    : steps.indexOf(steps.find((st) => st.key === step)!) > i
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {s.icon}
                  {s.label}
                </div>
                {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {step === 'recipients' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Define Audience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Campaign Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Welcome Campaign Jan 2026"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Filter by Tags (optional)</Label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. new_lead, vip (comma-separated)"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to send to all opted-in contacts
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'content' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Template</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="font-mono">{t.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">{t.status}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                    <div className="bg-card rounded-lg p-3 shadow-sm max-w-[260px] border border-border">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {getBodyText(selectedTemplate)}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Schedule (optional)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to save as draft
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review & Send</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Campaign</p>
                    <p className="font-medium text-foreground">{name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Template</p>
                    <p className="font-medium font-mono text-foreground">{selectedTemplate?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Audience</p>
                    <p className="font-medium text-foreground">
                      {tags ? `Tags: ${tags}` : 'All opted-in contacts'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Schedule</p>
                    <p className="font-medium text-foreground">{scheduledAt || 'Draft (manual send)'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={handleBack} disabled={step === 'recipients'}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {step === 'review' ? (
              <Button onClick={handleSend} disabled={createMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {createMutation.isPending ? 'Creating...' : scheduledAt ? 'Schedule Broadcast' : 'Save Draft'}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
};

export default WhatsAppCampaignBuilderPage;
