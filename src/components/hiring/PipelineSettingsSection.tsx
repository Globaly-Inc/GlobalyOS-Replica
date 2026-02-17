/**
 * Pipeline Settings Section
 * 1. Pipeline management (add/edit/delete pipelines & stages)
 * 2. Per-stage automation rules (auto-assignments, auto-reject, notifications)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  APPLICATION_STAGE_LABELS,
  APPLICATION_STAGE_COLORS,
  type ApplicationStage,
} from '@/types/hiring';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Zap, Clock, Bell, Loader2, Plus } from 'lucide-react';
import { PipelineCard, type Pipeline, type PipelineStage } from './PipelineCard';
import { useOrgPipelines } from '@/hooks/useOrgPipelines';

// ── constants ──────────────────────────────────────────────────

const PIPELINE_STAGES: ApplicationStage[] = [
  'applied', 'screening', 'assignment',
  'interview_1', 'interview_2', 'interview_3',
  'offer', 'hired',
];

const DEFAULT_STAGES: { stage_key: ApplicationStage; name: string }[] = PIPELINE_STAGES.map((k, i) => ({
  stage_key: k,
  name: APPLICATION_STAGE_LABELS[k],
}));

// ── hooks ──────────────────────────────────────────────────────

// useOrgPipelines is now imported from @/hooks/useOrgPipelines

function usePipelineStageRules(orgId: string | undefined) {
  return useQuery({
    queryKey: ['pipeline-stage-rules', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('pipeline_stage_rules')
        .select('*')
        .eq('organization_id', orgId)
        .is('job_id', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });
}

function useOrgEmployees(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-employees-list', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('employee_directory')
        .select('id, full_name, email')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });
}

// ── stage rule type ────────────────────────────────────────────

interface StageRule {
  id?: string;
  stage_key: string;
  auto_assignment_template_id: string | null;
  auto_assign_enabled: boolean;
  auto_reject_after_hours: number | null;
  auto_reject_on_deadline: boolean;
  notify_employee_ids: string[];
  is_active: boolean;
}

// ── component ──────────────────────────────────────────────────

export function PipelineSettingsSection() {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();

  const { data: pipelines, isLoading: pipelinesLoading } = useOrgPipelines(orgId);
  const { data: existingRules, isLoading: rulesLoading } = usePipelineStageRules(orgId);
  const { data: employees } = useOrgEmployees(orgId);

  const [stageRules, setStageRules] = useState<Record<string, StageRule>>({});
  const [initialized, setInitialized] = useState(false);

  // ── seed default pipeline if none exist ──
  const seedDefaultPipeline = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No org');
      const { data: pipeline, error: pErr } = await supabase
        .from('org_pipelines')
        .insert({ organization_id: orgId, name: 'Default Pipeline', is_default: true, sort_order: 0 } as any)
        .select()
        .single();
      if (pErr) throw pErr;

      const stageInserts = DEFAULT_STAGES.map((s, i) => ({
        organization_id: orgId,
        pipeline_id: pipeline.id,
        stage_key: s.stage_key,
        name: s.name,
        color: APPLICATION_STAGE_COLORS[s.stage_key],
        sort_order: i,
        is_active: true,
      }));
      const { error: sErr } = await supabase.from('org_pipeline_stages').insert(stageInserts as any);
      if (sErr) throw sErr;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-pipelines', orgId] }),
  });

  useEffect(() => {
    if (!pipelinesLoading && pipelines && pipelines.length === 0 && orgId) {
      seedDefaultPipeline.mutate();
    }
  }, [pipelinesLoading, pipelines, orgId]);

  // ── initialize stage rules ──
  useEffect(() => {
    if (rulesLoading || initialized) return;
    const rules: Record<string, StageRule> = {};
    for (const stage of PIPELINE_STAGES) {
      const existing = existingRules?.find((r: any) => r.stage_key === stage);
      rules[stage] = existing
        ? {
            id: existing.id,
            stage_key: stage,
            auto_assignment_template_id: existing.auto_assignment_template_id,
            auto_assign_enabled: existing.auto_assign_enabled ?? false,
            auto_reject_after_hours: existing.auto_reject_after_hours,
            auto_reject_on_deadline: existing.auto_reject_on_deadline,
            notify_employee_ids: existing.notify_employee_ids || [],
            is_active: existing.is_active,
          }
        : {
            stage_key: stage,
            auto_assignment_template_id: null,
            auto_assign_enabled: false,
            auto_reject_after_hours: null,
            auto_reject_on_deadline: false,
            notify_employee_ids: [],
            is_active: false,
          };
    }
    setStageRules(rules);
    setInitialized(true);
  }, [existingRules, rulesLoading, initialized]);

  const updateRule = (stage: string, updates: Partial<StageRule>) => {
    setStageRules(prev => ({ ...prev, [stage]: { ...prev[stage], ...updates } }));
  };

  // ── pipeline CRUD mutations ──

  const addPipelineMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No org');
      const order = (pipelines?.length || 0);
      const { data: pipeline, error: pErr } = await supabase
        .from('org_pipelines')
        .insert({ organization_id: orgId, name: `New Pipeline ${order + 1}`, is_default: false, sort_order: order } as any)
        .select()
        .single();
      if (pErr) throw pErr;

      const stageInserts = DEFAULT_STAGES.map((s, i) => ({
        organization_id: orgId,
        pipeline_id: pipeline.id,
        stage_key: s.stage_key,
        name: s.name,
        color: APPLICATION_STAGE_COLORS[s.stage_key],
        sort_order: i,
        is_active: true,
      }));
      const { error: sErr } = await supabase.from('org_pipeline_stages').insert(stageInserts as any);
      if (sErr) throw sErr;
    },
    onSuccess: () => {
      toast.success('Pipeline created');
      queryClient.invalidateQueries({ queryKey: ['org-pipelines', orgId] });
    },
    onError: () => toast.error('Failed to create pipeline'),
  });

  const renamePipelineMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('org_pipelines').update({ name } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pipeline renamed');
      queryClient.invalidateQueries({ queryKey: ['org-pipelines', orgId] });
    },
    onError: () => toast.error('Failed to rename pipeline'),
  });

  const deletePipelineMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('org_pipelines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pipeline deleted');
      queryClient.invalidateQueries({ queryKey: ['org-pipelines', orgId] });
    },
    onError: () => toast.error('Failed to delete pipeline'),
  });

  const renameStageMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('org_pipeline_stages').update({ name } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Stage renamed');
      queryClient.invalidateQueries({ queryKey: ['org-pipelines', orgId] });
    },
    onError: () => toast.error('Failed to rename stage'),
  });

  const deleteStageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('org_pipeline_stages').update({ is_active: false } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Stage removed');
      queryClient.invalidateQueries({ queryKey: ['org-pipelines', orgId] });
    },
    onError: () => toast.error('Failed to remove stage'),
  });

  const addStageMutation = useMutation({
    mutationFn: async ({ pipelineId, stageKey, name }: { pipelineId: string; stageKey: string; name: string }) => {
      if (!orgId) throw new Error('No org');
      const pipeline = pipelines?.find(p => p.id === pipelineId);
      const maxOrder = pipeline?.stages.reduce((m, s) => Math.max(m, s.sort_order), -1) ?? -1;
      const { error } = await supabase.from('org_pipeline_stages').insert({
        organization_id: orgId,
        pipeline_id: pipelineId,
        stage_key: stageKey,
        name,
        color: APPLICATION_STAGE_COLORS[stageKey as ApplicationStage] || '#94A3B8',
        sort_order: maxOrder + 1,
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Stage added');
      queryClient.invalidateQueries({ queryKey: ['org-pipelines', orgId] });
    },
    onError: () => toast.error('Failed to add stage'),
  });

  const reorderStagesMutation = useMutation({
    mutationFn: async ({ pipelineId, orderedStageIds }: { pipelineId: string; orderedStageIds: string[] }) => {
      for (let i = 0; i < orderedStageIds.length; i++) {
        const { error } = await supabase
          .from('org_pipeline_stages')
          .update({ sort_order: i } as any)
          .eq('id', orderedStageIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-pipelines', orgId] });
    },
    onError: () => toast.error('Failed to reorder stages'),
  });

  // ── save automation rules ──

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No org');
      const upserts = Object.values(stageRules)
        .filter(r => r.is_active || r.id)
        .map(r => ({
          ...(r.id ? { id: r.id } : {}),
          organization_id: orgId,
          job_id: null,
          stage_key: r.stage_key,
          auto_assignment_template_id: r.auto_assignment_template_id || null,
          auto_assign_enabled: r.auto_assign_enabled,
          auto_reject_after_hours: r.auto_reject_after_hours || null,
          auto_reject_on_deadline: r.auto_reject_on_deadline,
          notify_employee_ids: r.notify_employee_ids,
          is_active: r.is_active,
        }));
      if (upserts.length === 0) return;
      const { error } = await supabase
        .from('pipeline_stage_rules')
        .upsert(upserts as any, { onConflict: 'organization_id,job_id,stage_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pipeline settings saved');
      queryClient.invalidateQueries({ queryKey: ['pipeline-stage-rules'] });
    },
    onError: () => toast.error('Failed to save pipeline settings'),
  });

  // ── loading state ──

  if (pipelinesLoading || rulesLoading || !initialized) {
    return <Skeleton className="h-96" />;
  }

  const activeCount = Object.values(stageRules).filter(r => r.is_active).length;

  return (
    <div className="space-y-6">
      {/* ── Pipeline Management ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pipelines</CardTitle>
            <CardDescription>Create and customize hiring pipelines with custom stages</CardDescription>
          </div>
          <Button onClick={() => addPipelineMutation.mutate()} disabled={addPipelineMutation.isPending} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Pipeline
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {pipelines?.map(pipeline => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onRenamePipeline={(id, name) => renamePipelineMutation.mutate({ id, name })}
              onDeletePipeline={id => deletePipelineMutation.mutate(id)}
              onRenameStage={(id, name) => renameStageMutation.mutate({ id, name })}
              onDeleteStage={id => deleteStageMutation.mutate(id)}
              onAddStage={(pipelineId, stageKey, name) => addStageMutation.mutate({ pipelineId, stageKey, name })}
              onReorderStages={(pipelineId, orderedStageIds) => reorderStagesMutation.mutate({ pipelineId, orderedStageIds })}
              canDeletePipeline={!pipeline.is_default}
              canDeleteStage={() => true /* TODO: check candidate_applications */}
            />
          ))}
        </CardContent>
      </Card>

      {/* ── Pipeline Stage Rules (automation) ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pipeline Stage Rules</CardTitle>
            <CardDescription>
              Configure automation for each hiring stage — auto-assignments, rejection rules, and notifications
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && <Badge variant="secondary">{activeCount} active</Badge>}
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {PIPELINE_STAGES.map(stage => {
              const rule = stageRules[stage];
              if (!rule) return null;
              const color = APPLICATION_STAGE_COLORS[stage];
              return (
                <AccordionItem key={stage} value={stage} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-medium text-sm">{APPLICATION_STAGE_LABELS[stage]}</span>
                      {rule.is_active && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 ml-auto mr-4">Active</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-5 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">Enable automation for this stage</Label>
                        </div>
                        <Switch checked={rule.is_active} onCheckedChange={checked => updateRule(stage, { is_active: checked })} />
                      </div>
                      {rule.is_active && (
                        <>
                          <div className="flex items-center justify-between pl-6 border-l-2 border-muted ml-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                                <Label className="text-sm font-medium">Auto-assign assignment</Label>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 ml-5.5">
                                Automatically send the linked assignment when a candidate enters this stage
                              </p>
                            </div>
                            <Switch checked={rule.auto_assign_enabled} onCheckedChange={checked => updateRule(stage, { auto_assign_enabled: checked })} />
                          </div>
                          <div className="space-y-3 pl-6 border-l-2 border-muted ml-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <Label className="text-sm">Auto-Reject Rules</Label>
                            </div>
                            <div className="flex items-center gap-3">
                              <Switch checked={rule.auto_reject_on_deadline} onCheckedChange={checked => updateRule(stage, { auto_reject_on_deadline: checked })} />
                              <Label className="text-sm text-muted-foreground">Auto-reject when assignment deadline passes</Label>
                            </div>
                            <div className="flex items-center gap-3">
                              <Label className="text-sm text-muted-foreground whitespace-nowrap">Auto-reject after</Label>
                              <Input type="number" min={0} className="w-20" placeholder="—" value={rule.auto_reject_after_hours ?? ''} onChange={e => updateRule(stage, { auto_reject_after_hours: e.target.value ? parseInt(e.target.value) : null })} />
                              <Label className="text-sm text-muted-foreground">hours in this stage</Label>
                            </div>
                          </div>
                          <div className="space-y-2 pl-6 border-l-2 border-muted ml-2">
                            <div className="flex items-center gap-2">
                              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                              <Label className="text-sm">Stage Notifications</Label>
                            </div>
                            <Select value="placeholder" onValueChange={empId => { if (empId === 'placeholder') return; if (!rule.notify_employee_ids.includes(empId)) { updateRule(stage, { notify_employee_ids: [...rule.notify_employee_ids, empId] }); } }}>
                              <SelectTrigger className="w-full"><SelectValue placeholder="Add team member to notify..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="placeholder" disabled>Select a team member...</SelectItem>
                                {employees?.filter((e: any) => !rule.notify_employee_ids.includes(e.id)).map((e: any) => (
                                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {rule.notify_employee_ids.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {rule.notify_employee_ids.map(empId => {
                                  const emp = employees?.find((e: any) => e.id === empId);
                                  return (
                                    <Badge key={empId} variant="secondary" className="cursor-pointer hover:bg-destructive/20 transition-colors" onClick={() => updateRule(stage, { notify_employee_ids: rule.notify_employee_ids.filter(id => id !== empId) })}>
                                      {emp ? emp.full_name : empId.slice(0, 8)}
                                      <span className="ml-1 text-muted-foreground">×</span>
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">These team members will be notified when a candidate enters this stage. Click a name to remove.</p>
                          </div>
                        </>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
