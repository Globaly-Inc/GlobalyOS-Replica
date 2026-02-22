import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentEmployee } from './useCurrentEmployee';
import type { CRMPipeline, CRMPipelineStage, CRMStageRequirement } from '@/types/crm-pipeline';
import { toast } from 'sonner';

function useEmployee() {
  const q = useCurrentEmployee();
  return q.data;
}

// ─── Pipelines ───

export function useCRMPipelines() {
  const employee = useEmployee();
  const orgId = employee?.organization_id;

  return useQuery({
    queryKey: ['crm-pipelines', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('crm_pipelines')
        .select('*')
        .eq('organization_id', orgId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as CRMPipeline[];
    },
    enabled: !!orgId,
  });
}

export function useCRMPipeline(pipelineId: string | undefined) {
  const employee = useEmployee();
  const orgId = employee?.organization_id;

  return useQuery({
    queryKey: ['crm-pipeline', pipelineId],
    queryFn: async () => {
      if (!pipelineId || !orgId) return null;
      const { data: pipeline, error } = await supabase
        .from('crm_pipelines')
        .select('*')
        .eq('id', pipelineId)
        .eq('organization_id', orgId)
        .single();
      if (error) throw error;

      const { data: stages, error: sErr } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('organization_id', orgId)
        .order('sort_order');
      if (sErr) throw sErr;

      const { data: requirements, error: rErr } = await supabase
        .from('crm_stage_requirements')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('organization_id', orgId)
        .order('sort_order');
      if (rErr) throw rErr;

      const stagesWithReqs = (stages || []).map((s: any) => ({
        ...s,
        requirements: (requirements || []).filter((r: any) => r.stage_id === s.id),
      }));

      return { ...pipeline, stages: stagesWithReqs } as unknown as CRMPipeline;
    },
    enabled: !!pipelineId && !!orgId,
  });
}

export function useCreatePipeline() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; service_required?: boolean }) => {
      if (!employee) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('crm_pipelines')
        .insert({
          organization_id: employee.organization_id,
          name: input.name,
          description: input.description || null,
          service_required: input.service_required ?? true,
          created_by: employee.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipelines'] });
      toast.success('Pipeline created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePipeline() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMPipeline> & { id: string }) => {
      const { error } = await supabase
        .from('crm_pipelines')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipelines'] });
      qc.invalidateQueries({ queryKey: ['crm-pipeline'] });
      toast.success('Pipeline updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePipeline() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_pipelines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipelines'] });
      toast.success('Pipeline deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Stages ───

export function useCreateStage() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async (input: { pipeline_id: string; name: string; color?: string; sort_order?: number; stage_type?: 'normal' | 'win' }) => {
      if (!employee) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('crm_pipeline_stages')
        .insert({
          pipeline_id: input.pipeline_id,
          organization_id: employee.organization_id,
          name: input.name,
          color: input.color || '#6366f1',
          sort_order: input.sort_order ?? 0,
          stage_type: input.stage_type || 'normal',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline'] });
      toast.success('Stage added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMPipelineStage> & { id: string }) => {
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline'] });
      toast.success('Stage updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteStage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_pipeline_stages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline'] });
      toast.success('Stage deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReorderStages() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (stages: { id: string; sort_order: number }[]) => {
      const updates = stages.map((s) =>
        supabase.from('crm_pipeline_stages').update({ sort_order: s.sort_order }).eq('id', s.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Stage Requirements ───

export function useCreateRequirement() {
  const qc = useQueryClient();
  const employee = useEmployee();

  return useMutation({
    mutationFn: async (input: Omit<CRMStageRequirement, 'id' | 'organization_id' | 'created_at'>) => {
      if (!employee) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('crm_stage_requirements')
        .insert({
          ...input,
          organization_id: employee.organization_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline'] });
      toast.success('Requirement added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateRequirement() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMStageRequirement> & { id: string }) => {
      const { error } = await supabase
        .from('crm_stage_requirements')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline'] });
      toast.success('Requirement updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRequirement() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_stage_requirements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline'] });
      toast.success('Requirement removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
