/**
 * Real-time subscriptions for social feed
 * Handles live updates for posts, reactions, and comments
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

/**
 * Unified real-time subscription for all feed updates
 * Subscribes to posts, comments, and reactions for instant updates
 */
export const useFeedRealtime = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentOrg?.id) return;

    const channel = supabase
      .channel('social-feed-unified-realtime')
      // Posts subscription
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
        }
      )
      // Comments subscription - invalidate for any org comment
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
          if (postId) {
            queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
            queryClient.invalidateQueries({ queryKey: ['post-comment-count', postId] });
          }
        }
      )
      // Post reactions subscription
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_reactions',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
          if (postId) {
            queryClient.invalidateQueries({ queryKey: ['post-reactions', postId] });
          }
        }
      )
      // Comment reactions subscription
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_reactions',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          const commentId = (payload.new as any)?.comment_id || (payload.old as any)?.comment_id;
          if (commentId) {
            queryClient.invalidateQueries({ queryKey: ['comment-reactions', commentId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id, queryClient]);
};

/**
 * Subscribe to real-time post updates (new posts, edits, deletes)
 * @deprecated Use useFeedRealtime() instead for unified subscriptions
 */
export const usePostsRealtime = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentOrg?.id) return;

    const channel = supabase
      .channel('social-feed-posts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `organization_id=eq.${currentOrg.id}`,
        },
        () => {
          // Invalidate posts query to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id, queryClient]);
};

/**
 * Subscribe to real-time reaction updates for a specific post
 */
export const useReactionsRealtime = (postId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`post-reactions-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_reactions',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['post-reactions', postId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, queryClient]);
};

/**
 * Subscribe to real-time comment updates for a specific post
 */
export const useCommentsRealtime = (postId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
          queryClient.invalidateQueries({ queryKey: ['post-comment-count', postId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, queryClient]);
};
