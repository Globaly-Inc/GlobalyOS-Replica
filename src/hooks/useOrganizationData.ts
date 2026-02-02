/**
 * Organization Data Hooks
 * Reusable hooks for fetching departments and offices
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface Department {
  id: string;
  name: string;
}

export interface Office {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
}

/**
 * Fetch all departments for the current organization
 */
export const useDepartments = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['departments', currentOrg?.id],
    queryFn: async (): Promise<Department[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('organization_id', currentOrg.id)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - departments rarely change
    enabled: !!currentOrg?.id,
  });
};

/**
 * Fetch all offices for the current organization
 */
export const useOffices = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['offices', currentOrg?.id],
    queryFn: async (): Promise<Office[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('offices')
        .select('id, name, city, country')
        .eq('organization_id', currentOrg.id)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - offices rarely change
    enabled: !!currentOrg?.id,
  });
};
