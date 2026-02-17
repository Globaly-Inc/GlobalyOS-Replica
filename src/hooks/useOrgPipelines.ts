import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Pipeline } from '@/components/hiring/PipelineCard';

export function useOrgPipelines(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-pipelines', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data: pipelines, error: pErr } = await supabase
        .from('org_pipelines')
        .select('*')
        .eq('organization_id', orgId)
        .order('sort_order');
      if (pErr) throw pErr;

      const { data: stages, error: sErr } = await supabase
        .from('org_pipeline_stages')
        .select('*')
        .eq('organization_id', orgId)
        .order('sort_order');
      if (sErr) throw sErr;

      return (pipelines || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        is_default: p.is_default,
        sort_order: p.sort_order,
        stages: (stages || [])
          .filter((s: any) => s.pipeline_id === p.id)
          .map((s: any) => ({
            id: s.id,
            stage_key: s.stage_key,
            name: s.name,
            color: s.color,
            sort_order: s.sort_order,
            is_active: s.is_active,
          })),
      })) as Pipeline[];
    },
    enabled: !!orgId,
  });
}
