/**
 * Hook to fetch assignment templates linked to a position (matched by job title).
 * job title -> position name (case-insensitive) -> position ID -> templates containing that ID
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface AssignmentTemplateForPosition {
  id: string;
  name: string;
  type: string | null;
  instructions: string;
  default_deadline_hours: number | null;
  recommended_effort: string | null;
  expected_deliverables: any;
  is_active: boolean | null;
  position_ids: string[] | null;
  slug: string | null;
}

export const useAssignmentTemplatesForPosition = (jobTitle: string) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['assignment-templates-for-position', currentOrg?.id, jobTitle],
    queryFn: async (): Promise<{ templates: AssignmentTemplateForPosition[]; positionId: string | null }> => {
      if (!currentOrg?.id || !jobTitle?.trim()) {
        return { templates: [], positionId: null };
      }

      // Step 1: Find position by name (case-insensitive match)
      const { data: position } = await supabase
        .from('positions')
        .select('id')
        .eq('organization_id', currentOrg.id)
        .ilike('name', jobTitle.trim())
        .maybeSingle();

      if (!position) {
        return { templates: [], positionId: null };
      }

      // Step 2: Fetch active templates containing this position ID
      const { data: templates, error } = await (supabase
        .from('assignment_templates') as any)
        .select('id, name, type, instructions, default_deadline_hours, recommended_effort, expected_deliverables, is_active, position_ids')
        .eq('organization_id', currentOrg.id)
        .eq('is_active', true)
        .contains('position_ids', [position.id]);

      if (error) throw error;

      return {
        templates: (templates || []) as AssignmentTemplateForPosition[],
        positionId: position.id,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!currentOrg?.id && !!jobTitle?.trim(),
  });
};
