import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ErrorLog } from '@/types/errorLogs';

/**
 * Fetch a single error log by ID
 */
export const useErrorLogById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['error-log', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('user_error_logs')
        .select(`
          *,
          profiles(full_name, email, avatar_url),
          organizations(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as ErrorLog;
    },
    enabled: !!id,
  });
};
