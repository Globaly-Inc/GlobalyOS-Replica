/**
 * Notifications domain service hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import type { NotificationWithActor, NotificationType } from '@/types';

// Fetch notifications
export const useNotifications = (type?: NotificationType | 'all') => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['notifications', user?.id, currentOrg?.id, type],
    queryFn: async (): Promise<NotificationWithActor[]> => {
      if (!user?.id || !currentOrg?.id) return [];

      let query = supabase
        .from('notifications')
        .select(`
          *,
          actor:employees!notifications_actor_id_fkey(
            id,
            profiles!inner(
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('organization_id', currentOrg.id)
        .neq('type', 'chat_message')
        .neq('type', 'chat_mention')
        .order('created_at', { ascending: false })
        .limit(50);

      if (type && type !== 'all') {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as NotificationWithActor[];
    },
    staleTime: 30 * 1000, // 30 seconds - notifications need freshness
    enabled: !!user?.id && !!currentOrg?.id,
  });
};

// Get unread count
export const useUnreadNotificationCount = () => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['unread-notification-count', user?.id, currentOrg?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id || !currentOrg?.id) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('organization_id', currentOrg.id)
        .eq('is_read', false)
        .neq('type', 'chat_message')
        .neq('type', 'chat_mention');

      if (error) throw error;

      return count || 0;
    },
    staleTime: 15 * 1000, // 15 seconds
    enabled: !!user?.id && !!currentOrg?.id,
    refetchInterval: 30000, // Poll every 30 seconds
  });
};

// Mark notification as read
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return notificationId;
    },
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['unread-notification-count'] });

      // Snapshot previous values
      const previousNotifications = queryClient.getQueryData<NotificationWithActor[]>(
        ['notifications', user?.id, currentOrg?.id, 'all']
      );
      const previousCount = queryClient.getQueryData<number>(
        ['unread-notification-count', user?.id, currentOrg?.id]
      );

      // Optimistically update notifications list
      queryClient.setQueryData<NotificationWithActor[]>(
        ['notifications', user?.id, currentOrg?.id, 'all'],
        (old) => old?.map(n => n.id === notificationId ? { ...n, is_read: true } : n) ?? []
      );

      // Optimistically decrement unread count
      queryClient.setQueryData<number>(
        ['unread-notification-count', user?.id, currentOrg?.id],
        (old) => Math.max(0, (old ?? 0) - 1)
      );

      return { previousNotifications, previousCount };
    },
    onError: (err, notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ['notifications', user?.id, currentOrg?.id, 'all'],
          context.previousNotifications
        );
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          ['unread-notification-count', user?.id, currentOrg?.id],
          context.previousCount
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
};

// Mark all notifications as read
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id || !currentOrg?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('organization_id', currentOrg.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['unread-notification-count'] });

      // Snapshot previous values
      const previousNotifications = queryClient.getQueryData<NotificationWithActor[]>(
        ['notifications', user?.id, currentOrg?.id, 'all']
      );
      const previousCount = queryClient.getQueryData<number>(
        ['unread-notification-count', user?.id, currentOrg?.id]
      );

      // Optimistically mark all as read
      queryClient.setQueryData<NotificationWithActor[]>(
        ['notifications', user?.id, currentOrg?.id, 'all'],
        (old) => old?.map(n => ({ ...n, is_read: true })) ?? []
      );

      // Optimistically set count to 0
      queryClient.setQueryData<number>(
        ['unread-notification-count', user?.id, currentOrg?.id],
        0
      );

      return { previousNotifications, previousCount };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ['notifications', user?.id, currentOrg?.id, 'all'],
          context.previousNotifications
        );
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          ['unread-notification-count', user?.id, currentOrg?.id],
          context.previousCount
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
    },
  });
};

// Real-time subscription hook
export const useNotificationSubscription = (onNewNotification: () => void) => {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['notification-subscription', user?.id, currentOrg?.id],
    queryFn: async () => {
      if (!user?.id || !currentOrg?.id) return null;

      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            onNewNotification();
          }
        )
        .subscribe();

      return channel;
    },
    enabled: !!user?.id && !!currentOrg?.id,
    staleTime: Infinity,
  });
};
