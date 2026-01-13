import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ErrorPattern {
  id: string;
  pattern_key: string;
  component_name: string | null;
  action_attempted: string | null;
  error_type: string;
  first_occurrence_at: string;
  last_occurrence_at: string;
  occurrence_count: number;
  affected_users_count: number;
  affected_orgs_count: number;
  sample_error_message: string | null;
  sample_error_id: string | null;
  is_trending: boolean;
  trending_score: number;
  status: 'active' | 'acknowledged' | 'resolved' | 'muted';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ErrorPatternFilters {
  status?: string;
  errorType?: string;
  trending?: boolean;
}

/**
 * Fetch all error patterns with optional filters
 */
export const useErrorPatterns = (filters?: ErrorPatternFilters) => {
  return useQuery({
    queryKey: ['error-patterns', filters],
    queryFn: async () => {
      let query = supabase
        .from('error_patterns')
        .select('*')
        .order('trending_score', { ascending: false })
        .order('last_occurrence_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.errorType) {
        query = query.eq('error_type', filters.errorType);
      }
      if (filters?.trending) {
        query = query.eq('is_trending', true);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data || []) as ErrorPattern[];
    },
  });
};

/**
 * Fetch trending patterns only
 */
export const useTrendingPatterns = (limit = 10) => {
  return useQuery({
    queryKey: ['trending-patterns', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_patterns')
        .select('*')
        .eq('is_trending', true)
        .eq('status', 'active')
        .order('trending_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as ErrorPattern[];
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

/**
 * Get errors for a specific pattern
 */
export const usePatternErrors = (patternId: string | undefined) => {
  return useQuery({
    queryKey: ['pattern-errors', patternId],
    queryFn: async () => {
      if (!patternId) return [];
      
      const { data, error } = await supabase
        .from('user_error_logs')
        .select(`
          *,
          profiles(full_name, email, avatar_url),
          organizations(name)
        `)
        .eq('error_pattern_id', patternId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!patternId,
  });
};

/**
 * Update pattern status
 */
export const useUpdatePatternStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      status,
      notes 
    }: { 
      id: string; 
      status: ErrorPattern['status'];
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('error_patterns')
        .update({ 
          status, 
          notes: notes || null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-patterns'] });
      queryClient.invalidateQueries({ queryKey: ['trending-patterns'] });
    },
  });
};

/**
 * Manually trigger trending score calculation
 */
export const useCalculateTrendingScores = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('calculate_trending_scores');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-patterns'] });
      queryClient.invalidateQueries({ queryKey: ['trending-patterns'] });
    },
  });
};
