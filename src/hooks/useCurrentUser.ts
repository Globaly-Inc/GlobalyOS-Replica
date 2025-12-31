/**
 * Cached current user hook to prevent duplicate auth calls
 * Uses React Query for caching with 10-minute staleTime
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async (): Promise<User | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - auth rarely changes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
};
