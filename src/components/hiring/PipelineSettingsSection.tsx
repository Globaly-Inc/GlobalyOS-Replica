/**
 * Pipeline Settings Section
 * Unified pipeline management with per-stage inline automation rules.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  APPLICATION_STAGE_LABELS,
  APPLICATION_STAGE_COLORS,
  type ApplicationStage,
} from '@/types/hiring';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { PipelineCard, type Pipeline, type StageRule, type Employee } from './PipelineCard';
import { useOrgPipelines } from '@/hooks/useOrgPipelines';
import { useHiringEmailTemplates } from '@/services/useHiring';

// ── constants ──────────────────────────────────────────────────

const PIPELINE_STAGES: ApplicationStage[] = [
  'applied', 'screening', 'assignment',
  'interview_1', 'interview_2', 'interview_3',
  'offer', 'hired',
];

const DEFAULT_STAGES: { stage_key: ApplicationStage; name: string }[] = PIPELINE_STAGES.map(k => ({
  stage_key: k,
  name: APPLICATION_STAGE_LABELS[k],
}));

// ── hooks ──────────────────────────────────────────────────────

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
        .select('id, full_name, email, office_name')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('full_name');
      if (error) throw error;
      return (data || []) as Employee[];
    },
    enabled: !!orgId,
  });
}

// ── component ──────────────────────────────────────────────────

export function PipelineSettingsSection() {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();

  const { data: pipelines, isLoading: pipelinesLoading } = useOrgPipelines(orgId);
  const { data: existingRules, isLoading: rulesLoading } = usePipelineStageRules(orgId);
  const { data: employees = [] } = useOrgEmployees(orgId);
  const { data: emailTemplates = [] } = useHiringEmailTemplates();

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
            email_trigger_type: (existing as any).email_trigger_type ?? null,
            is_active: existing.is_active,
          }
        : {
            stage_key: stage,
            auto_assignment_template_id: null,
            auto_assign_enabled: false,
            auto_reject_after_hours: null,
            auto_reject_on_deadline: false,
            notify_employee_ids: [],
            email_trigger_type: null,
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
          email_trigger_type: r.email_trigger_type || null,
          is_active: r.is_active,
        }));
      if (upserts.length === 0) return;
      const { error } = await supabase
        .from('pipeline_stage_rules')
        .upsert(upserts as any, { onConflict: 'organization_id,job_id,stage_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pipeline rules saved');
      queryClient.invalidateQueries({ queryKey: ['pipeline-stage-rules'] });
    },
    onError: () => toast.error('Failed to save pipeline rules'),
  });

  // ── loading state ──

  if (pipelinesLoading || rulesLoading || !initialized) {
    return <Skeleton className="h-96" />;
  }

  // Flatten email templates to match expected shape (include stage_id for per-stage matching)
  const flatTemplates = (emailTemplates as any[]).map(t => ({
    id: t.id,
    name: t.name,
    template_type: t.template_type,
    subject: t.subject ?? '',
    body: t.body ?? '',
    is_active: t.is_active,
    stage_id: t.stage_id ?? null,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Hiring Pipeline</CardTitle>
            <CardDescription>
              Create and customize hiring pipelines. Expand each stage to configure automation rules, notifications, and email triggers.
            </CardDescription>
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
              stageRules={stageRules}
              employees={employees}
              emailTemplates={flatTemplates}
              onRenamePipeline={(id, name) => renamePipelineMutation.mutate({ id, name })}
              onDeletePipeline={id => deletePipelineMutation.mutate(id)}
              onRenameStage={(id, name) => renameStageMutation.mutate({ id, name })}
              onDeleteStage={id => deleteStageMutation.mutate(id)}
              onAddStage={(pipelineId, stageKey, name) => addStageMutation.mutate({ pipelineId, stageKey, name })}
              onReorderStages={(pipelineId, orderedStageIds) => reorderStagesMutation.mutate({ pipelineId, orderedStageIds })}
              onRuleChange={updateRule}
              onSaveRules={() => saveMutation.mutate()}
              isSavingRules={saveMutation.isPending}
              canDeletePipeline={!pipeline.is_default}
              canDeleteStage={() => true}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
