import { useState } from 'react';
import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Plus, ArrowLeft, Megaphone, ListOrdered, Trash2, Clock, ArrowDown,
  StopCircle, MessageCircle, MoreVertical, PlayCircle, PauseCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useWaTemplates } from '@/hooks/useWhatsAppTemplates';
import type { WaTemplate } from '@/types/whatsapp';

interface SequenceStep {
  id: string;
  type: 'send_template';
  template_id: string;
  delay_hours: number;
  delay_type: 'hours' | 'days';
}

interface StopCondition {
  type: 'replied' | 'converted' | 'tagged' | 'opted_out';
  value?: string;
}

interface WaSequence {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: string;
  audience_source: string;
  audience_filters: Record<string, unknown>;
  steps: SequenceStep[];
  stop_conditions: StopCondition[];
  stats: { enrolled: number; completed: number; stopped: number };
  created_at: string;
  updated_at: string;
}

function useWaSequences(orgId: string | undefined) {
  return useQuery({
    queryKey: ['wa-sequences', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wa_sequences')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WaSequence[];
    },
  });
}

const WhatsAppSequencesPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const { data: sequences = [], isLoading } = useWaSequences(orgId);
  const { data: templates = [] } = useWaTemplates(orgId);
  const navigate = useNavigate();
  const [builderOpen, setBuilderOpen] = useState(false);

  // Builder state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [steps, setSteps] = useState<SequenceStep[]>([
    { id: crypto.randomUUID().slice(0, 8), type: 'send_template', template_id: '', delay_hours: 0, delay_type: 'hours' },
  ]);
  const [stopConditions, setStopConditions] = useState<StopCondition[]>([
    { type: 'replied' },
    { type: 'opted_out' },
  ]);

  const approvedTemplates = templates.filter((t) => t.status === 'approved' || t.status === 'draft');

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { id: crypto.randomUUID().slice(0, 8), type: 'send_template', template_id: '', delay_hours: 24, delay_type: 'hours' },
    ]);
  };

  const updateStep = (id: string, patch: Partial<SequenceStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleStopCondition = (type: StopCondition['type']) => {
    setStopConditions((prev) => {
      const exists = prev.find((s) => s.type === type);
      if (exists) return prev.filter((s) => s.type !== type);
      return [...prev, { type }];
    });
  };

  const handleCreate = async () => {
    if (!orgId || !name.trim() || steps.length === 0) return;

    const audienceTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from('wa_sequences').insert({
      organization_id: orgId,
      name: name.trim(),
      description: description.trim() || null,
      audience_source: audienceTags.length > 0 ? 'tags' : 'all',
      audience_filters: audienceTags.length > 0 ? { tags: audienceTags } : {},
      steps: steps as any,
      stop_conditions: stopConditions as any,
    } as any);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Sequence created');
    qc.invalidateQueries({ queryKey: ['wa-sequences'] });
    setBuilderOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTags('');
    setSteps([{ id: crypto.randomUUID().slice(0, 8), type: 'send_template', template_id: '', delay_hours: 0, delay_type: 'hours' }]);
    setStopConditions([{ type: 'replied' }, { type: 'opted_out' }]);
  };

  const handleToggleStatus = async (seq: WaSequence) => {
    const newStatus = seq.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase.from('wa_sequences').update({ status: newStatus } as any).eq('id', seq.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Sequence ${newStatus}`);
      qc.invalidateQueries({ queryKey: ['wa-sequences'] });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('wa_sequences').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Sequence deleted');
      qc.invalidateQueries({ queryKey: ['wa-sequences'] });
    }
  };

  return (
    <>
      <WhatsAppSubNav />
      <PageBody>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sequences</h1>
            <p className="text-sm text-muted-foreground mt-1">Multi-step drip campaigns with delays and stop conditions</p>
          </div>
          <Button size="sm" onClick={() => setBuilderOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Sequence
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : sequences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ListOrdered className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No sequences yet</h2>
            <p className="text-muted-foreground mt-2 max-w-md">Create multi-step drip campaigns to nurture leads automatically.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {sequences.map((seq) => (
              <Card key={seq.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-foreground">{seq.name}</h3>
                      <Badge variant={seq.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">{seq.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{seq.steps?.length ?? 0} steps</span>
                      <span>{seq.stats?.enrolled ?? 0} enrolled</span>
                      <span>{seq.stats?.completed ?? 0} completed</span>
                      <span>Created {format(new Date(seq.created_at), 'MMM d')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleToggleStatus(seq)}>
                      {seq.status === 'active' ? <PauseCircle className="h-4 w-4 mr-1" /> : <PlayCircle className="h-4 w-4 mr-1" />}
                      {seq.status === 'active' ? 'Pause' : 'Activate'}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(seq.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Builder Dialog */}
        <Dialog open={builderOpen} onOpenChange={(o) => { if (!o) resetForm(); setBuilderOpen(o); }}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Sequence</DialogTitle>
              <DialogDescription>Build a multi-step drip campaign with delays between messages.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Sequence Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Drip" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
                </div>
              </div>

              {/* Audience */}
              <div>
                <Label>Audience Tags (optional)</Label>
                <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="new_lead, vip (comma-separated)" />
                <p className="text-xs text-muted-foreground mt-1">Leave empty for all opted-in contacts</p>
              </div>

              {/* Steps */}
              <div>
                <Label className="text-base font-semibold">Steps</Label>
                <div className="space-y-3 mt-2">
                  {steps.map((step, i) => (
                    <div key={step.id}>
                      {i > 0 && (
                        <div className="flex items-center gap-2 py-2 pl-6">
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Wait</span>
                            <Input
                              type="number"
                              min={1}
                              value={step.delay_hours}
                              onChange={(e) => updateStep(step.id, { delay_hours: parseInt(e.target.value) || 0 })}
                              className="h-7 w-16 text-xs"
                            />
                            <Select value={step.delay_type} onValueChange={(v) => updateStep(step.id, { delay_type: v as any })}>
                              <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hours">hours</SelectItem>
                                <SelectItem value="days">days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      <Card className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <Badge variant="outline" className="text-xs">Step {i + 1}</Badge>
                            <Select value={step.template_id} onValueChange={(v) => updateStep(step.id, { template_id: v })}>
                              <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Select template" /></SelectTrigger>
                              <SelectContent>
                                {approvedTemplates.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {steps.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeStep(step.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={addStep}>
                    <Plus className="h-3 w-3 mr-1" /> Add Step
                  </Button>
                </div>
              </div>

              {/* Stop Conditions */}
              <div>
                <Label className="text-base font-semibold">Stop Conditions</Label>
                <p className="text-xs text-muted-foreground mb-2">Sequence stops for a contact when any condition is met</p>
                <div className="space-y-2">
                  {(['replied', 'opted_out', 'converted', 'tagged'] as const).map((cond) => (
                    <div key={cond} className="flex items-center gap-2">
                      <Switch
                        checked={stopConditions.some((s) => s.type === cond)}
                        onCheckedChange={() => toggleStopCondition(cond)}
                      />
                      <span className="text-sm capitalize">{cond === 'opted_out' ? 'Contact opts out' : cond === 'replied' ? 'Contact replies' : cond === 'converted' ? 'Marked as converted' : 'Tagged with specific tag'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setBuilderOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!name.trim() || steps.length === 0}>
                  Create Sequence
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageBody>
    </>
  );
};

export default WhatsAppSequencesPage;
