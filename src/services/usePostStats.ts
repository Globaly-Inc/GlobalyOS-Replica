/**
 * Post Statistics Hooks
 * Fetches comment counts and reaction summaries
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Get comment count for a post
 */
export const useCommentCount = (postId: string) => {
  return useQuery({
    queryKey: ['post-comment-count', postId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('is_deleted', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!postId,
    staleTime: 30 * 1000,
  });
};

/**
 * Get reaction count for a post
 */
export const useReactionCount = (postId: string) => {
  return useQuery({
    queryKey: ['post-reaction-count', postId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('post_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!postId,
    staleTime: 30 * 1000,
  });
};
