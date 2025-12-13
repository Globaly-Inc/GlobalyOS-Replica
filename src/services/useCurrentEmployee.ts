/**
 * Hook to get current employee information
 * Centralized access to current user's employee record
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';

export interface CurrentEmployee {
  id: string;
  user_id: string;
  organization_id: string;
  position: string;
  department: string;
  office_id: string | null;
  manager_id: string | null;
  status: 'invited' | 'active' | 'inactive';
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email: string;
    timezone: string | null;
  };
}

export const useCurrentEmployee = () => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['current-employee', user?.id, currentOrg?.id],
    queryFn: async (): Promise<CurrentEmployee | null> => {
      if (!user?.id || !currentOrg?.id) return null;

      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          user_id,
          organization_id,
          position,
          department,
          office_id,
          manager_id,
          status,
          profiles!inner(
            full_name,
            avatar_url,
            email,
            timezone
          )
        `)
        .eq('user_id', user.id)
        .eq('organization_id', currentOrg.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No employee record found
          return null;
        }
        throw error;
      }

      return data as CurrentEmployee;
    },
    enabled: !!user?.id && !!currentOrg?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
