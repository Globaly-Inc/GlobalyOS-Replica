/**
 * Positions Data Hook
 * Fetch positions for the current organization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface Position {
  id: string;
  name: string;
  department_id: string | null;
  description: string | null;
}

/**
 * Fetch all positions for the current organization
 */
export const usePositions = (departmentId?: string) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['positions', currentOrg?.id, departmentId],
    queryFn: async (): Promise<Position[]> => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('positions')
        .select('id, name, department_id, description')
        .eq('organization_id', currentOrg.id)
        .order('name');

      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!currentOrg?.id,
  });
};

/**
 * Create a new position
 */
export const useCreatePosition = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; department_id?: string | null }) => {
      if (!currentOrg?.id) throw new Error('No organization');

      const { data: position, error } = await supabase
        .from('positions')
        .insert({
          name: data.name,
          department_id: data.department_id || null,
          organization_id: currentOrg.id,
        })
        .select('id, name, department_id, description')
        .single();

      if (error) throw error;
      return position;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions', currentOrg?.id] });
    },
  });
};
