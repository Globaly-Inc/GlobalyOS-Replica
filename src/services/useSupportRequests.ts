import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  SupportRequest, 
  CreateSupportRequestInput, 
  UpdateSupportRequestInput,
  SupportRequestStatus,
  SupportRequestPriority,
  SupportRequestComment,
  SupportRequestSubscriber,
  SupportRequestActivityLog
} from '@/types/support';
import { toast } from 'sonner';

// Fetch all support requests (for super admin)
export const useAllSupportRequests = () => {
  return useQuery({
    queryKey: ['support-requests', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_requests')
        .select(`
          *,
          organizations (name, slug)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately for each unique user_id
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch comment counts
      const requestIds = data.map(r => r.id);
      const { data: commentCounts } = await supabase
        .from('support_request_comments')
        .select('request_id')
        .in('request_id', requestIds);

      const countMap = new Map<string, number>();
      commentCounts?.forEach(c => {
        countMap.set(c.request_id, (countMap.get(c.request_id) || 0) + 1);
      });

      return data.map(request => ({
        ...request,
        profiles: profileMap.get(request.user_id) || null,
        comment_count: countMap.get(request.id) || 0,
      })) as SupportRequest[];
    },
  });
};

// Fetch user's own support requests
export const useUserSupportRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['support-requests', 'user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupportRequest[];
    },
    enabled: !!user?.id,
  });
};

// Fetch comments for a request
export const useSupportRequestComments = (requestId: string | null) => {
  return useQuery({
    queryKey: ['support-request-comments', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      
      const { data, error } = await supabase
        .from('support_request_comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(comment => ({
        ...comment,
        profiles: profileMap.get(comment.user_id) || null,
      })) as SupportRequestComment[];
    },
    enabled: !!requestId,
  });
};

// Fetch subscribers for a request
export const useSupportRequestSubscribers = (requestId: string | null) => {
  return useQuery({
    queryKey: ['support-request-subscribers', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      
      const { data, error } = await supabase
        .from('support_request_subscribers')
        .select('*')
        .eq('request_id', requestId)
        .order('subscribed_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(subscriber => ({
        ...subscriber,
        profiles: profileMap.get(subscriber.user_id) || null,
      })) as SupportRequestSubscriber[];
    },
    enabled: !!requestId,
  });
};

// Fetch activity logs for a request
export const useSupportRequestActivityLogs = (requestId: string | null) => {
  return useQuery({
    queryKey: ['support-request-activity-logs', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      
      const { data, error } = await supabase
        .from('support_request_activity_logs')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(data.map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(log => ({
        ...log,
        profiles: profileMap.get(log.user_id) || null,
      })) as SupportRequestActivityLog[];
    },
    enabled: !!requestId,
  });
};

// Create support request
export const useCreateSupportRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateSupportRequestInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('support_requests')
        .insert({
          user_id: user.id,
          organization_id: currentOrg?.id || null,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
      toast.success('Request submitted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit request: ${error.message}`);
    },
  });
};

// Update support request (for super admin)
export const useUpdateSupportRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateSupportRequestInput & { id: string }) => {
      const updateData: Record<string, unknown> = { ...input };
      
      // If status is being set to resolved, set resolved_at
      if (input.status === 'resolved' && !input.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }

      // Get old values for activity log
      const { data: oldRequest } = await supabase
        .from('support_requests')
        .select('status, priority, admin_notes')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('support_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      if (user?.id && oldRequest) {
        const logs: { action_type: string; old_value: string | null; new_value: string | null }[] = [];
        
        if (input.status && input.status !== oldRequest.status) {
          logs.push({ action_type: 'status_change', old_value: oldRequest.status, new_value: input.status });
        }
        if (input.priority && input.priority !== oldRequest.priority) {
          logs.push({ action_type: 'priority_change', old_value: oldRequest.priority, new_value: input.priority });
        }
        if (input.admin_notes !== undefined && input.admin_notes !== oldRequest.admin_notes) {
          logs.push({ action_type: 'notes_updated', old_value: null, new_value: 'Notes updated' });
        }

        for (const log of logs) {
          await supabase.from('support_request_activity_logs').insert({
            request_id: id,
            user_id: user.id,
            ...log,
          });

          // Notify subscribers
          await supabase.functions.invoke('notify-support-request-update', {
            body: { requestId: id, actionType: log.action_type, oldValue: log.old_value, newValue: log.new_value },
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
      queryClient.invalidateQueries({ queryKey: ['support-request-activity-logs'] });
      toast.success('Request updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
};

// Add comment
export const useAddSupportRequestComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, content }: { requestId: string; content: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('support_request_comments')
        .insert({
          request_id: requestId,
          user_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('support_request_activity_logs').insert({
        request_id: requestId,
        user_id: user.id,
        action_type: 'comment_added',
        new_value: content.substring(0, 100),
      });

      // Notify subscribers
      await supabase.functions.invoke('notify-support-request-update', {
        body: { requestId, actionType: 'comment_added', newValue: content.substring(0, 100) },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['support-request-comments', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['support-request-activity-logs', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
      toast.success('Comment added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
};

// Add subscriber
export const useAddSupportRequestSubscriber = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('support_request_subscribers')
        .insert({
          request_id: requestId,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      if (user?.id) {
        await supabase.from('support_request_activity_logs').insert({
          request_id: requestId,
          user_id: user.id,
          action_type: 'subscriber_added',
          new_value: userId,
        });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['support-request-subscribers', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['support-request-activity-logs', variables.requestId] });
      toast.success('Subscriber added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add subscriber: ${error.message}`);
    },
  });
};

// Remove subscriber
export const useRemoveSupportRequestSubscriber = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, subscriberId }: { requestId: string; subscriberId: string }) => {
      // Get the user_id before deleting for logging
      const { data: subscriber } = await supabase
        .from('support_request_subscribers')
        .select('user_id')
        .eq('id', subscriberId)
        .single();

      const { error } = await supabase
        .from('support_request_subscribers')
        .delete()
        .eq('id', subscriberId);

      if (error) throw error;

      // Log activity
      if (user?.id && subscriber) {
        await supabase.from('support_request_activity_logs').insert({
          request_id: requestId,
          user_id: user.id,
          action_type: 'subscriber_removed',
          old_value: subscriber.user_id,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['support-request-subscribers', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['support-request-activity-logs', variables.requestId] });
      toast.success('Subscriber removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove subscriber: ${error.message}`);
    },
  });
};

// Delete support request (for super admin)
export const useDeleteSupportRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
      toast.success('Request deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
};

// AI improve content
export const useImproveContent = () => {
  return useMutation({
    mutationFn: async (input: { type: string; title: string; description: string; page_url: string; mode?: 'suggest' | 'improve' }) => {
      const { data, error } = await supabase.functions.invoke('improve-support-content', {
        body: input,
      });

      if (error) throw error;
      return data as { improved_description: string; suggested_priority: SupportRequestPriority };
    },
  });
};

// Search users for subscriber picker
export const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: ['users-search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });
};

// Get browser info
export const getBrowserInfo = (): string => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let version = '';

  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
    version = ua.split('Firefox/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
    version = ua.split('Edg/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
    version = ua.split('Chrome/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari';
    version = ua.split('Version/')[1]?.split(' ')[0] || '';
  }

  return `${browser} ${version}`.trim();
};

// Get device type
export const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  
  let os = 'Unknown OS';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  const deviceType = isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop';
  
  return `${deviceType} / ${os}`;
};

// Upload screenshot
export const uploadScreenshot = async (file: File): Promise<string | null> => {
  const fileName = `${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('support-screenshots')
    .upload(fileName, file);

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('support-screenshots')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
};
