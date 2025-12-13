/**
 * Social feed domain service hooks
 * Handles updates, kudos, and reactions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import { toast } from 'sonner';

interface FeedUpdateItem {
  id: string;
  type: string;
  content: string;
  created_at: string;
  image_url: string | null;
  employee_id: string;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  mentions?: Array<{
    id: string;
    employee_id: string;
    employee: {
      id: string;
      profiles: {
        full_name: string;
        avatar_url: string | null;
      };
    };
  }>;
}

interface FeedKudosItem {
  id: string;
  comment: string;
  created_at: string;
  batch_id: string | null;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  given_by: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

// Fetch feed updates
export const useFeedUpdates = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['feed-updates', currentOrg?.id],
    queryFn: async (): Promise<FeedUpdateItem[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('updates')
        .select(`
          id,
          type,
          content,
          created_at,
          image_url,
          employee_id,
          employee:employees!inner(
            id,
            profiles!inner(
              full_name,
              avatar_url
            )
          ),
          mentions:update_mentions(
            id,
            employee_id,
            employee:employees!inner(
              id,
              profiles!inner(
                full_name,
                avatar_url
              )
            )
          )
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []) as FeedUpdateItem[];
    },
    enabled: !!currentOrg?.id,
  });
};

// Fetch kudos
export const useFeedKudos = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['feed-kudos', currentOrg?.id],
    queryFn: async (): Promise<FeedKudosItem[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('kudos')
        .select(`
          id,
          comment,
          created_at,
          batch_id,
          employee:employees!kudos_employee_id_fkey(
            id,
            profiles!inner(
              full_name,
              avatar_url
            )
          ),
          given_by:employees!kudos_given_by_id_fkey(
            id,
            profiles!inner(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []) as FeedKudosItem[];
    },
    enabled: !!currentOrg?.id,
  });
};

// Fetch reactions for a target
export const useReactions = (targetId: string, targetType: 'update' | 'kudos') => {
  return useQuery({
    queryKey: ['reactions', targetId, targetType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_reactions')
        .select(`
          id,
          emoji,
          employee_id,
          employee:employees!feed_reactions_employee_id_fkey(
            id,
            profiles!inner(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('target_id', targetId)
        .eq('target_type', targetType);

      if (error) throw error;

      return data || [];
    },
    enabled: !!targetId,
  });
};

// Create update
interface CreateUpdateInput {
  type: 'win' | 'update';
  content: string;
  imageUrl?: string | null;
  mentionIds?: string[];
}

export const useCreateUpdate = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: CreateUpdateInput) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      // Create the update
      const { data: update, error } = await supabase
        .from('updates')
        .insert({
          type: input.type,
          content: input.content,
          image_url: input.imageUrl,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Add mentions if any
      if (input.mentionIds && input.mentionIds.length > 0) {
        const mentions = input.mentionIds.map(employeeId => ({
          update_id: update.id,
          employee_id: employeeId,
          organization_id: currentOrg.id,
        }));

        const { error: mentionError } = await supabase
          .from('update_mentions')
          .insert(mentions);

        if (mentionError) {
          console.error('Failed to add mentions:', mentionError);
        }
      }

      return update;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-updates'] });
      toast.success('Posted successfully');
    },
    onError: (error) => {
      toast.error('Failed to post');
      console.error('Create update error:', error);
    },
  });
};

// Create kudos
interface CreateKudosInput {
  employeeIds: string[];
  comment: string;
}

export const useCreateKudos = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: CreateKudosInput) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      const batchId = input.employeeIds.length > 1 
        ? crypto.randomUUID() 
        : null;

      const kudosRecords = input.employeeIds.map(employeeId => ({
        employee_id: employeeId,
        given_by_id: currentEmployee.id,
        comment: input.comment,
        batch_id: batchId,
        organization_id: currentOrg.id,
      }));

      const { error } = await supabase
        .from('kudos')
        .insert(kudosRecords);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-kudos'] });
      toast.success('Kudos sent!');
    },
    onError: (error) => {
      toast.error('Failed to send kudos');
      console.error('Create kudos error:', error);
    },
  });
};

// Toggle reaction
interface ToggleReactionInput {
  targetId: string;
  targetType: 'update' | 'kudos';
  emoji: string;
}

export const useToggleReaction = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ targetId, targetType, emoji }: ToggleReactionInput) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      // Check if reaction exists
      const { data: existing } = await supabase
        .from('feed_reactions')
        .select('id')
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .eq('employee_id', currentEmployee.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        const { error } = await supabase
          .from('feed_reactions')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('feed_reactions')
          .insert({
            target_id: targetId,
            target_type: targetType,
            employee_id: currentEmployee.id,
            emoji,
            organization_id: currentOrg.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reactions', variables.targetId] });
    },
  });
};

// Delete update
export const useDeleteUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateId: string) => {
      const { error } = await supabase
        .from('updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-updates'] });
      toast.success('Post deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete post');
      console.error('Delete update error:', error);
    },
  });
};

// Delete kudos
export const useDeleteKudos = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kudosId: string) => {
      const { error } = await supabase
        .from('kudos')
        .delete()
        .eq('id', kudosId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-kudos'] });
      toast.success('Kudos deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete kudos');
      console.error('Delete kudos error:', error);
    },
  });
};
